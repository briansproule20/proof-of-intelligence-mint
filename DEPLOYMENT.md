# Deployment Guide - Proof of Intelligence Mint

Complete guide to deploying POIM to production.

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- Foundry (for smart contracts)
- Base Sepolia ETH for deployment
- Echo API credentials
- Vercel account (recommended for frontend)

## Step 1: Install Dependencies

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install Node dependencies
pnpm install
```

## Step 2: Deploy Smart Contract

### Generate Deployer Wallet

```bash
# Generate a new wallet (save the private key securely)
cast wallet new

# Or import existing wallet
cast wallet import deployer --interactive
```

### Get Base Sepolia ETH

Visit the [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet) to get test ETH.

### Configure Environment

Create `packages/contracts/.env`:

```env
PRIVATE_KEY=0x... # Your deployer private key
MINT_SIGNER_ADDRESS=0x... # Address that will sign mint permissions (can be same as deployer)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_api_key_here
```

### Deploy Contract

```bash
cd packages/contracts

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Save the deployed contract address from output
```

### Verify Contract (if not auto-verified)

```bash
forge verify-contract \
  --chain-id 84532 \
  --compiler-version v0.8.24 \
  <CONTRACT_ADDRESS> \
  src/POIC.sol:POIC \
  --constructor-args $(cast abi-encode "constructor(address)" <MINT_SIGNER_ADDRESS>)
```

## Step 3: Configure Echo

### Get Echo Credentials

1. Visit [Echo Merit Systems](https://echo.merit.systems)
2. Create an account
3. Register a new application
4. Get your `ECHO_APP_ID` and `ECHO_API_KEY`
5. Configure OAuth redirect URL: `https://your-domain.com/auth/callback`

### Integrate Echo API

Update `apps/web/lib/echo.ts` to replace mock implementations with real Echo API calls:

```typescript
// Replace mock getQuestion with:
async getQuestion(userId: string): Promise<EchoQuestion> {
  const response = await fetch(`${ECHO_API_BASE}/questions/next`, {
    headers: {
      'Authorization': `Bearer ${ECHO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  return response.json();
}

// Replace mock verifyAnswer with:
async verifyAnswer(verification: EchoAnswerVerification): Promise<boolean> {
  const response = await fetch(`${ECHO_API_BASE}/questions/verify`, {
    headers: {
      'Authorization': `Bearer ${ECHO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify(verification),
  });
  const result = await response.json();
  return result.correct === true;
}
```

## Step 4: Configure Web Application

### Environment Variables

Create `apps/web/.env.local`:

```env
# Echo Configuration
NEXT_PUBLIC_ECHO_APP_ID=your_echo_app_id
ECHO_API_KEY=your_echo_api_key_secret

# Contract Configuration (from Step 2)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Deployed POIC address
NEXT_PUBLIC_CHAIN_ID=84532

# Backend Signing (CRITICAL: Keep this secret!)
MINT_SIGNER_PRIVATE_KEY=0x... # Private key of mint signer

# RPC URLs
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Optional: WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Security Notes

- **NEVER** commit `.env.local` or expose `MINT_SIGNER_PRIVATE_KEY`
- Use environment-specific secrets management in production
- The mint signer private key controls all token minting

## Step 5: Deploy to Vercel

### Via Vercel CLI

```bash
# Install Vercel CLI
pnpm add -g vercel

# Login
vercel login

# Deploy
cd apps/web
vercel --prod
```

### Via Vercel Dashboard

1. Import your GitHub repository
2. Select `apps/web` as the root directory
3. Add environment variables from Step 4
4. Deploy

### Post-Deployment

1. Update Echo OAuth redirect URL with your Vercel domain
2. Test the full flow:
   - Connect wallet
   - Fetch question
   - Submit answer
   - Mint token

## Step 6: Configure Coinbase Smart Wallet (Optional)

For gas sponsorship via Coinbase Smart Wallet:

1. Visit [Coinbase Cloud](https://cloud.coinbase.com/)
2. Create a project
3. Enable Smart Wallet
4. Configure gas sponsorship for your contract
5. Users can now use Coinbase Smart Wallet for gasless transactions

## Production Checklist

- [ ] Smart contract deployed and verified on Base Sepolia
- [ ] Echo integration tested (real API, not mocks)
- [ ] Environment variables configured in Vercel
- [ ] Mint signer private key secured
- [ ] OAuth redirects configured
- [ ] Test full user flow end-to-end
- [ ] Monitor contract events on Basescan
- [ ] Set up error tracking (Sentry, etc.)

## Monitoring

### Contract Events

Monitor `TokensMinted` events on Basescan:
- https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS#events

### Backend Logs

Monitor API routes in Vercel dashboard:
- `/api/question` - Question requests and 402 responses
- `/api/answer/:id` - Answer verifications and signature generation

### Error Tracking

Recommended tools:
- Sentry for frontend/backend errors
- LogRocket for session replay
- Alchemy/Infura for RPC monitoring

## Troubleshooting

### Contract Deployment Fails

```bash
# Check balance
cast balance <YOUR_ADDRESS> --rpc-url $BASE_SEPOLIA_RPC_URL

# Check gas price
cast gas-price --rpc-url $BASE_SEPOLIA_RPC_URL

# Deploy with higher gas limit
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --gas-limit 2000000
```

### Signature Verification Fails

Common causes:
- Wrong `MINT_SIGNER_PRIVATE_KEY`
- Wrong contract address
- Wrong chain ID
- Signature expired (>15 minutes old)

Debug:
```typescript
console.log('Domain:', {
  name: 'POIC',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: CONTRACT_ADDRESS,
});
```

### Questions Not Loading

- Check Echo API credentials
- Verify Echo API is accessible from server
- Check backend logs in Vercel
- Ensure HTTP 402 logic is correct

## Upgrading to Mainnet

When ready for production on Base Mainnet:

1. Deploy contract to Base Mainnet (Chain ID: 8453)
2. Update `.env.local` with mainnet RPC and contract address
3. Get real BASE ETH for deployment
4. Update Echo configuration for mainnet
5. Test thoroughly on mainnet before announcing

## Support

- Smart Contracts: [Foundry Docs](https://book.getfoundry.sh/)
- Echo: [Echo Documentation](https://echo.merit.systems/docs)
- Base: [Base Docs](https://docs.base.org)
- Wagmi: [Wagmi Docs](https://wagmi.sh/)

## License

MIT
