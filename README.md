# Proof of Intelligence Mint (POIM)

A Web3 application where users answer trivia questions powered by Echo and mint ERC-20 tokens for correct answers.

## Overview

POIM integrates Echo's trivia question system with an ERC-20 token on Base Sepolia. Users connect their wallet, answer questions, and receive signed mint authorizations for correct answers. They mint tokens by paying only network gas fees (or using Coinbase Smart Wallet's gas sponsorship).

## Key Features

- ✅ **ERC-20 Token** with signature-based minting
- ✅ **HTTP 402 Payment Pattern** - mint fee serves as question access payment
- ✅ **Coinbase Smart Wallet** - priority connector for gas sponsorship
- ✅ **shadcn/ui** - professional, accessible UI components
- ✅ **EIP-712 Signatures** - secure, gasless mint authorizations
- ✅ **Echo Integration** - trivia questions and answer verification
- ✅ **Type-Safe** - TypeScript + Zod throughout

## Architecture

- **Frontend**: Next.js 15 (App Router) with wagmi v2, viem, shadcn/ui
- **Backend**: Next.js API routes (question fetching, answer verification, signature generation)
- **Smart Contract**: POIC.sol - ERC-20 with EIP-712 signature-based minting
- **Auth**: Echo (with mock implementation for development)
- **Network**: Base Sepolia (testnet)

## Monorepo Structure

```
proof-of-intelligence-mint/
├── apps/
│   └── web/              # Next.js 15 application
│       ├── app/
│       │   ├── page.tsx           # Home page
│       │   ├── play/page.tsx      # Trivia game
│       │   └── api/
│       │       ├── question/route.ts      # GET question (HTTP 402)
│       │       └── answer/[id]/route.ts   # POST answer
│       ├── components/
│       │   ├── ui/                # shadcn/ui components
│       │   ├── WalletConnect.tsx
│       │   └── TokenBalance.tsx
│       └── lib/
│           ├── wagmi.ts           # Coinbase Smart Wallet config
│           ├── echo.ts            # Echo API client
│           ├── signature.ts       # EIP-712 signing
│           └── contract.ts        # Contract ABI
├── packages/
│   ├── contracts/        # Foundry smart contracts
│   │   ├── src/POIC.sol
│   │   ├── test/POIC.t.sol
│   │   └── script/Deploy.s.sol
│   └── shared/           # Shared types and utilities
│       └── src/
│           ├── types.ts          # Zod schemas
│           └── constants.ts
└── Documentation
    ├── QUICKSTART.md     # 5-minute setup guide
    ├── ARCHITECTURE.md   # Technical deep-dive
    ├── DEPLOYMENT.md     # Production deployment
    └── PROJECT_SUMMARY.md # What was built
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 9
- Foundry (for smart contracts) - https://getfoundry.sh

### Installation

```bash
# Install Node dependencies
pnpm install

# Install Foundry (if not already installed)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install smart contract dependencies
cd packages/contracts
forge install
cd ../..
```

### Local Development (Mock Mode)

Run the app locally with mock Echo responses:

```bash
# Create environment file
cat > apps/web/.env.local << 'EOF'
# Mock configuration for development
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_CHAIN_ID=84532
MINT_SIGNER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
EOF

# Start dev server
pnpm dev

# Visit http://localhost:3000
```

**Note**: This uses mock Echo responses. The correct answer is "Paris". Minting will fail until you deploy the contract.

### Full Local Setup with Anvil

To test the complete flow with a local blockchain:

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy contract locally
cd packages/contracts
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export MINT_SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://localhost:8545 \
  --broadcast

# Copy the deployed contract address from output

# Terminal 3: Update environment and start dev server
cd apps/web
cat > .env.local << 'EOF'
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Paste deployed address
NEXT_PUBLIC_CHAIN_ID=31337
MINT_SIGNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=http://localhost:8545
EOF

pnpm dev
```

### Testing Smart Contracts

```bash
cd packages/contracts

# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testMintWithValidSignature

# Gas report
forge test --gas-report
```

## How It Works

### User Flow

1. **Connect Wallet** - User connects Coinbase Smart Wallet, MetaMask, or WalletConnect
2. **Fetch Question** - Frontend calls `GET /api/question`
   - Returns trivia question OR HTTP 402 (payment required)
3. **Answer Question** - User selects answer and submits
4. **Verify Answer** - Frontend calls `POST /api/answer/:id`
   - Backend verifies with Echo API
   - If correct: generates EIP-712 signature
   - Returns signature + mint permit
5. **Mint Token** - User clicks "Mint" button
   - Frontend calls `mintWithSig(to, amount, nonce, deadline, signature)`
   - User pays only gas (or Coinbase sponsors it)
6. **Receive Token** - Transaction confirms, balance updates
7. **Next Question** - Fetch new question and repeat

### API Endpoints

#### `GET /api/question`
Returns trivia question or HTTP 402 Payment Required.

**Response (Success)**:
```json
{
  "requiresPayment": false,
  "question": {
    "id": "q_123",
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "difficulty": "easy"
  }
}
```

**Response (HTTP 402)**:
```json
{
  "requiresPayment": true,
  "paymentAmount": "1000000000000000000",
  "paymentRecipient": "0x...",
  "message": "Payment required to access questions"
}
```

#### `POST /api/answer/:id`
Submit answer and get mint signature if correct.

**Request**:
```json
{
  "answer": "Paris",
  "walletAddress": "0x..."
}
```

**Response (Correct)**:
```json
{
  "correct": true,
  "mintSignature": {
    "signature": "0x...",
    "permit": {
      "to": "0x...",
      "amount": "1000000000000000000",
      "nonce": "12345",
      "deadline": 1234567890
    }
  }
}
```

**Response (Incorrect)**:
```json
{
  "correct": false,
  "message": "Incorrect answer. Try again!"
}
```

## Environment Variables

Create `apps/web/.env.local`:

```env
# Echo Configuration
NEXT_PUBLIC_ECHO_APP_ID=your_echo_app_id
ECHO_API_KEY=your_echo_api_key_secret

# Contract Configuration (after deploying)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=84532

# Backend Signing (KEEP SECRET!)
MINT_SIGNER_PRIVATE_KEY=0x...

# RPC URLs
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Optional: WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

**Security Note**: Never commit `.env.local` to git! The `MINT_SIGNER_PRIVATE_KEY` controls all token minting.

## Deployment to Production

### 1. Deploy Smart Contract

```bash
cd packages/contracts

# Set environment variables
export PRIVATE_KEY=0x... # Your deployer private key
export MINT_SIGNER_ADDRESS=0x... # Address that will sign mints
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
export BASESCAN_API_KEY=your_api_key

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Save the deployed contract address
```

### 2. Get Echo Credentials

1. Visit https://echo.merit.systems
2. Create account and register application
3. Get your `ECHO_APP_ID` and `ECHO_API_KEY`
4. Replace mock implementations in `apps/web/lib/echo.ts`

### 3. Deploy Web App to Vercel

```bash
# Install Vercel CLI
pnpm add -g vercel

# Deploy
cd apps/web
vercel --prod

# Add environment variables in Vercel dashboard
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production deployment guide.

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- React 19 RC
- wagmi v2 + viem (Web3)
- shadcn/ui (Radix UI + Tailwind)
- TanStack Query
- TypeScript

### Backend
- Next.js API Routes
- Zod (validation)
- viem (EIP-712 signing)
- Echo API integration

### Smart Contracts
- Solidity 0.8.24
- Foundry (forge, anvil)
- OpenZeppelin
- EIP-712

### Blockchain
- Base Sepolia (testnet)
- Coinbase Smart Wallet
- ERC-20 standard

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get running in 5 minutes
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and data flow
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - What was built
- **[apps/web/README.md](./apps/web/README.md)** - Web app documentation
- **[packages/contracts/README.md](./packages/contracts/README.md)** - Smart contract documentation

## Common Issues

### "Cannot connect wallet"
- Make sure you're on the correct network (Base Sepolia or Anvil localhost)
- Try refreshing the page

### "Minting fails"
- Verify contract address in `.env.local`
- Check signature hasn't expired (15-minute limit)
- Ensure you have ETH for gas

### "Questions not loading"
- This is normal in development - uses mock data
- See `apps/web/lib/echo.ts` to integrate real Echo API

## Scripts

```bash
# Development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Build all packages
pnpm lint                   # Lint code

# Smart Contracts
pnpm test:contracts         # Run Foundry tests
pnpm deploy:local           # Deploy to Anvil localhost
pnpm deploy:base-sepolia    # Deploy to Base Sepolia
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Resources

- [Echo Documentation](https://echo.merit.systems/docs)
- [Base Documentation](https://docs.base.org)
- [wagmi Documentation](https://wagmi.sh)
- [Foundry Book](https://book.getfoundry.sh)
- [shadcn/ui](https://ui.shadcn.com)

## License

MIT - see [LICENSE](./LICENSE) file

---

**Built for Merit Systems** | Integrating Echo's trivia system with Web3 rewards
