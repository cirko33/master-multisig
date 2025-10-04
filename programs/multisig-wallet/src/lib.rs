use anchor_lang::prelude::*;

pub mod errors;
use errors::*;

pub mod account;
use account::*;

pub mod constants;
use constants::*;

pub mod instructions;
use instructions::*;

declare_id!("BVp4CE4SE5hcLFg8ybWSYak1xdHUGTpYTGYcmEoFhAx1");

#[program]
pub mod multisig_wallet {
    use super::*;

    pub fn initialize_wallet(
        ctx: Context<InitializeWallet>,
        signers: Vec<Pubkey>,
        quorum: u8,
    ) -> Result<()> {
        InitializeWallet::process_instruction(ctx, signers, quorum)
    }

    pub fn propose_transaction(
        ctx: Context<ProposeTransaction>,
        to: Pubkey,
        lamports: u64,
    ) -> Result<()> {
        ProposeTransaction::process_instruction(ctx, to, lamports)
    }

    pub fn approve_transaction(ctx: Context<ApproveTransaction>) -> Result<()> {
        ApproveTransaction::process_instruction(ctx)
    }

    pub fn execute_transaction(ctx: Context<ExecuteTransaction>) -> Result<()> {
        ExecuteTransaction::process_instruction(ctx)
    }
}
