import { createWalletClient, createPublicClient, http, parseAbi, parseUnits } from 'viem';
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

// Create wallet client (for writes)
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

// Create public client (for reads)
const publicClient = createPublicClient({
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
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : 'Unknown',
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

/**
 * Get server wallet's USDC balance
 */
export async function getServerUsdcBalance(): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS_BASE as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    console.log('[Server Wallet] Current USDC balance:', balance.toString());
    return balance;
  } catch (error) {
    console.error('[Server Wallet] Failed to get USDC balance:', error);
    throw error;
  }
}

/**
 * Sweep accumulated USDC from wrong answers to contract
 *
 * IMPORTANT: Does NOT sweep server fees (0.25 USDC per question)
 * Only sweeps USDC from wrong answers that wasn't forwarded
 *
 * @param totalQuestionsAsked Total number of questions asked (to calculate fee reserve)
 * @param gasReserve Additional USDC to keep for gas (default: 10 USDC)
 * @returns Transaction hash, or null if nothing to sweep
 */
export async function sweepUsdcToContract(
  totalQuestionsAsked: number,
  gasReserve: bigint = BigInt(10_000_000) // 10 USDC for gas
): Promise<string | null> {
  try {
    const balance = await getServerUsdcBalance();

    // Calculate server fee reserve (0.25 USDC per question)
    const serverFeeReserve = BigInt(totalQuestionsAsked) * BigInt(250_000); // 0.25 USDC = 250,000 units
    const totalReserve = serverFeeReserve + gasReserve;

    // Calculate amount to sweep (balance - reserve)
    const amountToSweep = balance > totalReserve
      ? balance - totalReserve
      : BigInt(0);

    // Only sweep if we have meaningful amount (> 1 USDC)
    if (amountToSweep < BigInt(1_000_000)) {
      console.log('[Server Wallet] Insufficient balance to sweep:', {
        balance: balance.toString(),
        serverFeeReserve: serverFeeReserve.toString(),
        gasReserve: gasReserve.toString(),
        totalReserve: totalReserve.toString(),
        wouldSweep: amountToSweep.toString(),
      });
      return null;
    }

    console.log('[Server Wallet] Sweeping accumulated USDC:', {
      totalBalance: balance.toString(),
      serverFeeReserve: serverFeeReserve.toString(),
      gasReserve: gasReserve.toString(),
      totalReserve: totalReserve.toString(),
      sweeping: amountToSweep.toString(),
    });

    // Transfer to contract
    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS_BASE as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [CONTRACT_ADDRESS, amountToSweep],
    });

    console.log(`[Server Wallet] ✅ Swept ${amountToSweep.toString()} USDC to contract, tx: ${hash}`);
    return hash;
  } catch (error) {
    console.error('[Server Wallet] ❌ Failed to sweep USDC:', {
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : 'Unknown',
    });
    throw error;
  }
}
