use anchor_lang::prelude::*;

#[error_code]
pub enum MultisigError {
    #[msg("too many signers")]
    TooManySigners,
    #[msg("invalid quorum")]
    InvalidQuorum,
    #[msg("not signer")]
    NotSigner,
    #[msg("already approved")]
    AlreadyApproved,
    #[msg("already executed")]
    AlreadyExecuted,
    #[msg("not enough signers for quorum")]
    NotEnoughSigners,
    #[msg("wrong wallet")]
    WrongWallet,
    #[msg("not enough lamports for transaction")]
    NotEnoughLamports,
    #[msg("invalid receiver")]
    InvalidReceiver,
    #[msg("proposer must be one of the signers")]
    InvalidProposer,
}
