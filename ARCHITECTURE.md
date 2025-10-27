# Technical Architecture

Comprehensive technical architecture documentation for Proof of Intelligence Mint (POIM).

## System Overview

POIM is a Web3 application that combines trivia questions with tokenized rewards. Users answer questions from Echo's system and mint ERC-20 tokens for correct answers.

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   Next.js   │  │  wagmi/viem  │  │  shadcn/ui      │    │
│  │  App Router │  │   Web3 SDK   │  │  Components     │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
           │                  │                    │
           ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐     │
│  │ GET /question│  │ POST /answer   │  │  Signature  │     │
│  │  (HTTP 402)  │  │     /:id       │  │  Generation │     │
│  └──────────────┘  └────────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
           │                  │                    │
           ▼                  ▼                    ▼
┌─────────────────┐  ┌────────────────┐  ┌─────────────────┐
│   Echo API      │  │  EIP-712       │  │  Base Sepolia   │
│   (Questions)   │  │  Signing       │  │   Blockchain    │
└─────────────────┘  └────────────────┘  └─────────────────┘
                                                   │
                                                   ▼
                                         ┌─────────────────┐
                                         │  POIC Contract  │
                                         │  (ERC-20 + Sig) │
                                         └─────────────────┘
```

## Core Components

### 1. Smart Contract Layer

**Technology**: Solidity 0.8.24, Foundry, OpenZeppelin

**Contract**: `POIC.sol`
- ERC-20 token implementation
- EIP-712 structured data signing
- Signature-based minting
- Nonce tracking for replay protection
- Deadline enforcement for signature expiry

**Key Functions**:
```solidity
function mintWithSig(
    address to,
    uint256 amount,
    uint256 nonce,
    uint256 deadline,
    bytes memory signature
) external
```

**Security Features**:
- Custom errors for gas optimization
- Nonce-based replay attack prevention
- Time-limited signatures (15-minute expiry)
- Owner-controlled mint signer updates

### 2. Backend API Layer

**Technology**: Next.js 15 API Routes, TypeScript, Zod

**Endpoints**:

#### `GET /api/question`
Returns trivia question or HTTP 402 Payment Required.

**Flow**:
1. Check user credits/payment status
2. If insufficient: Return 402 with payment info
3. If sufficient: Fetch question from Echo
4. Return question

**Response (No Payment)**:
```typescript
{
  requiresPayment: false,
  question: {
    id: string,
    question: string,
    options: string[],
    difficulty?: string
  }
}
```

**Response (Payment Required - HTTP 402)**:
```typescript
{
  requiresPayment: true,
  paymentAmount: string,
  paymentRecipient: string,
  message: string
}
```

#### `POST /api/answer/:id`
Verify answer and generate mint signature.

**Flow**:
1. Validate request (Zod schema)
2. Verify answer with Echo API
3. If incorrect: Return error
4. If correct: Generate EIP-712 signature
5. Return signature + permit data

**Request**:
```typescript
{
  answer: string,
  walletAddress: string
}
```

**Response (Correct)**:
```typescript
{
  correct: true,
  mintSignature: {
    signature: string,
    permit: {
      to: string,
      amount: string,
      nonce: string,
      deadline: number
    }
  }
}
```

### 3. Signature Generation

**Technology**: viem, EIP-712

**Process**:
```typescript
// 1. Define EIP-712 domain
const domain = {
  name: 'POIC',
  version: '1',
  chainId: 84532,
  verifyingContract: CONTRACT_ADDRESS
};

// 2. Define message type
const types = {
  MintPermit: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

// 3. Sign typed data
const signature = await account.signTypedData({
  domain,
  types,
  primaryType: 'MintPermit',
  message
});
```

**Security**:
- Private key stored securely in environment
- Signatures expire after 15 minutes
- Unique nonce per mint prevents replay
- EIP-712 prevents signature malleability

### 4. Frontend Layer

**Technology**: Next.js 15, React 19 RC, wagmi v2, viem, shadcn/ui

**Key Features**:

#### Wallet Connection
- Coinbase Smart Wallet (priority for gas sponsorship)
- MetaMask
- WalletConnect
- Other injected wallets

```typescript
const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    coinbaseWallet({ preference: 'smartWalletOnly' }),
    injected(),
    walletConnect()
  ]
});
```

#### Question Flow
1. User connects wallet
2. Frontend requests question from `/api/question`
3. Handle 402 if payment required
4. Display question with radio group (shadcn/ui)
5. Submit answer to `/api/answer/:id`
6. If correct, show mint button

#### Minting Flow
1. Receive signature from API
2. Call contract's `mintWithSig` function
3. User pays gas only
4. Wait for transaction confirmation
5. Update balance
6. Fetch new question

### 5. Echo Integration

**Integration Points**:

#### Client-Side (Future)
- OAuth authentication flow
- User session management
- Credit tracking

#### Server-Side (Current)
- `getQuestion(userId)` - Fetch trivia question
- `verifyAnswer(questionId, answer, userId)` - Check answer

**Mock Implementation** (for development):
```typescript
// Returns mock question
async getQuestion(userId: string): Promise<EchoQuestion> {
  return {
    id: `q_${Date.now()}`,
    question: 'What is the capital of France?',
    options: ['London', 'Paris', 'Berlin', 'Madrid'],
  };
}

// Checks answer (Paris is correct)
async verifyAnswer(verification: EchoAnswerVerification): Promise<boolean> {
  return verification.answer === 'Paris';
}
```

**Production Implementation**:
Replace with actual Echo API calls (see `apps/web/lib/echo.ts`).

## Data Flow

### Complete User Journey

```
1. User visits homepage
   │
   ▼
2. User clicks "Start Playing"
   │
   ▼
3. User connects wallet (Coinbase Smart Wallet)
   │
   ▼
4. Frontend: GET /api/question?userId=0x...
   │
   ├─ Has credits → Return question
   └─ No credits → HTTP 402 (payment required)
   │
   ▼
5. Display question with options (Radio Group)
   │
   ▼
6. User selects answer
   │
   ▼
7. Frontend: POST /api/answer/:id
   │    Body: { answer, walletAddress }
   │
   ▼
8. Backend: Verify with Echo API
   │
   ├─ Incorrect → Return error, fetch new question
   └─ Correct → Continue
   │
   ▼
9. Backend: Generate EIP-712 signature
   │    - Create permit struct
   │    - Sign with mint signer private key
   │    - Return signature + permit
   │
   ▼
10. Frontend: Display success + mint button
    │
    ▼
11. User clicks "Mint Token"
    │
    ▼
12. Frontend: Call contract.mintWithSig(to, amount, nonce, deadline, sig)
    │
    ▼
13. Contract: Verify signature
    │    - Check signer is authorized
    │    - Check deadline not expired
    │    - Check nonce not used
    │
    ├─ Invalid → Revert
    └─ Valid → Continue
    │
    ▼
14. Contract: Mint 1 POIC token to user
    │    - Mark nonce as used
    │    - Emit TokensMinted event
    │
    ▼
15. User pays gas fee (or sponsored by Coinbase Smart Wallet)
    │
    ▼
16. Frontend: Wait for confirmation
    │
    ▼
17. Frontend: Update balance, fetch new question
```

## HTTP 402 Payment Pattern

The mint fee serves as the access payment mechanism:

**Traditional Model**:
```
User pays → Gets access to service
```

**POIM Model (HTTP 402)**:
```
User mints token (pays gas) → Token acts as receipt → Gets access to questions
```

**Implementation**:
```typescript
// Server checks if user has minted (has POIC balance)
if (userBalance === 0) {
  // HTTP 402 Payment Required
  return Response(402, {
    paymentAmount: '1000000000000000000', // 1 POIC
    paymentRecipient: CONTRACT_ADDRESS,
    message: 'Mint POIC to continue'
  });
}
```

**Benefits**:
- No separate payment system needed
- Mint serves dual purpose (token + access)
- Fully on-chain verification
- Works with existing Web3 wallets

## Security Architecture

### Attack Vectors & Mitigations

| Attack | Mitigation |
|--------|-----------|
| Replay attacks | Nonce-based system, each nonce can only be used once |
| Signature expiry | 15-minute deadline enforced on-chain |
| Unauthorized minting | Only authorized signer can create valid signatures |
| Front-running | Signature binds to specific address |
| Private key exposure | Environment variables, never in code/commits |
| Answer sniffing | Answers verified server-side with Echo |

### Best Practices

1. **Private Key Management**
   - Store in environment variables
   - Use secret managers in production (AWS Secrets Manager, etc.)
   - Rotate periodically

2. **Signature Validation**
   - Always check deadline
   - Always check nonce
   - Always verify signer

3. **Input Validation**
   - Zod schemas on all API inputs
   - Type-safe throughout

4. **Rate Limiting** (TODO)
   - Limit questions per user
   - Prevent spam minting

## Coinbase Smart Wallet Integration

**Purpose**: Gas sponsorship for better UX

**Configuration**:
```typescript
coinbaseWallet({
  appName: 'Proof of Intelligence Mint',
  preference: 'smartWalletOnly'
})
```

**Benefits**:
- Users don't need ETH for gas
- Seamless onboarding
- Better mobile experience

**How It Works**:
1. User creates Coinbase Smart Wallet (no seed phrase)
2. Coinbase sponsors gas fees (configurable)
3. User only needs to approve transaction
4. Tokens appear in wallet

## State Management

**Frontend**:
- React hooks for local state
- wagmi hooks for blockchain state
- TanStack Query for API caching

**Backend**:
- Stateless API routes
- No session storage (future: JWT for Echo auth)

**Blockchain**:
- Contract stores nonce state
- Events for off-chain indexing

## Performance Considerations

### Frontend
- Code splitting via Next.js App Router
- Dynamic imports for heavy components
- React Server Components where possible

### Backend
- Edge runtime for API routes (optional)
- Caching Echo responses (future)
- Rate limiting (future)

### Blockchain
- Gas-optimized contract (custom errors, efficient storage)
- Batch minting support (future)

## Future Enhancements

1. **Echo OAuth Integration**
   - Full user authentication
   - Session management
   - Credit tracking

2. **Leaderboard**
   - Track correct answers
   - Display top performers
   - NFT achievements

3. **Payment Verification**
   - Actually check POIC balance for 402
   - Implement payment proofs

4. **Multi-Chain**
   - Deploy to Base Mainnet
   - Support other L2s

5. **Gasless Transactions**
   - ERC-2771 meta-transactions
   - Full gas sponsorship

## Monitoring & Observability

**Recommended Setup**:

1. **Contract Events**
   - Monitor `TokensMinted` events
   - Track minting patterns
   - Alert on anomalies

2. **API Logs**
   - Log all API requests
   - Track error rates
   - Monitor signature generation

3. **Frontend Analytics**
   - User flows
   - Wallet connection rates
   - Mint success rates

4. **Error Tracking**
   - Sentry for exceptions
   - LogRocket for session replay

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Next.js App (apps/web)                             │    │
│  │  - Static pages (/, /play)                          │    │
│  │  - API routes (/api/question, /api/answer/:id)      │    │
│  │  - Edge runtime for global performance              │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
           │                                │
           ▼                                ▼
┌─────────────────────┐        ┌────────────────────────┐
│   Echo API          │        │   Base Sepolia         │
│   (Questions)       │        │   - POIC Contract      │
└─────────────────────┘        │   - RPC Node           │
                               └────────────────────────┘
```

## Tech Stack Summary

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui (Radix + Tailwind)
- **Web3**: wagmi v2, viem
- **State**: React hooks, TanStack Query
- **Styling**: Tailwind CSS
- **Icons**: lucide-react

### Backend
- **Runtime**: Next.js API Routes
- **Validation**: Zod
- **Crypto**: viem (EIP-712 signing)
- **Integration**: Echo API client

### Smart Contracts
- **Language**: Solidity 0.8.24
- **Framework**: Foundry
- **Libraries**: OpenZeppelin
- **Testing**: Forge

### Shared
- **Types**: TypeScript, Zod
- **Package Manager**: pnpm (workspaces)

## License

MIT
