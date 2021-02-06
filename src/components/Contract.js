import React, {useEffect, useState} from 'react';
import * as nearAPI from 'near-api-js';
import { GAS, parseNearAmount } from '../state/near';
import { 
	createAccessKeyAccount,
	getContract,
} from '../utils/near-utils';

const {
	KeyPair,
	utils: { format: { formatNearAmount } }
} = nearAPI;

export const Contract = ({ near, update, localKeys = {}, account }) => {
    if (!account && !localKeys.signedIn) return null

	const [metadata, setMetadata] = useState('');
    
	useEffect(() => {
		loadSales();
	}, []);


	const loadSales = async () => {
		
	};

	const handleMint = async () => {
		if (!metadata.length) {
			alert('Please enter some metadata');
			return;
		}
        update('loading', true);
        let appAccount = account
        if (!appAccount) {
            appAccount = createAccessKeyAccount(near, KeyPair.fromString(localKeys.accessSecret));
        }
        
		const contract = getContract(appAccount);
        const tokenId = await contract[!account ? 'guest_mint' : 'mint_token']({
			metadata,
			owner_id: appAccount.accountId
        }, GAS);

        console.log(tokenId)
        
		update('loading', false);
	};

	const handleBuyMessage = async () => {
		if (!purchaseKey.length) {
			alert('Please enter an app key selling a message');
			return;
		}
		update('loading', true);
		const contract = getContract(account);
		let result;
		try {
			result = await contract.get_message({ public_key: purchaseKey });
		} catch (e) {
			if (!/No message/.test(e.toString())) {
				throw e;
			}
			alert('Please enter an app key selling a message');
			update('loading', false);
			return;
		}
		if (!window.confirm(`Purchase message: "${result.message}" for ${formatNearAmount(result.amount, 2)} N ?`)) {
			update('loading', false);
			return;
		}
		const purchasedMessage = await contract.purchase({ public_key: purchaseKey }, GAS, result.amount);
		console.log(purchasedMessage);
		await loadMessage();
		update('loading', false);
	};

	return <>
        <h3>Mint Something</h3>
        <input placeholder="Metadata" value={metadata} onChange={(e) => setMetadata(e.target.value)} />
        <button onClick={() => handleMint()}>Mint</button>
	</>;
};

