use crate::*;

#[derive(Accounts)]
pub struct ExecuteTransaction<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub wallet: Box<Account<'info, Wallet>>,
    #[account(mut, 
      has_one=wallet @ MultisigError::WrongWallet, 
      constraint=wallet.get_lamports() >= transaction.lamports @ MultisigError::NotEnoughLamports,
      constraint=transaction.signed.len() as u8 >= wallet.quorum @ MultisigError::NotEnoughSigners,
      close=signer
    )]
    pub transaction: Account<'info, Transaction>,
    /// CHECK: Done through constraint
    #[account(mut, address=transaction.to @ MultisigError::InvalidReceiver)]
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl ExecuteTransaction<'_> {
    pub fn process_instruction(ctx: Context<Self>) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        let wallet = ctx.accounts.wallet.as_mut();
        let to = &mut ctx.accounts.to;

        wallet
            .to_account_info()
            .sub_lamports(transaction.lamports)?;
        to.add_lamports(transaction.lamports)?;

        Ok(())
    }
}
