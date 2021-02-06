import React, { useContext, useEffect } from 'react';

import { appStore, onAppMount } from './state/app';

import { Wallet } from './components/Wallet';
import { Contract } from './components/Contract';
import { Keys } from './components/Keys';

import './App.css';

const App = () => {
	const { state, dispatch, update } = useContext(appStore);
    
	const { near, wallet, account, localKeys, loading } = state;

	const onMount = () => {
		dispatch(onAppMount());
	};
	useEffect(onMount, []);
    
	if (loading) {
		return <div className="root">
			<h3>Workin on it!</h3>
		</div>;
    }

    
	return (
		<div className="root">

            { (!wallet || !wallet.signedIn) && (!localKeys || !localKeys.signedIn) &&
                <>
                    <Wallet {...{ wallet, account }} />
                    <br />
                    Or
                    <br />
                    <br />
                    <Keys {...{ near, update, localKeys }} />
                </>
            }
            {
                ((wallet && wallet.signedIn) || (localKeys && localKeys.signedIn)) &&
                <Contract {...{ near, update, localKeys, wallet, account }} />
            }
            {
                wallet && wallet.signedIn && <Wallet {...{ wallet, account }} />
            }
            <br />
            {
                localKeys && localKeys.signedIn && <Keys {...{ near, update, localKeys }} />
            }
		</div>
	);
};

export default App;
