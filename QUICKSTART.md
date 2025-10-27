# Quick Start Guide

Get POIM running locally in under 5 minutes.

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- A Web3 wallet (MetaMask or Coinbase Wallet)

## Installation

```bash
# Clone and install
git clone <your-repo>
cd proof-of-intelligence-mint
pnpm install
```

## Local Development (Without Deploying Contracts)

For quick frontend development using mock data:

```bash
# Create environment file
cd apps/web
cp .env.example .env.local

# Edit .env.local with minimal config:
cat > .env.local << 'EOF'
# Mock configuration for development
NEXT_PUBLIC_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
NEXT_PUBLIC_CHAIN_ID=84532
MINT_SIGNER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000001
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
EOF

# Start dev server
pnpm dev
```

Visit http://localhost:3000

**Note:** This uses mock Echo responses. Minting will fail until you deploy the contract.

## Full Local Setup with Anvil

To test the complete flow with a local blockchain:

### 1. Start Anvil (Local Blockchain)

```bash
# In a new terminal
anvil
```

Anvil will start and display test accounts with private keys.

### 2. Deploy Contract Locally

```bash
cd packages/contracts

# Use one of Anvil's test accounts
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export MINT_SIGNER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://localhost:8545 \
  --broadcast

# Copy the deployed contract address from output
```

### 3. Configure Web App

```bash
cd apps/web

# Update .env.local with deployed contract
cat > .env.local << 'EOF'
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # From deployment output
NEXT_PUBLIC_CHAIN_ID=31337
MINT_SIGNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=http://localhost:8545
EOF

# Start dev server
pnpm dev
```

### 4. Connect Wallet to Local Network

In MetaMask:
1. Add Network:
   - Network Name: Anvil Local
   - RPC URL: http://localhost:8545
   - Chain ID: 31337
   - Currency: ETH

2. Import Account:
   - Use private key from Anvil test accounts
   - Example: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

### 5. Test the Flow

1. Visit http://localhost:3000
2. Click "Start Playing"
3. Connect your wallet
4. Answer the question (correct answer: "Paris")
5. Mint your token!

## Testing Smart Contracts

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

## Project Structure

```
proof-of-intelligence-mint/
├── apps/web/              # Next.js frontend
├── packages/
│   ├── contracts/         # Solidity contracts
│   └── shared/            # Shared types
├── DEPLOYMENT.md          # Production deployment guide
└── README.md             # Full documentation
```

## Key Features Implemented

✅ ERC-20 token with signature-based minting
✅ EIP-712 structured data signing
✅ HTTP 402 Payment Required pattern
✅ Coinbase Smart Wallet integration
✅ shadcn/ui components
✅ Echo integration (with mock fallback)
✅ Next.js 15 App Router
✅ wagmi v2 + viem for Web3
✅ Type-safe with TypeScript & Zod

## Common Issues

### "Cannot read properties of undefined"

Make sure all environment variables are set in `.env.local`.

### Wallet Connection Fails

- Check you're on the correct network (Chain ID 31337 for Anvil)
- Make sure Anvil is running
- Try refreshing the page

### Minting Fails

- Verify contract is deployed
- Check contract address in `.env.local`
- Ensure you have ETH in your wallet
- Check Anvil logs for errors

### Questions Not Loading

This is normal in development - Echo integration uses mock data by default.
See `apps/web/lib/echo.ts` to implement real Echo API calls.

## Next Steps

1. **Deploy to Testnet**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Integrate Real Echo**: Get credentials from [echo.merit.systems](https://echo.merit.systems)
3. **Customize UI**: Edit components in `apps/web/components/`
4. **Add Features**:
   - Leaderboard
   - NFT achievements
   - Question categories
   - Multi-token support

## Resources

- [Full Documentation](./README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Smart Contracts README](./packages/contracts/README.md)
- [Web App README](./apps/web/README.md)

## Getting Help

- Check the READMEs in each package
- Review the code comments
- Open an issue on GitHub

Happy coding! 🎉
