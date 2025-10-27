# POIM Web Application

Next.js 15 web application for Proof of Intelligence Mint (POIM).

## Overview

This is the frontend and API layer for POIM, handling:
- Echo authentication integration
- Trivia question display
- Answer verification and signature generation
- Web3 wallet connection (wagmi v2)
- Token minting interface

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Web3**: wagmi v2, viem
- **Styling**: Tailwind CSS
- **Type Safety**: TypeScript, Zod
- **State Management**: React hooks, TanStack Query

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- MetaMask or compatible Web3 wallet

## Environment Setup

Create `.env.local` in `apps/web/`:

```env
# Echo Configuration
NEXT_PUBLIC_ECHO_APP_ID=your_echo_app_id
ECHO_API_KEY=your_echo_api_key

# Contract Configuration (after deploying contract)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=84532

# Backend Signing (KEEP SECRET!)
MINT_SIGNER_PRIVATE_KEY=0x...

# RPC URLs
NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# Optional: WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Getting Echo Credentials

1. Visit [Echo Merit Systems](https://echo.merit.systems)
2. Create an account and register an application
3. Get your `ECHO_APP_ID` and `ECHO_API_KEY`
4. See [Echo docs](https://echo.merit.systems/docs) for detailed setup

### Generating Mint Signer Key

```bash
# Using OpenSSL
openssl rand -hex 32

# Or use the contract deployer's private key (same signer)
```

## Installation

```bash
# From project root
pnpm install
```

## Development

```bash
# Start dev server
pnpm dev

# Open browser to http://localhost:3000
```

## Building for Production

```bash
pnpm build
pnpm start
```

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── question/      # Fetch trivia questions
│   │   └── verify-answer/ # Verify answers & generate signatures
│   ├── play/              # Main game page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── providers.tsx      # React providers (wagmi, query)
├── components/            # React components
│   ├── WalletConnect.tsx # Wallet connection UI
│   └── TokenBalance.tsx  # Display POIC balance
├── lib/                   # Utilities
│   ├── contract.ts        # Contract ABI & config
│   ├── echo.ts            # Echo API client
│   ├── signature.ts       # EIP-712 signature generation
│   └── wagmi.ts           # Wagmi configuration
└── styles/                # Global styles
    └── globals.css
```

## Key Features

### 1. Wallet Connection

Uses wagmi v2 for seamless wallet integration:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Other injected wallets

### 2. Question Flow

1. User connects wallet
2. Frontend fetches question from `/api/question`
3. Question powered by Echo API (mock for development)
4. User selects answer

### 3. Answer Verification

1. Submit answer to `/api/verify-answer`
2. Backend verifies with Echo
3. If correct, generates EIP-712 signature
4. Returns signature + mint parameters

### 4. Token Minting

1. User receives mint authorization
2. Frontend calls `mintWithSig()` on POIC contract
3. User pays only gas fees
4. Token balance updates

## API Routes

### GET /api/question

Fetch a trivia question for the user.

**Query Params:**
- `userId` (optional): User identifier

**Response:**
```json
{
  "id": "q_123",
  "question": "What is the capital of France?",
  "options": ["London", "Paris", "Berlin", "Madrid"],
  "difficulty": "easy"
}
```

### POST /api/verify-answer

Verify an answer and get mint signature if correct.

**Request:**
```json
{
  "questionId": "q_123",
  "answer": "Paris",
  "walletAddress": "0x..."
}
```

**Response (Correct):**
```json
{
  "success": true,
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

**Response (Incorrect):**
```json
{
  "success": false,
  "error": "Incorrect answer"
}
```

## Components

### WalletConnect

Handles wallet connection/disconnection UI.

```tsx
import { WalletConnect } from '@/components/WalletConnect';

<WalletConnect />
```

### TokenBalance

Displays user's POIC token balance.

```tsx
import { TokenBalance } from '@/components/TokenBalance';

<TokenBalance />
```

## Echo Integration

The app integrates with Echo for:
- User authentication (TODO: full OAuth flow)
- Trivia question delivery
- Answer verification

Current implementation includes mock responses for development. See `lib/echo.ts` for integration points.

### Implementing Real Echo Integration

Replace mock implementations in `lib/echo.ts`:

```typescript
// Replace getQuestion mock with:
const response = await fetch(`${ECHO_API_BASE}/questions/next`, {
  headers: {
    'Authorization': `Bearer ${ECHO_API_KEY}`,
    'Content-Type': 'application/json',
  },
  method: 'POST',
  body: JSON.stringify({ userId }),
});
return response.json();

// Replace verifyAnswer mock with:
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
```

## Smart Contract Integration

The app interacts with the POIC ERC-20 contract on Base Sepolia.

### Contract Configuration

Update `lib/contract.ts` after deploying:

```typescript
export const CONTRACT_ADDRESS = '0x...' as `0x${string}`;
export const CHAIN_ID = 84532; // Base Sepolia
```

### Contract Functions Used

- `balanceOf(address)`: Check token balance
- `mintWithSig(to, amount, nonce, deadline, signature)`: Mint tokens with signature

## Security Notes

1. **Private Keys**: Never commit `.env.local` or expose `MINT_SIGNER_PRIVATE_KEY`
2. **Signature Expiry**: Signatures expire after 15 minutes (configurable)
3. **Nonce Management**: Each mint uses a unique nonce to prevent replay attacks
4. **HTTPS Only**: Use HTTPS in production for Echo OAuth redirects

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Other Platforms

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## Troubleshooting

### Wallet Won't Connect

- Ensure you're on Base Sepolia network
- Check MetaMask is unlocked
- Try refreshing the page

### Transaction Fails

- Verify contract address is correct
- Ensure signature hasn't expired (15 min limit)
- Check you have Base Sepolia ETH for gas
- Verify nonce hasn't been used

### Questions Not Loading

- Check Echo API credentials
- Verify backend can reach Echo API
- Check browser console for errors

## Development Tips

1. **Use Mock Data**: The app includes mock Echo responses for development
2. **Test Locally**: Use Anvil (Foundry) for local contract testing
3. **Base Sepolia Faucet**: Get test ETH from [Base faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

## Contributing

1. Follow TypeScript strict mode
2. Use Tailwind for styling
3. Validate all inputs with Zod
4. Handle errors gracefully

## License

MIT
