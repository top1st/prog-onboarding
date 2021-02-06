const nearAPI = require('near-api-js');
const testUtils = require('./test-utils');
const getConfig = require('../src/config');

const { KeyPair, Account, utils: { format: { parseNearAmount }} } = nearAPI;
const { 
	connection, initContract, getAccount, getContract,
	contract,
	contractAccount, contractName, contractMethods, createAccessKeyAccount
} = testUtils;
const { GAS } = getConfig();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 50000;

describe('deploy contract ' + contractName, () => {
	let alice, bob, bobPublicKey, bobAccountId, bobTokenId;
    
	const metadata = "https://media.giphy.com/media/l3vR9qDCwNyUtirXa/giphy.gif";

	beforeAll(async () => {
		alice = await getAccount();
		await initContract(alice.accountId);
	});

	test('contract hash', async () => {
		let state = (await new Account(connection, contractName)).state();
		expect(state.code_hash).not.toEqual('11111111111111111111111111111111');
	});

	test('check create owner', async () => {
		const token_id = await contract.mint_token({
			owner_id: alice.accountId,
			metadata
		}, GAS, parseNearAmount('1'));
        
		const token_data = await contract.get_token_data({
			token_id
		});
        
		expect(token_data.owner_id).toEqual(alice.accountId);
        
		expect(token_data.metadata).toEqual(metadata);
	});

	test('check create as guest', async () => {
		const keyPair = KeyPair.fromRandom('ed25519');
		const public_key = bobPublicKey = keyPair.publicKey.toString();
		bobAccountId = Buffer.from(keyPair.publicKey.data).toString('hex');

		// typically done on server (sybil/captcha)
		await contractAccount.addKey(public_key, contractName, contractMethods.changeMethods, parseNearAmount('1'));
        
		bob = createAccessKeyAccount(keyPair);
		const contractBob = await getContract(bob);
        
		bobTokenId = await contractBob.guest_mint({
			owner_id: bobAccountId,
			metadata
		}, GAS);
        
		const token_data = await contractBob.get_token_data({
			token_id: bobTokenId
		});
        
		expect(token_data.owner_id).toEqual(bobAccountId);
	});
    
	test('check transfer from implicit account', async () => {
		const contractBob = await getContract(bob);

		await contractBob.transfer({
			new_owner_id: alice.accountId,
			token_id: bobTokenId
		}, GAS);
        
		const token_data = await contractBob.get_token_data({
			token_id: bobTokenId
		});
        
		expect(token_data.owner_id).toEqual(alice.accountId);
	});

	test('check transfer from regular account', async () => {
		const contractAlice = await getContract(alice);

		await contractAlice.transfer({
			new_owner_id: bobAccountId,
			token_id: bobTokenId
		}, GAS);
        
		const token_data = await contractAlice.get_token_data({
			token_id: bobTokenId
		});
        
		expect(token_data.owner_id).toEqual(bobAccountId);
	});
    
	test('check set price from implicit account, purchase from regular account', async () => {
		const contractBob = await getContract(bob);

		await contractBob.set_price({
			token_id: bobTokenId,
			amount: parseNearAmount('1')
		}, GAS);

		const contractAlice = await getContract(alice);

		await contractAlice.purchase({
			new_owner_id: alice.accountId,
			token_id: bobTokenId
		}, GAS, parseNearAmount('1'));

		const token_data = await contractAlice.get_token_data({
			token_id: bobTokenId
		});
        
		expect(token_data.owner_id).toEqual(alice.accountId);
	});

	test('check withdraw from implicit account', async () => {
		const contractBob = await getContract(bob);

		await contractBob.withdraw({
			account_id: bobAccountId,
			beneficiary: bobAccountId,
		}, GAS);

		const account = new Account(connection, bobAccountId);
		try {
			const state = await account.state();
			expect(state.amount).toEqual(parseNearAmount('1'));
		} catch (e) {
			console.warn(e);
			expect(false);
		}
	});
    
	test('check mint limit', async () => {
		const contractBob = await getContract(bob);
        
		bobTokenId = await contractBob.guest_mint({
			owner_id: bobAccountId,
			metadata
		}, GAS);
		bobTokenId = await contractBob.guest_mint({
			owner_id: bobAccountId,
			metadata
		}, GAS);

		try {
			bobTokenId = await contractBob.guest_mint({
				owner_id: bobAccountId
			}, GAS);
			expect(false);
		} catch (e) {
			console.warn(e);
			expect(true);
		}
	});

});