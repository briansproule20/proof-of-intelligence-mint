import { privateKeyToAccount } from 'viem/accounts';
import { encodePacked, keccak256, toHex } from 'viem';
import { MintPermit, SIGNATURE_VALIDITY_SECONDS } from '@poim/shared';

const DOMAIN_NAME = 'POIC';
const DOMAIN_VERSION = '1';

/**
 * Generate EIP-712 signature for minting tokens
 */
export async function generateMintSignature(
  to: `0x${string}`,
  amount: bigint,
  nonce: bigint,
  contractAddress: `0x${string}`,
  chainId: number
): Promise<{ signature: `0x${string}`; permit: MintPermit }> {
  const privateKey = process.env.MINT_SIGNER_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) {
    throw new Error('MINT_SIGNER_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey);
  const deadline = Math.floor(Date.now() / 1000) + SIGNATURE_VALIDITY_SECONDS;

  // EIP-712 domain
  const domain = {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId,
    verifyingContract: contractAddress,
  } as const;

  // MintPermit type
  const types = {
    MintPermit: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
    ],
  } as const;

  // Message data
  const message = {
    to,
    amount,
    nonce,
    deadline: BigInt(deadline),
  } as const;

  // Sign using viem's signTypedData
  const signature = await account.signTypedData({
    domain,
    types,
    primaryType: 'MintPermit',
    message,
  });

  const permit: MintPermit = {
    to,
    amount: amount.toString(),
    nonce: nonce.toString(),
    deadline,
  };

  return { signature, permit };
}

/**
 * Get next available nonce for an address
 * In production, this should query the contract or maintain a database
 */
export function getNextNonce(address: string): bigint {
  // Simple timestamp-based nonce for development
  // In production, track used nonces in database
  return BigInt(Date.now());
}
