use crate::*;

#[account]
#[derive(InitSpace)]
pub struct Wallet {
    #[max_len(MAX_SIGNERS)]
    pub signers: Vec<Pubkey>,
    pub quorum: u8,
    pub tx_counter: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Transaction {
    pub to: Pubkey,
    pub lamports: u64,
    #[max_len(MAX_SIGNERS)]
    pub signed: Vec<Pubkey>,
    pub wallet: Pubkey,
}
