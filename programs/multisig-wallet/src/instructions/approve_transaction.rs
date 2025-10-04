use crate::*;

#[derive(Accounts)]
pub struct ApproveTransaction<'info> {
    pub signer: Signer<'info>,
    pub wallet: Account<'info, Wallet>,
    #[account(mut,
        has_one=wallet @ MultisigError::WrongWallet,
        constraint=wallet.signers.contains(&signer.key()) @ MultisigError::NotSigner,
        constraint=!transaction.signed.contains(&signer.key()) @ MultisigError::AlreadyApproved,
    )]
    pub transaction: Account<'info, Transaction>,
}

impl ApproveTransaction<'_> {
    pub fn process_instruction(ctx: Context<Self>) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        transaction.signed.push(ctx.accounts.signer.key());

        Ok(())
    }
}
