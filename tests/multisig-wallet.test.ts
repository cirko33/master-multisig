import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { MultisigWallet } from "../target/types/multisig_wallet";
import crypto from "crypto";
import { assert } from "chai";

describe("multisig-wallet", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.multisigWallet as Program<MultisigWallet>;
  const owner = provider.wallet;
  const createSignersAndReceiver = (): [web3.Keypair[], web3.Keypair] => {
    const signersKP = [
      web3.Keypair.generate(),
      web3.Keypair.generate(),
      web3.Keypair.generate(),
    ];

    signersKP.forEach((signer) => {
      provider.connection.requestAirdrop(signer.publicKey, web3.LAMPORTS_PER_SOL * 5).then()
    });

    const to = web3.Keypair.generate();
    provider.connection.requestAirdrop(to.publicKey, web3.LAMPORTS_PER_SOL * 5).then()

    return [signersKP, to]
  }

  const [signers, to] = createSignersAndReceiver();
  const signersPubkeys = signers.map((s) => s.publicKey);

  const createWalletPda = (pubkeys: web3.PublicKey[] = signersPubkeys) => {
    const bytes = new Uint8Array(pubkeys.length * 32);
    pubkeys.forEach((pk, i) => {
      bytes.set(pk.toBytes(), i * 32);
    });
    const signersHash = crypto.createHash('sha256').update(Buffer.from(bytes)).digest();
    return web3.PublicKey.findProgramAddressSync(
      [Buffer.from("wallet"), signersHash],
      program.programId
    )[0];
  };

  const createTransactionPda = (
    wallet: web3.PublicKey,
    counter: anchor.BN
  ) => {
    return web3.PublicKey.findProgramAddressSync(
      [Buffer.from("transaction"), wallet.toBytes(), counter.toBuffer("le", 8)],
      program.programId
    )[0];
  };

  const amountToSend = web3.LAMPORTS_PER_SOL;

  const wallet = createWalletPda();
  const tx = createTransactionPda(wallet, new anchor.BN(0));

  const sendToWallet = async () => {
    await program.provider.sendAndConfirm(
      (() => {
        const tx = new web3.Transaction();
        tx.add(
          web3.SystemProgram.transfer({
            fromPubkey: owner.publicKey,
            toPubkey: createWalletPda(),
            lamports: amountToSend,
          })
        );
        return tx;
      })(),
      []
    );
  }

  describe("Initialize Wallet", () => {
    it("invalid quorum", async () => {
      let failed = false;
      try {
        await program.methods.initializeWallet(
          signersPubkeys,
          0
        ).accounts({
          wallet,
          payer: owner.publicKey
        }).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "InvalidQuorum")
        } else {
          throw new Error("unknown error")
        }
      }
    })

    it("too many signers", async () => {
      let tempSigners = [];
      for (let i = 0; i < 21; i++) {
        tempSigners.push(web3.Keypair.generate().publicKey)
      }
      try {
        await program.methods.initializeWallet(
          tempSigners,
          2
        ).accounts({
          wallet: createWalletPda(tempSigners),
          payer: owner.publicKey
        }).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "TooManySigners")
        } else {
          throw new Error("unknown error")
        }
      }
    })

    it("not enough signers", async () => {
      try {
        await program.methods.initializeWallet(
          signersPubkeys,
          4
        ).accounts({
          wallet,
          payer: owner.publicKey
        }).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "NotEnoughSigners")
        } else {
          throw new Error("unknown error")
        }
      }
    })

    it("successful", async () => {
      await program.methods.initializeWallet(
        signersPubkeys,
        2
      ).accounts({
        wallet,
        payer: owner.publicKey
      }).rpc();

      assert(await program.account.wallet.fetch(wallet), "no wallet found");
    })

    it("already in use", async () => {
      try {
        await program.methods.initializeWallet(
          signersPubkeys,
          2
        ).accounts({
          wallet,
          payer: owner.publicKey
        }).rpc();
      } catch (e: unknown) {
        if (e instanceof web3.SendTransactionError) {
          assert(e.message.includes('already in use'), "wrong error")
        } else {
          throw new Error("unknown error")
        }
      }
    })
  });

  describe("Propose Transaction", () => {
    it("invalid proposer", async () => {
      try {
        await program.methods.proposeTransaction(
          to.publicKey,
          new anchor.BN(amountToSend)
        ).accounts({
          wallet,
          proposer: owner.publicKey
        }).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "InvalidProposer")
        } else {
          throw new Error("unknown error")
        }
      }
    })

    it("successful", async () => {
      await program.methods.proposeTransaction(
        to.publicKey,
        new anchor.BN(amountToSend)
      ).accounts({
        wallet,
        proposer: signersPubkeys[0]
      }).signers([signers[0]]).rpc();

      assert(await program.account.transaction.fetch(tx), "no tx found");
    })
  })

  describe("Approve Transaction", () => {
    it("not a signer", async () => {
      try {
        await program.methods.approveTransaction().accounts({
          transaction: tx,
          signer: owner.publicKey
        }).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "NotSigner")
        } else {
          throw new Error("unknown error")
        }
      }
    })

    it("successful", async () => {
      await program.methods.approveTransaction().accounts({
        transaction: tx,
        signer: signersPubkeys[0]
      }).signers([signers[0]]).rpc();

      assert((await program.account.transaction.fetch(tx)).signed.find(x => x.toBase58() === signersPubkeys[0].toBase58()), "no signer found");

      await program.methods.approveTransaction().accounts({
        transaction: tx,
        signer: signersPubkeys[1]
      }).signers([signers[1]]).rpc();
    })

    it("already approved", async () => {
      try {
        await program.methods.approveTransaction().accounts({
          transaction: tx,
          signer: signersPubkeys[0]
        }).signers([signers[0]]).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "AlreadyApproved")
        } else {
          throw new Error("unknown error")
        }
      }
    })
  })

  describe("Execute Transaction", () => {
    it("not enough lamports", async () => {
      try {
        await program.methods.executeTransaction().accounts({
          to: to.publicKey,
          transaction: tx,
          signer: signersPubkeys[0]
        }).signers([signers[0]]).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "NotEnoughLamports")
        } else {
          throw new Error("unknown error")
        }
      }
    })

    it("not enough signers", async () => {
      try {
        await sendToWallet()
        await program.methods.proposeTransaction(
          to.publicKey,
          new anchor.BN(amountToSend)
        ).accounts({
          wallet,
          proposer: signersPubkeys[0]
        }).signers([signers[0]]).rpc();

        await program.methods.executeTransaction().accounts({
          to: to.publicKey,
          transaction: createTransactionPda(wallet, new anchor.BN(1)),
          signer: signersPubkeys[0]
        }).signers([signers[0]]).rpc();
      } catch (e) {
        if (e instanceof anchor.AnchorError) {
          assert(e.error.errorCode.code === "NotEnoughSigners")
        } else {
          throw new Error("unknown error")
        }
      }
    })

    it("successful", async () => {
      await sendToWallet()

      await program.methods.executeTransaction().accounts({
        to: to.publicKey,
        transaction: tx,
        signer: signersPubkeys[0]
      }).signers([signers[0]]).rpc();

      const txs = await program.account.transaction.all()
      assert(txs.findIndex(t => t.publicKey === tx) === -1, "tx found");
    })
  })
})