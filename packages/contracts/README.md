# POIC Smart Contracts

Solidity smart contracts for Proof of Intelligence Coin (POIC), an ERC-20 token with signature-based minting.

## Overview

The POIC contract implements an ERC-20 token that can only be minted with a valid EIP-712 signature from an authorized signer. This enables gasless authorization of mints - the backend signs permission for a user to mint, and the user pays only gas fees to execute the mint transaction.

## Contracts

### POIC.sol

Main token contract implementing:
- **ERC-20**: Standard token functionality (transfer, approve, etc.)
- **EIP-712**: Structured data signing for secure off-chain authorization
- **Signature-based minting**: Users can mint tokens with valid signatures
- **Nonce tracking**: Prevents replay attacks
- **Deadline enforcement**: Signatures expire after a specified timestamp
- **Access control**: Owner can update the authorized mint signer

## Prerequisites

- [Foundry](https://getfoundry.sh/) - Ethereum development toolkit

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

## Installation

```bash
cd packages/contracts

# Install OpenZeppelin dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit
```

## Testing

```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test testMintWithValidSignature

# Run with gas reporting
forge test --gas-report

# Run with coverage
forge coverage
```

## Deployment

### Local (Anvil)

```bash
# Start local node
anvil

# In another terminal, deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://localhost:8545 \
  --broadcast \
  --private-key <DEPLOYER_PRIVATE_KEY>
```

### Base Sepolia Testnet

```bash
# Set environment variables
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
export PRIVATE_KEY=<deployer_private_key>
export MINT_SIGNER_ADDRESS=<mint_signer_address>
export BASESCAN_API_KEY=<your_basescan_api_key>

# Deploy and verify
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify
```

## Contract Interface

### mintWithSig

```solidity
function mintWithSig(
    address to,
    uint256 amount,
    uint256 nonce,
    uint256 deadline,
    bytes memory signature
) external
```

Mints tokens to `to` address with a valid signature. The signature must be created by the authorized mint signer.

**Parameters:**
- `to`: Address receiving the tokens
- `amount`: Amount of tokens to mint (in wei, 1 token = 1e18)
- `nonce`: Unique nonce for this mint (prevents replay)
- `deadline`: Unix timestamp after which signature is invalid
- `signature`: EIP-712 signature (65 bytes)

**Errors:**
- `InvalidSignature()`: Signature verification failed
- `SignatureExpired()`: Current time > deadline
- `NonceAlreadyUsed()`: Nonce was already used for this address

### setMintSigner

```solidity
function setMintSigner(address newSigner) external onlyOwner
```

Updates the address authorized to sign mint permissions. Only callable by contract owner.

### View Functions

```solidity
function domainSeparator() external view returns (bytes32)
function isNonceUsed(address user, uint256 nonce) external view returns (bool)
```

## EIP-712 Signature Format

The contract uses EIP-712 structured data signing with the following domain and message format:

**Domain:**
```javascript
{
  name: "POIC",
  version: "1",
  chainId: 84532, // Base Sepolia
  verifyingContract: "0x..." // POIC contract address
}
```

**Message (MintPermit):**
```javascript
{
  to: address,      // Recipient address
  amount: uint256,  // Token amount
  nonce: uint256,   // Unique nonce
  deadline: uint256 // Expiration timestamp
}
```

## Security Considerations

1. **Nonce Management**: Each address has its own nonce space. Ensure nonces are sequential or tracked properly.
2. **Deadline**: Always set reasonable deadlines (e.g., 15 minutes) to limit signature validity.
3. **Private Keys**: Keep mint signer private key secure - it controls all minting.
4. **Signature Generation**: Only generate signatures after verifying trivia answers server-side.

## Development

### Compile

```bash
forge build
```

### Format

```bash
forge fmt
```

### Gas Optimization

The contract is optimized for gas efficiency:
- Uses custom errors instead of strings
- Efficient storage layout
- Minimal storage reads/writes

### Verify on Basescan

```bash
forge verify-contract \
  --chain-id 84532 \
  --compiler-version v0.8.24 \
  <CONTRACT_ADDRESS> \
  src/POIC.sol:POIC \
  --constructor-args $(cast abi-encode "constructor(address)" <MINT_SIGNER_ADDRESS>)
```

## Integration with Backend

See example signature generation in the web app's API route (`apps/web/app/api/verify-answer`).

## License

MIT
