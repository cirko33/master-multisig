use crate::*;
use anchor_lang::solana_program::hash::hash;

pub fn concat_pubkeys(pubkeys: &[Pubkey]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(pubkeys.len() * 32);
    for pk in pubkeys {
        bytes.extend_from_slice(pk.as_ref());
    }

    bytes
}

#[derive(Accounts)]
#[instruction(signers: Vec<Pubkey>, quorum: u8)]
pub struct InitializeWallet<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer=payer,
        space=DISC+Wallet::INIT_SPACE,
        seeds=[WALLET, { hash(&concat_pubkeys(&signers)).as_ref() }],
        bump
    )]
    pub wallet: Account<'info, Wallet>,
    pub system_program: Program<'info, System>,
}

impl InitializeWallet<'_> {
    pub fn process_instruction(ctx: Context<Self>, signers: Vec<Pubkey>, quorum: u8) -> Result<()> {
        require!(quorum > 0, MultisigError::InvalidQuorum);
        require!(signers.len() <= MAX_SIGNERS, MultisigError::TooManySigners);
        require!(
            signers.len() >= quorum as usize,
            MultisigError::NotEnoughSigners
        );

        let wallet = &mut ctx.accounts.wallet;
        wallet.signers = signers;
        wallet.quorum = quorum;
        wallet.tx_counter = 0;

        Ok(())
    }
}
