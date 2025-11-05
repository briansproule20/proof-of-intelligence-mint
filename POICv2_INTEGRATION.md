# POICv2 Contract Integration Guide

## Overview
The POICv2 contract is a drop-in replacement for the current POIC contract with enhanced features:
- ✅ Same `batchMint(address[], bytes32[])` interface (existing code compatible)
- ✅ Automatic Uniswap v4 LP deployment when MAX_MINT_COUNT reached
- ✅ EIP-3009 gasless transfers
- ✅ USDC accumulation for LP pool funding

## Contract Compatibility

### What Stays The Same
Your current implementation **already works** with POICv2:

1. **Minting Interface** (`lib/server-wallet.ts:63-86`)
   ```typescript
   // This function works as-is with POICv2
   export async function mintTokens(walletAddress: string, paymentTxHash: string)
   ```
   - POICv2 has identical `batchMint(address[], bytes32[])` signature
   - Same idempotency using tx hashes

2. **USDC Forwarding** (`lib/server-wallet.ts:40-55`)
   ```typescript
   // This function works as-is with POICv2
   export async function forwardUsdcToContract(amount: string = LP_CONTRIBUTION)
   ```
   - POICv2 expects USDC to be deposited to contract address
   - Contract accumulates USDC until MAX_MINT_COUNT
   - Then auto-deploys LP with accumulated funds

### What Changes

1. **Contract Address**
   - Update `lib/contract.ts` with new POICv2 deployed address

2. **Contract ABI**
   - Update ABI to include POICv2 functions (batchMint signature is same)

3. **Additional Features Available** (optional to use):
   - `authorizationState(address, bytes32)` - Check EIP-3009 nonce status
   - `mintCount()` - Track progress toward LP deployment
   - `liquidityDeployed()` - Check if LP has been created
   - `collectLpFees()` - Admin function to collect trading fees

## Integration Steps

### Step 1: Deploy POICv2 Contract (or get deployed address)

The contract needs these constructor parameters:
```solidity
constructor(
    uint256 _mintAmount,          // e.g., 5000 * 10^18 (5000 POIC per mint)
    uint256 _maxMintCount,        // e.g., 100000 (trigger LP at 100k mints)
    IPoolManager _poolManager,    // Uniswap v4 Pool Manager on Base
    IPositionManager _positionManager, // Uniswap v4 Position Manager on Base
    IAllowanceTransfer _permit2,  // Permit2 contract on Base
    address _paymentToken,        // USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    uint256 _paymentSeed,         // e.g., 100000 * 10^6 (100k USDC for LP)
    uint256 _poolSeedAmount       // e.g., 500000000 * 10^18 (500M POIC for LP)
)
```

**Example values for 100k mint cap:**
- `_mintAmount`: `5000000000000000000000` (5000 POIC with 18 decimals)
- `_maxMintCount`: `100000`
- `_paymentToken`: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC Base)
- `_paymentSeed`: `100000000000` (100k USDC with 6 decimals)
- `_poolSeedAmount`: `500000000000000000000000000` (500M POIC with 18 decimals)
- Uniswap v4 addresses: Need Base mainnet addresses for PoolManager, PositionManager, Permit2

### Step 2: Update Contract Address

**File:** `apps/web/lib/contract.ts`

```typescript
// OLD:
export const CONTRACT_ADDRESS = '0x...' as const;

// NEW:
export const CONTRACT_ADDRESS = '0x...' as const; // POICv2 deployed address
```

### Step 3: Update Contract ABI (Optional - Only if needed)

**File:** `apps/web/lib/server-wallet.ts`

The current `BATCH_MINT_ABI` already works:
```typescript
const BATCH_MINT_ABI = parseAbi([
  'function batchMint(address[] calldata to, bytes32[] calldata txHashes) external',
]);
```

Optional: Add additional POICv2 functions if needed:
```typescript
const POIC_V2_ABI = parseAbi([
  'function batchMint(address[] calldata to, bytes32[] calldata txHashes) external',
  'function mintCount() external view returns (uint256)',
  'function maxMintCount() external view returns (uint256)',
  'function liquidityDeployed() external view returns (bool)',
  'function hasMinted(bytes32) external view returns (bool)',
]);
```

### Step 4: Grant MINTER_ROLE to Server Wallet

After deploying POICv2, run this command:

```bash
# Grant MINTER_ROLE to server wallet
cast send <POIC_V2_ADDRESS> \
  "grantRole(bytes32,address)" \
  $(cast keccak "MINTER_ROLE") \
  0x32d831cd322EB5DF497A1A640175a874b5372BF8 \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --rpc-url https://mainnet.base.org
```

### Step 5: Fund Server Wallet with ETH for Gas

Your server wallet needs ETH to execute mints:
```bash
# Server wallet address
0x32d831cd322EB5DF497A1A640175a874b5372BF8

# Recommended: 0.01-0.02 ETH on Base for gas
```

### Step 6: Test Integration

1. **Test Mint:**
   - User pays 1.25 USDC via x402
   - Answer correct question
   - Click "Mint Tokens" button
   - Verify POIC appears in user wallet

2. **Monitor LP Deployment:**
   ```typescript
   // Add monitoring to track progress toward LP deployment
   const count = await walletClient.readContract({
     address: CONTRACT_ADDRESS,
     abi: POIC_V2_ABI,
     functionName: 'mintCount',
   });

   console.log(`Mints: ${count} / ${MAX_MINT_COUNT}`);
   ```

3. **LP Deployment Happens Automatically:**
   - When 100,000th mint occurs
   - Contract uses accumulated USDC + mints POIC
   - Deploys to Uniswap v4 automatically
   - Check `liquidityDeployed()` returns `true`

## Payment Flow Diagram

```
User pays 1.25 USDC
    ↓
Server receives 1.25 USDC (via x402)
    ↓
Server forwards 1.00 USDC to POICv2 contract
    ↓
Contract accumulates USDC
    ↓
User answers correctly
    ↓
Server calls batchMint(userAddress, txHash)
    ↓
User receives 5000 POIC
    ↓
(After 100k mints)
    ↓
Contract auto-deploys LP:
- Uses 100k USDC accumulated
- Mints 500M POIC to itself
- Creates Uniswap v4 pool
- Adds liquidity
```

## Key Differences from V1

### V1 Behavior:
- Simple ERC20 minting
- No LP deployment
- Manual liquidity management

### V2 Behavior:
- Same minting interface
- **Automatic LP deployment** at MAX_MINT_COUNT
- Contract holds USDC until LP creation
- One-time automatic pool initialization
- Full-range LP position created
- Admin can collect trading fees later

## Admin Functions (Optional)

### Collect LP Trading Fees
```typescript
// After LP is deployed, collect accumulated trading fees
const hash = await walletClient.writeContract({
  address: CONTRACT_ADDRESS,
  abi: POIC_V2_ABI,
  functionName: 'collectLpFees',
});
```

### Emergency Withdraw (Before LP Deployment)
```typescript
// Only works before LP deployment - recovers funds if needed
const hash = await walletClient.writeContract({
  address: CONTRACT_ADDRESS,
  abi: POIC_V2_ABI,
  functionName: 'emergencyWithdraw',
});
```

## Testing Checklist

- [ ] POICv2 contract deployed with correct constructor params
- [ ] Server wallet granted MINTER_ROLE
- [ ] Server wallet funded with ETH for gas (~0.02 ETH)
- [ ] CONTRACT_ADDRESS updated in `lib/contract.ts`
- [ ] Test mint: User receives POIC after correct answer
- [ ] Test idempotency: Same txHash cannot mint twice
- [ ] Monitor mintCount approaching MAX_MINT_COUNT
- [ ] Verify LP deploys automatically at max count
- [ ] Check Uniswap v4 pool exists after deployment

## No Other Code Changes Required

The existing codebase is **already compatible**:
- ✅ `mintTokens()` function works as-is
- ✅ `forwardUsdcToContract()` function works as-is
- ✅ Frontend mint button flow works as-is
- ✅ x402 payment flow unchanged
- ✅ Answer verification unchanged

**Only update the contract address and ensure server wallet has ETH for gas!**

## Questions to Resolve

1. **Is POICv2 already deployed?** If yes, provide address.
2. **What are the exact MAX_MINT_COUNT and MINT_AMOUNT values?**
3. **What are the PAYMENT_SEED and POOL_SEED_AMOUNT values?**
4. **Do you need the LP Guard Hook?** (Optional security feature)
5. **Uniswap v4 addresses on Base** - Need official addresses for:
   - PoolManager
   - PositionManager
   - Permit2

## Summary

This is a **minimal integration** - your code already works with POICv2 because the minting interface is identical. The main changes are:

1. Update contract address
2. Grant MINTER_ROLE to server wallet
3. Fund server wallet with ETH for gas
4. Enjoy automatic LP deployment!
