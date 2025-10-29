// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity);
}

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

/**
 * @title POIC - Proof of Intelligence Coin v2
 * @notice ERC-20 token with paid mints ($1), 100k cap, and automatic AMM liquidity
 * @dev Users pay $1 to mint, contract adds liquidity after 100k mints
 */
contract POICv2 is ERC20, EIP712, Ownable {
    using ECDSA for bytes32;

    // Constants
    uint256 public constant MAX_SUPPLY = 100_000 * 10**18; // 100k tokens
    uint256 public constant MINT_FEE = 0.0003 ether; // ~$1 in ETH on Base

    // The address authorized to sign mint permissions
    address public mintSigner;

    // Uniswap router for adding liquidity
    IUniswapV2Router02 public immutable uniswapRouter;
    address public liquidityPool;

    // Tracking
    bool public liquidityAdded;
    uint256 public totalMinted;

    // Mapping to track used nonces to prevent replay attacks
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    // EIP-712 type hash for the MintPermit struct
    bytes32 public constant MINT_PERMIT_TYPEHASH =
        keccak256("MintPermit(address to,uint256 amount,uint256 nonce,uint256 deadline)");

    // Events
    event MintSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event TokensMinted(address indexed to, uint256 amount, uint256 fee);
    event LiquidityAdded(uint256 tokenAmount, uint256 ethAmount, uint256 liquidity);

    // Errors
    error InvalidSignature();
    error SignatureExpired();
    error NonceAlreadyUsed();
    error ZeroAddress();
    error InsufficientMintFee();
    error MaxSupplyReached();
    error LiquidityAlreadyAdded();

    /**
     * @notice Constructor initializes the token and Uniswap router
     * @param _mintSigner Address authorized to sign mint permissions
     * @param _uniswapRouter Uniswap V2 Router address on Base
     */
    constructor(
        address _mintSigner,
        address _uniswapRouter
    ) ERC20("Proof of Intelligence Coin", "POIC") EIP712("POIC", "2") Ownable(msg.sender) {
        if (_mintSigner == address(0)) revert ZeroAddress();
        if (_uniswapRouter == address(0)) revert ZeroAddress();

        mintSigner = _mintSigner;
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
    }

    /**
     * @notice Mint tokens with payment and valid signature
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
    ) external payable {
        // Check mint fee
        if (msg.value < MINT_FEE) revert InsufficientMintFee();

        // Check supply cap
        if (totalMinted + amount > MAX_SUPPLY) revert MaxSupplyReached();

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

        // Update total minted
        totalMinted += amount;

        // Mint tokens
        _mint(to, amount);

        emit TokensMinted(to, amount, msg.value);

        // If we've reached max supply, add liquidity
        if (totalMinted == MAX_SUPPLY && !liquidityAdded) {
            _addLiquidity();
        }
    }

    /**
     * @notice Add liquidity to Uniswap after max supply is reached
     * @dev Called automatically when max supply is hit
     */
    function _addLiquidity() private {
        liquidityAdded = true;

        uint256 tokenAmount = balanceOf(address(this));
        uint256 ethAmount = address(this).balance;

        // Approve router to spend tokens
        _approve(address(this), address(uniswapRouter), tokenAmount);

        // Add liquidity
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = uniswapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            owner(), // LP tokens go to owner
            block.timestamp + 15 minutes
        );

        emit LiquidityAdded(amountToken, amountETH, liquidity);
    }

    /**
     * @notice Manually add liquidity (in case automatic fails)
     */
    function addLiquidity() external onlyOwner {
        if (liquidityAdded) revert LiquidityAlreadyAdded();
        if (totalMinted < MAX_SUPPLY) revert MaxSupplyReached();
        _addLiquidity();
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
     * @notice Withdraw excess ETH (emergency only)
     */
    function withdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
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

    // Allow contract to receive ETH
    receive() external payable {}
}
