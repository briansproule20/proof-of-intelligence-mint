import { createWalletClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACT_ADDRESS } from './contract';

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

    // Wait for transaction confirmation
    // Note: In production, you might want to handle this asynchronously
    // or return the hash immediately and confirm later

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
