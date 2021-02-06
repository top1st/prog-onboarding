import React from 'react';

export const Wallet = ({ wallet, account }) => {

	if (wallet && wallet.signedIn) {
		return <>
			<h3>Wallet Account</h3>
			<p>Signed In: { account.accountId }</p>
			<p>Balance: { wallet.balance }</p>
			<button onClick={() => wallet.signOut()}>Sign Out</button>
		</>;
	}

	return <>
		<button onClick={() => wallet.signIn()}>Sign In with NEAR Wallet</button>
	</>;
};

