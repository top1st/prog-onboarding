# Live App Review 6 - Progressive Onboarding

This repo is a companion to the "NFT Example Progressive Onboarding" video series:

[![Live App Review 6 - NFT Example - Part 1 Contract](https://img.youtube.com/vi/Y-HYCcYVmz8/0.jpg)](https://youtu.be/Y-HYCcYVmz8)
[![Live App Review 6 - NFT Example - Part 2 App Demo and Tests](https://img.youtube.com/vi/W29QmxiJh84/0.jpg)](https://youtu.be/W29QmxiJh84)
[![Live App Review 6 - NFT Example - Part 3 Frontend](https://img.youtube.com/vi/8kbxBqDSe_A/0.jpg)](https://youtu.be/8kbxBqDSe_A)

# Notes on this Example

This example is not an NFT Standard and should be considered "experimental". However, it does work and is deployable to testnet. Prior to deploying to mainnet, please join our [Discord](https://near.chat) and check with NEAR **#dev-support** if there are any security concerns. 

## Quickstart
```js
yarn // see installation notes for Rust
yarn test:unit // 1 test will fail due to bug in mocked blockchain
yarn test:deploy // runs /test/app.test.js (all passing)
yarn start
```

WIP Server Tests incomplete e.g. `yarn test:server` will not work.

Despite server tests being incomplete, you still need to run the server (see notes below) `yarn && yarn start`.

After running `yarn start` you'll have an app running (localhost:1234).

The app has 2 types of logins for the user.
1. Connect Wallet
2. Sign In As Guest

Connect Wallet is a standard NEAR App flow (think allow this app to view my account from MetaMask).

Sign In As Guest creates a temporary keypair on the dev account where the contract is deployed. This gives the guest 3 free mints.

When a guest mints, the owner_id of the TokenData is going to be the implicit account of the guest. See video "Part 1 Contract" for a detailed explanation of this.

The guest can earn NEAR tokens from sales (other users with NEAR purchase their artwork) and then decide how to use their sale proceeds. Typically they will fund an account.

## NEAR Wallet Testnet has no "Funding Account Flow"

In the video "Part 2 App and Testing" I am running the NEAR Wallet on localhost.

On testnet NEAR Wallet funds accounts on behalf of users and developers to make the experience easy.

If you'd like to test the funding account flow yourself, clone the [NEAR Wallet](https://github.com/near/near-wallet) and run it with a `.env` file in the root with the following entry `DISABLE_CREATE_ACCOUNT=true`.

## Installation

Beyond having npm and node (latest versions), you should have Rust installed. I recommend nightly because living on the edge is fun.

https://rustup.rs/

Also recommend installing near-cli globally

`npm i -g near-cli`

Everything else can be installed via:
`yarn`
`cd server && yarn`

## NEAR Config

There is only one config.js file found in `src/config.js`, this is also used for running tests.

Using `src/config.js` you can set up your different environments. Use `REACT_APP_ENV` to switch environments e.g. in `package.json` script `deploy`.

## Running Tests

You can run unit tests in the Rust contracts themselves, but it may be more useful to JS tests against testnet itself.

Note: to run the app and server tests make sure you install and start the server.
- cd server
- yarn && yarn start

Commands:
- `test` will simply run app tests against the contract already deployed. You can mess around with `app.test.js` and try different frontend stuff
- `test:deploy` - will deploy a new dev account (`/neardev`) and deploy a new contract to this account, then run `test`
- `test:server` - will test the server, make sure you start it (see "Note" above)
- `test:unit` - runs the rust unit tests

If you've changed your contract or your dev account has run out of funds use `test:deploy`, if you're updating your JS tests only then use `test`.

## Test Utils

There are helpers in `test/test-utils.js` that take care of:
1. creating a near connection and establishing a keystore for the dev account
2. creating test accounts each time a test is run
3. establishing a contract instance so you can call methods

You can change the default funding amount for test accounts in `src/config.js`

## Using the NEAR Config in your app

In `src/state/near.js` you will see that `src/config.js` is loaded as a function. This is to satisfy the jest/node test runner.

You can destructure any properies of the config easily in any module you import it in like this:

```
// example file app.js

import getConfig from '../config';
export const {
	GAS,
	networkId, nodeUrl, walletUrl, nameSuffix,
	contractName,
} = getConfig();
```
Note the export const in the destructuring?

Now you can import these like so:
```
//example file Component.js
import { GAS } from '../app.js'
...
await contract.withdraw({ amount: parseNearAmount('1') }, GAS)
...
```

# Notes on React 17, Parcel with useContext and useReducer
- Bundled with Parcel 2.0 (@next) && eslint
- *Minimal all-in-one state management with async/await support*

## Getting Started: State Store & useContext

>The following steps describe how to use `src/utils/state` to create and use your own `store` and `StateProvider`.

1. Create a file e.g. `/state/app.js` and add the following code
```js
import { State } from '../utils/state';

// example
const initialState = {
	app: {
		mounted: false
	}
};

export const { store, Provider } = State(initialState);
```
2. Now in your `index.js` wrap your `App` component with the `StateProvider`
```js
import { Provider } from './state/app';

ReactDOM.render(
    <Provider>
        <App />
    </Provider>,
    document.getElementById('root')
);
```
3. Finally in `App.js` you can `useContext(store)`
```js
const { state, dispatch, update } = useContext(store);
```

## Usage in Components
### Print out state values
```js
<p>Hello {state.foo && state.foo.bar.hello}</p>
```
### Update state directly in component functions
```js
const handleClick = () => {
    update('clicked', !state.clicked);
};
```
### Dispatch a state update function (action listener)
```js
const onMount = () => {
    dispatch(onAppMount('world'));
};
useEffect(onMount, []);
```
## Dispatched Functions with context (update, getState, dispatch)

When a function is called using dispatch, it expects arguments passed in to the outer function and the inner function returned to be async with the following json args: `{ update, getState, dispatch }`

Example of a call:
```js
dispatch(onAppMount('world'));
```

All dispatched methods **and** update calls are async and can be awaited. It also doesn't matter what file/module the functions are in, since the json args provide all the context needed for updates to state.

For example:
```js
import { helloWorld } from './hello';

export const onAppMount = (message) => async ({ update, getState, dispatch }) => {
	update('app', { mounted: true });
	update('clicked', false);
	update('data', { mounted: true });
	await update('', { data: { mounted: false } });

	console.log('getState', getState());

	update('foo.bar', { hello: true });
	update('foo.bar', { hello: false, goodbye: true });
	update('foo', { bar: { hello: true, goodbye: false } });
	update('foo.bar.goodbye', true);

	await new Promise((resolve) => setTimeout(() => {
		console.log('getState', getState());
		resolve();
	}, 2000));

	dispatch(helloWorld(message));
};
```
## Prefixing store and Provider

The default names the `State` factory method returns are `store` and `Provider`. However, if you want multiple stores and provider contexts you can pass an additional `prefix` argument to disambiguate.

```js
export const { appStore, AppProvider } = State(initialState, 'app');
```

## Performance and memo

The updating of a single store, even several levels down, is quite quick. If you're worried about components re-rendering, use `memo`:
```js
import React, { memo } from 'react';

const HelloMessage = memo(({ message }) => {
	console.log('rendered message');
	return <p>Hello { message }</p>;
});

export default HelloMessage;
```
Higher up the component hierarchy you might have:
```js
const App = () => {
	const { state, dispatch, update } = useContext(appStore);
    ...
	const handleClick = () => {
		update('clicked', !state.clicked);
	};

	return (
		<div className="root">
			<HelloMessage message={state.foo && state.foo.bar.hello} />
			<p>clicked: {JSON.stringify(state.clicked)}</p>
			<button onClick={handleClick}>Click Me</button>
		</div>
	);
};
```
When the button is clicked, the component HelloMessage will not re-render, it's value has been memoized (cached). Using this method you can easily prevent performance intensive state updates in further down components until they are neccessary.

Reference:
- https://reactjs.org/docs/context.html
- https://dmitripavlutin.com/use-react-memo-wisely/



