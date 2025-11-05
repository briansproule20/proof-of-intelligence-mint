import { createWalletClient, http, parseAbi, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACT_ADDRESS } from './contract';
import { USDC_ADDRESS_BASE, PAYMENT_AMOUNT, LP_CONTRIBUTION } from '@poim/shared';

// Server wallet for minting tokens
const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;

if (!privateKey) {
  throw new Error('SERVER_WALLET_PRIVATE_KEY is not set');
}

// Create account from private key
const account = privateKeyToAccount(privateKey as `0x${string}`);

// Create wallet client
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

// ABI for batchMint function
const BATCH_MINT_ABI = parseAbi([
  'function batchMint(address[] calldata to, bytes32[] calldata txHashes) external',
]);

// ABI for USDC transfer
const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
]);

/**
 * Transfer USDC to the POIC contract (LP pool)
 * @param amount Amount in USDC (with 6 decimals) - defaults to LP_CONTRIBUTION (1.00 USDC)
 * @returns Transaction hash
 */
export async function forwardUsdcToContract(amount: string = LP_CONTRIBUTION): Promise<string> {
  try {
    console.log('[Server Wallet] Attempting to forward USDC:', {
      from: account.address,
      to: CONTRACT_ADDRESS,
      amount,
      usdcContract: USDC_ADDRESS_BASE,
    });

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS_BASE as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [CONTRACT_ADDRESS, BigInt(amount)],
    });

    console.log(`[Server Wallet] ✅ Forwarded ${amount} USDC to contract, tx: ${hash}`);
    return hash;
  } catch (error) {
    console.error('[Server Wallet] ❌ Failed to forward USDC:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorDetails: JSON.stringify(error, null, 2),
    });
    throw error; // Re-throw original error for better debugging
  }
}

/**
 * Mint tokens to a user via server-side transaction
 * @param walletAddress User's wallet address
 * @param paymentTxHash Payment transaction hash (for idempotency)
 * @returns Transaction hash
 */
export async function mintTokens(
  walletAddress: string,
  paymentTxHash: string
): Promise<string> {
  try {
    // Convert payment tx hash to bytes32
    const txHashBytes32 = paymentTxHash as `0x${string}`;

    // Call batchMint with single user
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: BATCH_MINT_ABI,
      functionName: 'batchMint',
      args: [[walletAddress as `0x${string}`], [txHashBytes32]],
    });

    console.log(`[Server Wallet] Minted tokens to ${walletAddress}, tx: ${hash}`);

    return hash;
  } catch (error) {
    console.error('[Server Wallet] Failed to mint tokens:', error);
    throw new Error('Failed to mint tokens');
  }
}

/**
 * Get the server wallet address
 */
export function getServerWalletAddress(): string {
  return account.address;
}
