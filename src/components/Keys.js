import React, { useEffect } from 'react';
import * as nearAPI from 'near-api-js';
import { get, set, del } from '../utils/storage';
import { generateSeedPhrase } from 'near-seed-phrase';
import { 
	contractName,
	createAccessKeyAccount,
	postJson,
	postSignedJson
} from '../utils/near-utils';

const LOCAL_KEYS = '__LOCAL_KEYS';

const {
	KeyPair,
	utils: { PublicKey }
} = nearAPI;

export const Keys = ({ near, update, localKeys }) => {
	if (!near.connection) return null;

	useEffect(() => {
		if (!localKeys) loadKeys();
	}, []);

	const loadKeys = async () => {
		const { seedPhrase, accessAccountId, accessPublic, accessSecret, signedIn } = get(LOCAL_KEYS);
		if (!accessAccountId) return;
		update('localKeys', { seedPhrase, accessAccountId, accessPublic, accessSecret, signedIn });
	};

	const getNewAccessKey = async () => {

        if (localKeys) {
            return signIn()
        }

        const { seedPhrase, publicKey, secretKey } = generateSeedPhrase();
        const keyPair = KeyPair.fromString(secretKey);
		// WARNING NO RESTRICTION ON THIS ENDPOINT
		const result = await postJson({
			url: 'http://localhost:3000/add-key',
			data: { publicKey: publicKey.toString() }
		});
		if (result && result.success) {
			const isValid = await checkAccessKey(keyPair);
			if (isValid) {
				const keys = {
                    seedPhrase,
                    accessAccountId: Buffer.from(PublicKey.from(publicKey).data).toString('hex'),
                    accessPublic: publicKey.toString(),
                    accessSecret: secretKey,
                    signedIn: true,
                };
                update('localKeys', keys);
                set(LOCAL_KEYS, keys);
			}
		}
		return null;
	};

	const checkAccessKey = async (key) => {
		const account = createAccessKeyAccount(near, key);
		const result = await postSignedJson({
			url: 'http://localhost:3000/has-access-key',
			contractName,
			account
		});
		return result && result.success;
    };
    
    const signIn = () => {
        localKeys.signedIn = true
        update('localKeys', localKeys);
        set(LOCAL_KEYS, localKeys);
    }

    const signOut = () => {
        localKeys.signedIn = false
        update('localKeys', localKeys);
        set(LOCAL_KEYS, localKeys);
    }

	const deleteAccessKeys = async () => {
		update('loading', true);
		// WARNING NO RESTRICTION ON THIS ENDPOINT
		const result = await fetch('http://localhost:3000/delete-access-keys').then((res) => res.json());
		if (result && result.success) {
			update('localKeys', null);
			del(LOCAL_KEYS);
		}
		update('loading', false);
	};

	return <>
		{ localKeys && localKeys.signedIn ?
			<button onClick={() => signOut()}>Sign Out</button> :
			<button onClick={() => getNewAccessKey()}>Sign In As Guest</button>
		}
        {/* <button onClick={() => deleteAccessKeys()}>DELETE ALL ACCESS KEY ACCOUNTS</button> */}
	</>;
};

