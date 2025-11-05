# POICv2 Deployment Guide

## Ready to Deploy! 🚀

All scripts are set up and ready. Here's how to deploy POICv2 to Base mainnet.

## Configuration Summary

```
MINT_AMOUNT:      5,000 POIC (5000000000000000000000)
MAX_MINT_COUNT:   100,000 mints
PAYMENT_SEED:     100,000 USDC (100000000000)
POOL_SEED_AMOUNT: 500,000,000 POIC (500000000000000000000000000)
LP_GUARD_HOOK:    address(0) - No hook

Uniswap v4 on Base:
- PoolManager:      0x498581ff718922c3f8e6a244956af099b2652b2b
- PositionManager:  0x7c5f5a4bbd8fd63184577525326123b519429bdc
- Permit2:          0x000000000022D473030F116dDEE9F6B43aC78BA3

Payment Token (USDC): 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Server Wallet:        0x32d831cd322EB5DF497A1A640175a874b5372BF8
```

## Step-by-Step Deployment

### 1. Set Environment Variables

Create `.env` file in the project root:

```bash
# In /Users/briansproule/Coding Projects/proof-of-intelligence-mint/.env

# Your deployer private key (has ETH for gas)
PRIVATE_KEY=your_deployer_private_key_here

# Base mainnet RPC
RPC_URL=https://mainnet.base.org

# Etherscan API key for verification (optional but recommended)
ETHERSCAN_API_KEY=your_basescan_api_key_here
```

### 2. Deploy POICv2 Contract

```bash
cd "/Users/briansproule/Coding Projects/proof-of-intelligence-mint"

# Dry run (simulation)
forge script script/DeployPOICv2.s.sol:DeployPOICv2 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast --verify

# If dry run looks good, deploy for real
forge script script/DeployPOICv2.s.sol:DeployPOICv2 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

**Save the deployed contract address!** You'll see output like:
```
=== Deployment Successful ===
POIC Address: 0x...
```

### 3. Grant MINTER_ROLE to Server Wallet

```bash
# Set the deployed contract address
export POIC_ADDRESS=0x... # (address from step 2)

# Grant MINTER_ROLE to server wallet
forge script script/GrantMinterRole.s.sol:GrantMinterRole \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### 4. Fund Server Wallet with ETH for Gas

Server wallet needs ETH to execute `batchMint` transactions:

```bash
# Server wallet address
0x32d831cd322EB5DF497A1A640175a874b5372BF8

# Send 0.01-0.02 ETH from your wallet
# Use MetaMask, wallet UI, or cast:
cast send 0x32d831cd322EB5DF497A1A640175a874b5372BF8 \
  --value 0.02ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### 5. Update Contract Address in Codebase

```typescript
// File: apps/web/lib/contract.ts

// OLD:
export const CONTRACT_ADDRESS = '0x...' as const;

// NEW:
export const CONTRACT_ADDRESS = '0x...' as const; // POICv2 address from step 2
```

### 6. Test the Integration

```bash
# 1. Restart dev server
cd apps/web
pnpm run dev

# 2. Test the flow:
# - Connect wallet
# - Pay 1.25 USDC for question
# - Answer correctly
# - Click "Mint Tokens" button
# - Verify POIC appears in wallet
```

## Verification Commands

After deployment, verify everything is set up correctly:

```bash
# Check contract is deployed
cast code $POIC_ADDRESS --rpc-url $RPC_URL

# Check server wallet has MINTER_ROLE
cast call $POIC_ADDRESS "hasRole(bytes32,address)(bool)" \
  $(cast keccak "MINTER_ROLE") \
  0x32d831cd322EB5DF497A1A640175a874b5372BF8 \
  --rpc-url $RPC_URL
# Should return: true

# Check server wallet ETH balance
cast balance 0x32d831cd322EB5DF497A1A640175a874b5372BF8 \
  --rpc-url $RPC_URL

# Check contract parameters
cast call $POIC_ADDRESS "mintAmount()(uint256)" --rpc-url $RPC_URL
cast call $POIC_ADDRESS "maxMintCount()(uint256)" --rpc-url $RPC_URL
cast call $POIC_ADDRESS "mintCount()(uint256)" --rpc-url $RPC_URL
```

## Monitoring LP Deployment

The contract will automatically deploy liquidity when `mintCount` reaches `maxMintCount` (100,000):

```bash
# Check current mint count
cast call $POIC_ADDRESS "mintCount()(uint256)" --rpc-url $RPC_URL

# Check if LP has been deployed
cast call $POIC_ADDRESS "liquidityDeployed()(bool)" --rpc-url $RPC_URL
```

## Troubleshooting

### Server Wallet Has No ETH
```bash
# Send more ETH to server wallet
cast send 0x32d831cd322EB5DF497A1A640175a874b5372BF8 \
  --value 0.01ether \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

### Minting Fails with "AccessControl" Error
```bash
# Re-grant MINTER_ROLE
export POIC_ADDRESS=0x...
forge script script/GrantMinterRole.s.sol:GrantMinterRole \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Contract Not Verified on BaseScan
```bash
# Manually verify
forge verify-contract $POIC_ADDRESS \
  src/POICv2.sol:POIC \
  --chain-id 8453 \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --constructor-args $(cast abi-encode "constructor(uint256,uint256,address,address,address,address,uint256,uint256)" \
    5000000000000000000000 \
    100000 \
    0x498581ff718922c3f8e6a244956af099b2652b2b \
    0x7c5f5a4bbd8fd63184577525326123b519429bdc \
    0x000000000022D473030F116dDEE9F6B43aC78BA3 \
    0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
    100000000000 \
    500000000000000000000000000)
```

## What Happens After Deployment

1. **Users pay 1.25 USDC** → Server receives payment via x402
2. **Server forwards 1.00 USDC** → Accumulates in POICv2 contract
3. **User answers correctly** → Server calls `batchMint`
4. **User receives 5000 POIC** → Minted to their wallet
5. **After 100k mints** → Contract auto-deploys LP with:
   - 100k USDC accumulated
   - 500M POIC minted
   - Creates Uniswap v4 pool automatically
6. **POIC now tradeable** → Users can swap on Uniswap v4

## Admin Functions (Post-Deployment)

```bash
# Collect LP trading fees (after LP deployment)
cast send $POIC_ADDRESS "collectLpFees()" \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Emergency withdraw (before LP deployment only)
cast send $POIC_ADDRESS "emergencyWithdraw()" \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Summary

✅ Foundry project initialized
✅ POICv2 contract compiled successfully
✅ Deployment script created
✅ MINTER_ROLE grant script created
✅ All Uniswap v4 addresses configured
✅ Ready to deploy!

**Next Steps:**
1. Set up `.env` file with PRIVATE_KEY
2. Run deployment script
3. Grant MINTER_ROLE to server wallet
4. Fund server wallet with ETH
5. Update contract address in codebase
6. Test the full flow!

Let's ride! 🚀
