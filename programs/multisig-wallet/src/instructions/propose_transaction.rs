use crate::*;

#[derive(Accounts)]
pub struct ProposeTransaction<'info> {
    #[account(mut)]
    pub wallet: Account<'info, Wallet>,
    #[account(
        init,
        payer=proposer,
        space=DISC+Transaction::INIT_SPACE,
        seeds=[TRANSACTION, wallet.key().as_ref(), wallet.tx_counter.to_le_bytes().as_ref()],
        bump
    )]
    pub transaction: Account<'info, Transaction>,
    #[account(mut, 
      constraint=wallet.signers.contains(&proposer.key()) @ MultisigError::InvalidProposer)]
    pub proposer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl ProposeTransaction<'_> {
    pub fn process_instruction(ctx: Context<Self>, to: Pubkey, lamports: u64) -> Result<()> {
        let transaction = &mut ctx.accounts.transaction;
        let wallet = &mut ctx.accounts.wallet;
        wallet.tx_counter+=1;

        transaction.to = to;
        transaction.lamports = lamports;
        transaction.signed = Vec::new();
        transaction.wallet = wallet.key();

        Ok(())
    }
}
