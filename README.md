# Circle Developer-Controlled Wallet Demo by Pharst

A TypeScript project demonstrating how to use Circle's Developer-Controlled Wallets SDK.

## Features

* Register an Entity Secret
* Create Wallet Sets
* Create Developer-Controlled Wallets
* Transfer USDC on Arc Testnet
* Check Wallet Balances
* Monitor Transaction Status

## Prerequisites

* Node.js 22+
* Circle Developer Account
* Circle API Key
* Registered Entity Secret

## Installation

```bash
git clone https://github.com/YOUR_USERNAME/circle-wallet-demo.git
cd circle-wallet-demo
npm install
```

## Environment Variables

Create a `.env` file:

```env
CIRCLE_API_KEY=YOUR_API_KEY
CIRCLE_ENTITY_SECRET=YOUR_ENTITY_SECRET
```

## Register Entity Secret

```bash
npm run register
```

## Create Wallet

```bash
npm run create-wallet
```

## Send Tokens

```bash
npm run send-tokens
```

## Security

The following files are intentionally excluded from Git:

* `.env`
* `recovery/`
* `node_modules/`

Never commit API keys, entity secrets, recovery files, or wallet credentials.

## Tech Stack

* TypeScript
* Node.js
* Circle Developer-Controlled Wallets SDK

## License

MIT
