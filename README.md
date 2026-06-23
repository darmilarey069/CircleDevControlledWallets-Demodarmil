# Circle Developer-Controlled Wallet Demo by Pharst

A TypeScript project demonstrating how to use Circle's Developer-Controlled Wallets SDK in accordance to https://community.arc.io/home/videos/using-circle-developer-controlled-wallets-to-send-and-manage-usdc-2026-01-20.

## Features

* Register an Entity Secret
* Create Wallet Sets
* Create Developer-Controlled Wallets
* Transfer USDC on Arc Testnet
* Check Wallet Balances
* Monitor Transaction Status

## Prerequisites

* Node.js 22+
* Circle Developer Account(console.circle.com)
* Circle API Key




## Installation

```bash
git clone [https://github.com/YOUR_USERNAME/circle-wallet-demo.git](https://github.com/TheUnknown250/CircleDevControlledWallets-Demo.git)
cd CircleDevControlledWallets-demo
npm install
```

## Environment Variables

Create a `.env` file:

```env
CIRCLE_API_KEY=YOUR_API_KEY
```

## Register Entity Secret

```bash
npm run register-entity-secret
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

Built by Pharst
