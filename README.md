# Circle Developer-Controlled Wallets Demo

A TypeScript demo project showcasing how to use the Circle Developer-Controlled Wallets SDK to create wallets and send USDC on Arc Testnet.

## Features

* Register an Entity Secret
* Create Wallet Sets
* Create Developer-Controlled Wallets
* Transfer USDC between wallets
* Monitor transaction status
* Query wallet balances

## Tech Stack

* TypeScript
* Node.js
* Circle Developer-Controlled Wallets SDK

## Prerequisites

Before running the project, make sure you have:

* Node.js 22 or later
* A Circle Developer account
* A Circle API Key
* A registered Entity Secret

## Installation

Clone the repository:

```bash
git clone https://github.com/TheUnknown250/CircleDevControlledWallets-Demo.git
cd CircleDevControlledWallets-Demo
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the project root.

```env
CIRCLE_API_KEY=YOUR_API_KEY
CIRCLE_ENTITY_SECRET=YOUR_ENTITY_SECRET
```

> Never commit your `.env` file or recovery files to GitHub.

## Available Scripts

Register an Entity Secret:

```bash
npm run register
```

Create a Wallet Set and Wallet:

```bash
npm run create-wallet
```

Send USDC:

```bash
npm run send-tokens
```

## Project Structure

```
.
├── create-wallet.ts
├── register-entity-secret.ts
├── send-tokens.ts
├── package.json
├── README.md
└── .gitignore
```

## Security

The following are excluded from version control:

* `.env`
* `recovery/`
* `node_modules/`

Never expose your API keys, Entity Secret, or recovery files.

Built by Pharst.
