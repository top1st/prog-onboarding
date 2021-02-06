#![deny(warnings)]
use hex;
use near_sdk::{
    borsh::{ self, BorshDeserialize, BorshSerialize },
    collections::{ UnorderedMap },
    env, near_bindgen, AccountId, PublicKey, Balance, Promise,
    json_types::{ U128 },
};


#[global_allocator]
static ALLOC: near_sdk::wee_alloc::WeeAlloc = near_sdk::wee_alloc::WeeAlloc::INIT;

const FREE_MINT_LIMIT:u8 = 3;
pub type TokenId = u64;

#[near_bindgen]
#[derive(BorshDeserialize, BorshSerialize)]
pub struct NonFungibleTokenBasic {
    pub pubkey_minted: UnorderedMap<PublicKey, u8>,
    pub token_to_account: UnorderedMap<TokenId, AccountId>,
    pub token_to_price: UnorderedMap<TokenId, Balance>,
    pub token_to_metadata: UnorderedMap<TokenId, String>,
    pub account_to_proceeds: UnorderedMap<AccountId, Balance>,
    pub owner_id: AccountId,
    pub token_id: TokenId,
}

impl Default for NonFungibleTokenBasic {
    fn default() -> Self {
        panic!("NFT should be initialized before usage")
    }
}

#[near_bindgen]
impl NonFungibleTokenBasic {
    #[init]
    pub fn new(owner_id: AccountId) -> Self {
        assert!(env::is_valid_account_id(owner_id.as_bytes()), "Owner's account ID is invalid.");
        assert!(!env::state_exists(), "Already initialized");
        Self {
            pubkey_minted: UnorderedMap::new(b"pubkey_minted".to_vec()),
            token_to_account: UnorderedMap::new(b"token_to_account".to_vec()),
            token_to_price: UnorderedMap::new(b"token_to_price".to_vec()),
            token_to_metadata: UnorderedMap::new(b"token_to_metadata".to_vec()),
            account_to_proceeds: UnorderedMap::new(b"account_to_proceeds".to_vec()),
            owner_id,
            token_id: 0,
        }
    }

    /// standard NFT methods
    pub fn transfer(&mut self, new_owner_id: AccountId, token_id: TokenId) {
        let token_owner_account_id = self.get_token_owner(token_id);
        self.only_owner(token_owner_account_id);
        self.token_to_account.insert(&token_id, &new_owner_id);
    }

    pub fn set_price(&mut self, token_id: TokenId, amount: U128) {
        let token_owner_account_id = self.get_token_owner(token_id);
        self.only_owner(token_owner_account_id);
        self.token_to_price.insert(&token_id, &amount.into());
    }

    #[payable]
    pub fn purchase(&mut self, new_owner_id: AccountId, token_id: TokenId) {
        let price = self.token_to_price.get(&token_id).unwrap_or(0);
        assert!(price > 0, "not for sale");
        let deposit = env::attached_deposit();
        assert!(deposit == price, "deposit != price");
        let token_owner_account_id = self.get_token_owner(token_id);
        let mut balance = self.account_to_proceeds.get(&token_owner_account_id).unwrap_or(0);
        balance = balance + deposit;
        self.account_to_proceeds.insert(&token_owner_account_id, &balance);
        // transfer ownership
        self.token_to_account.insert(&token_id, &new_owner_id);
    }

    pub fn withdraw(&mut self, account_id: AccountId) {
        self.only_owner(account_id.clone());
        let proceeds = self.account_to_proceeds.get(&account_id).unwrap_or(0);
        assert!(proceeds > 0, "nothing to withdraw");
        Promise::new(account_id).transfer(proceeds);
    }

    /// View Methods
    pub fn get_price(&self, token_id: TokenId) -> Balance {
        self.token_to_price.get(&token_id).unwrap_or(0)
    }

    pub fn get_token_owner(&self, token_id: TokenId) -> String {
        match self.token_to_account.get(&token_id) {
            Some(owner_id) => owner_id,
            None => env::panic(b"No owner of the token ID specified")
        }
    }

    pub fn get_token_metadata(&self, token_id: TokenId) -> String {
        match self.token_to_metadata.get(&token_id) {
            Some(metadata) => metadata,
            None => env::panic(b"No owner of the token ID specified")
        }
    }

    /// Minting
    pub fn guest_mint(&mut self, owner_id: AccountId, metadata: String) -> TokenId {
        self.only_contract_owner();

        let public_key:PublicKey = env::signer_account_pk().into();
        let num_minted = self.pubkey_minted.get(&public_key).unwrap_or(0) + 1;
        assert!(num_minted <= FREE_MINT_LIMIT, "Out of free mints");
        self.pubkey_minted.insert(&public_key, &num_minted);

        self.mint(owner_id, metadata)
    }

    pub fn mint_token(&mut self, owner_id: AccountId, metadata: String) -> TokenId {
        self.only_contract_owner();
        self.mint(owner_id, metadata)
    }

    fn mint(&mut self, owner_id: AccountId, metadata: String) -> TokenId {
        self.token_id = self.token_id + 1;
        let token_check = self.token_to_account.get(&self.token_id);
        if token_check.is_some() {
            env::panic(b"Token ID already exists.")
        }
        self.token_to_account.insert(&self.token_id, &owner_id);
        self.token_to_metadata.insert(&self.token_id, &metadata);
        self.token_id
    }

    /// modifiers
    fn only_owner(&mut self, account_id:AccountId) {
        let predecessor = env::signer_account_id();
        if predecessor != account_id {
            let implicit_account_id:AccountId = hex::encode(&env::signer_account_pk()[1..]);
            if implicit_account_id != account_id {
                env::panic(b"Attempt to call transfer on tokens belonging to another account.")
            }
        }
    }

    fn only_contract_owner(&mut self) {
        assert_eq!(env::signer_account_id(), self.owner_id, "Only contract owner can call this method.");
    }
}



// use the attribute below for unit tests
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::MockedBlockchain;
    use near_sdk::{testing_env, VMContext};

    fn alice() -> AccountId {
        "alice.testnet".to_string()
    }
    fn bob() -> AccountId {
        "bob.testnet".to_string()
    }
    fn carol() -> AccountId {
        "carol.testnet".to_string()
    }
    fn metadata() -> String {
        "blah".to_string()
    }

    // part of writing unit tests is setting up a mock context
    // this is a useful list to peek at when wondering what's available in env::*
    fn get_context(predecessor_account_id: String, storage_usage: u64) -> VMContext {
        VMContext {
            current_account_id: alice(),
            signer_account_id: bob(),
            signer_account_pk: vec![0, 1, 2],
            predecessor_account_id,
            input: vec![],
            block_index: 0,
            block_timestamp: 0,
            account_balance: 0,
            account_locked_balance: 0,
            storage_usage,
            attached_deposit: 0,
            prepaid_gas: 10u64.pow(18),
            random_seed: vec![0, 1, 2],
            is_view: false,
            output_data_receivers: vec![],
            epoch_height: 19,
        }
    }

    #[test]
    fn mint_token_get_token_owner() {
        let context = get_context(bob(), 0);
        testing_env!(context);
        let mut contract = NonFungibleTokenBasic::new(bob());
        let token_id = contract.mint_token(carol(), metadata());
        let owner = contract.get_token_owner(token_id.clone());
        assert_eq!(carol(), owner, "Unexpected token owner.");
    }

    #[test]
    fn transfer_with_your_own_token() {
        // Owner account: bob.testnet
        // New owner account: alice.testnet

        testing_env!(get_context(bob(), 0));
        let mut contract = NonFungibleTokenBasic::new(bob());
        let token_id = contract.mint_token(bob(), metadata());

        // bob transfers the token to alice
        contract.transfer(alice(), token_id.clone());

        // Check new owner
        let owner = contract.get_token_owner(token_id.clone());
        assert_eq!(alice(), owner, "Token was not transferred after transfer call with escrow.");
    }

    #[test]
    fn mint_purchase_withdraw() {
        let mut context = get_context(bob(), 0);
        testing_env!(context.clone());
        let mut contract = NonFungibleTokenBasic::new(bob());
        let token_id = contract.mint_token(carol(), metadata());
        let owner = contract.get_token_owner(token_id.clone());
        assert_eq!(carol(), owner, "Unexpected token owner.");

        context.signer_account_id = carol();
        testing_env!(context.clone());
        contract.set_price(token_id, 1000);
        
        context.signer_account_id = alice();
        context.attached_deposit = 1000;
        testing_env!(context.clone());
        contract.purchase(alice(), token_id);

        let owner = contract.get_token_owner(token_id.clone());
        assert_eq!(alice(), owner, "Unexpected token owner.");
    }
}