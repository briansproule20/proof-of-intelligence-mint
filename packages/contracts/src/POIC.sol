// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title POIC - Proof of Intelligence Coin
 * @notice ERC-20 token that can be minted with a valid signature from the authorized signer
 * @dev Implements EIP-712 for structured data signing and verification
 */
contract POIC is ERC20, EIP712, Ownable {
    using ECDSA for bytes32;

    // The address authorized to sign mint permissions
    address public mintSigner;

    // Mapping to track used nonces to prevent replay attacks
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // EIP-712 type hash for the MintPermit struct
    bytes32 public constant MINT_PERMIT_TYPEHASH =
        keccak256("MintPermit(address to,uint256 amount,uint256 nonce,uint256 deadline)");

    // Events
    event MintSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event TokensMinted(address indexed to, uint256 amount, uint256 nonce);

    // Errors
    error InvalidSignature();
    error SignatureExpired();
    error NonceAlreadyUsed();
    error ZeroAddress();

    /**
     * @notice Constructor initializes the token and sets up EIP-712 domain
     * @param _mintSigner Address authorized to sign mint permissions
     */
    constructor(address _mintSigner) ERC20("Proof of Intelligence Coin", "POIC") EIP712("POIC", "1") Ownable(msg.sender) {
        if (_mintSigner == address(0)) revert ZeroAddress();
        mintSigner = _mintSigner;
    }

    /**
     * @notice Mint tokens with a valid signature from the mint signer
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     * @param nonce Unique nonce for this mint operation
     * @param deadline Timestamp after which the signature expires
     * @param signature EIP-712 signature from the mint signer
     */
    function mintWithSig(
        address to,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes memory signature
    ) external {
        // Check deadline
        if (block.timestamp > deadline) revert SignatureExpired();

        // Check nonce hasn't been used
        if (usedNonces[to][nonce]) revert NonceAlreadyUsed();

        // Verify signature
        bytes32 structHash = keccak256(
            abi.encode(MINT_PERMIT_TYPEHASH, to, amount, nonce, deadline)
        );
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);

        if (signer != mintSigner) revert InvalidSignature();

        // Mark nonce as used
        usedNonces[to][nonce] = true;

        // Mint tokens
        _mint(to, amount);

        emit TokensMinted(to, amount, nonce);
    }

    /**
     * @notice Update the address authorized to sign mint permissions
     * @param newSigner New mint signer address
     */
    function setMintSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address oldSigner = mintSigner;
        mintSigner = newSigner;
        emit MintSignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Get the EIP-712 domain separator
     * @return The domain separator hash
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Check if a nonce has been used for an address
     * @param user Address to check
     * @param nonce Nonce to check
     * @return True if nonce has been used
     */
    function isNonceUsed(address user, uint256 nonce) external view returns (bool) {
        return usedNonces[user][nonce];
    }
}
