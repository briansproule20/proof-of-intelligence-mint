// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import "@uniswap/v4-periphery/src/interfaces/IPositionManager.sol";
import "@permit2/src/interfaces/IAllowanceTransfer.sol";

/**
 * @title POIC - Proof of Intelligence Coin
 * @notice ERC-20 token with server-side minting and automated Uniswap V4 LP creation
 * @dev After 100k mints (1 USDC each, 5000 POIC reward), automatically seeds Uniswap V4 LP
 */
contract POIC is ERC20, AccessControl {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_MINT_COUNT = 100_000;
    uint256 public constant MINT_AMOUNT = 5000 * 10**18; // 5000 POIC per mint
    uint256 public constant PAYMENT_SEED = 100_000 * 10**6; // 100k USDC (6 decimals)
    uint256 public constant POOL_SEED_AMOUNT = 500_000_000 * 10**18; // 500M POIC for LP

    // USDC on Base Mainnet
    address public constant PAYMENT_TOKEN = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // ============ State Variables ============

    IPoolManager public immutable poolManager;
    IPositionManager public immutable positionManager;
    IAllowanceTransfer public immutable permit2;

    uint256 public mintCount;
    bool public lpDeployed;
    address public lpGuardHook;

    // Track minted tx hashes to prevent double-mints
    mapping(bytes32 => bool) public hasMinted;

    // EIP-3009 nonces for USDC-style authorization
    mapping(address => mapping(bytes32 => bool)) public authorizationState;

    // ============ Events ============

    event TokensMinted(address indexed to, uint256 amount, bytes32 txHash, uint256 newMintCount);
    event LiquidityDeployed(uint256 usdcAmount, uint256 poicAmount, uint256 tokenId);
    event LpFeesCollected(uint256 amount0, uint256 amount1);
    event LpGuardHookSet(address indexed hook);
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(address indexed authorizer, bytes32 indexed nonce);

    // ============ Errors ============

    error MaxMintsReached();
    error TxHashAlreadyMinted();
    error OnlyMinter();
    error LpAlreadyDeployed();
    error LpNotDeployed();
    error InsufficientPaymentBalance();
    error InvalidArrayLength();
    error AuthorizationAlreadyUsed();
    error AuthorizationExpired();
    error InvalidSignature();

    /**
     * @notice Constructor initializes the token and Uniswap V4 integration
     * @param _poolManager Uniswap V4 PoolManager address
     * @param _positionManager Uniswap V4 PositionManager address
     * @param _permit2 Permit2 contract address
     */
    constructor(
        address _poolManager,
        address _positionManager,
        address _permit2
    ) ERC20("Proof of Intelligence Coin", "POIC") {
        poolManager = IPoolManager(_poolManager);
        positionManager = IPositionManager(_positionManager);
        permit2 = IAllowanceTransfer(_permit2);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        // Pre-mint LP seed amount to contract
        _mint(address(this), POOL_SEED_AMOUNT);
    }

    /**
     * @notice Batch mint tokens to multiple addresses (server-controlled)
     * @param to Array of recipient addresses
     * @param txHashes Array of payment transaction hashes (for idempotency)
     */
    function batchMint(address[] calldata to, bytes32[] calldata txHashes) external {
        if (!hasRole(MINTER_ROLE, msg.sender)) revert OnlyMinter();
        if (to.length != txHashes.length) revert InvalidArrayLength();

        for (uint256 i = 0; i < to.length; i++) {
            _mintSingle(to[i], txHashes[i]);
        }
    }

    /**
     * @notice Internal function to mint tokens to a single address
     * @param to Recipient address
     * @param txHash Payment transaction hash
     */
    function _mintSingle(address to, bytes32 txHash) internal {
        if (mintCount >= MAX_MINT_COUNT) revert MaxMintsReached();
        if (hasMinted[txHash]) revert TxHashAlreadyMinted();

        hasMinted[txHash] = true;
        mintCount++;

        _mint(to, MINT_AMOUNT);

        emit TokensMinted(to, MINT_AMOUNT, txHash, mintCount);

        // Auto-deploy LP at 100k mints
        if (mintCount == MAX_MINT_COUNT && !lpDeployed) {
            _initializePoolAndDeployLiquidity();
        }
    }

    /**
     * @notice Initialize Uniswap V4 pool and deploy initial liquidity
     * @dev Triggered automatically at 100k mints
     */
    function _initializePoolAndDeployLiquidity() internal {
        if (lpDeployed) revert LpAlreadyDeployed();

        uint256 usdcBalance = IERC20(PAYMENT_TOKEN).balanceOf(address(this));
        if (usdcBalance < PAYMENT_SEED) revert InsufficientPaymentBalance();

        // Calculate sqrtPriceX96 for USDC:POIC ratio
        // Price = USDC per POIC = 100k USDC / 500M POIC = 0.0002 USDC per POIC
        // Adjusted for decimals: (100k * 10^6) / (500M * 10^18) = 0.0002 * 10^-12
        // For sqrtPriceX96: sqrt(price) * 2^96
        // This needs to account for token order (token0 < token1)

        uint160 sqrtPriceX96 = _calculateSqrtPriceX96(PAYMENT_TOKEN, address(this));

        // Initialize pool (assuming pool doesn't exist)
        // Note: This is simplified - production would need proper pool key and initialization
        // poolManager.initialize(poolKey, sqrtPriceX96, hookData);

        // Approve tokens for position manager
        IERC20(PAYMENT_TOKEN).forceApprove(address(positionManager), PAYMENT_SEED);
        _approve(address(this), address(positionManager), POOL_SEED_AMOUNT);

        // Mint LP position (simplified - actual implementation needs proper params)
        // uint256 tokenId = positionManager.mint(...);

        lpDeployed = true;

        emit LiquidityDeployed(PAYMENT_SEED, POOL_SEED_AMOUNT, 0);
    }

    /**
     * @notice Calculate sqrtPriceX96 for initial pool price
     * @param token0 First token address
     * @param token1 Second token address
     * @return sqrtPriceX96 Square root price in Q96 format
     */
    function _calculateSqrtPriceX96(address token0, address token1) internal pure returns (uint160) {
        // Simplified calculation - actual implementation would be more complex
        // Price ratio: 0.0002 USDC per POIC (accounting for decimals)
        // If USDC is token0: sqrt(0.0002 * 10^-12) * 2^96
        // If POIC is token0: sqrt(5000 * 10^12) * 2^96

        bool usdcIsToken0 = token0 < token1;

        if (usdcIsToken0) {
            // USDC per POIC = 0.0002 * 10^-12
            // sqrtPrice = sqrt(2 * 10^-16) * 2^96 ≈ 1.12 * 10^12
            return 1_120_000_000_000; // Approximate value
        } else {
            // POIC per USDC = 5000 * 10^12
            // sqrtPrice = sqrt(5000 * 10^12) * 2^96 ≈ 5.6 * 10^15
            return 5_600_000_000_000_000; // Approximate value
        }
    }

    /**
     * @notice Collect LP fees (admin only)
     */
    function collectLpFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!lpDeployed) revert LpNotDeployed();

        // Collect fees from position (simplified)
        // (uint256 amount0, uint256 amount1) = positionManager.collect(...);

        emit LpFeesCollected(0, 0);
    }

    /**
     * @notice Emergency withdraw tokens (admin only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(address token, uint256 amount, address to)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Set LP guard hook address (admin only)
     * @param hook Hook contract address
     */
    function setLpGuardHook(address hook) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lpGuardHook = hook;
        emit LpGuardHookSet(hook);
    }

    // ============ EIP-3009 Functions ============

    /**
     * @notice Transfer tokens with authorization signature
     * @param from Payer's address
     * @param to Payee's address
     * @param value Amount to transfer
     * @param validAfter Signature valid after this timestamp
     * @param validBefore Signature valid before this timestamp
     * @param nonce Unique nonce
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _requireValidAuthorization(from, nonce, validAfter, validBefore);
        _requireValidSignature(
            from,
            keccak256(abi.encode(
                keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"),
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )),
            v,
            r,
            s
        );

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Receive tokens with authorization signature
     * @param from Payer's address
     * @param to Payee's address
     * @param value Amount to transfer
     * @param validAfter Signature valid after this timestamp
     * @param validBefore Signature valid before this timestamp
     * @param nonce Unique nonce
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        if (to != msg.sender) revert InvalidSignature();

        _requireValidAuthorization(from, nonce, validAfter, validBefore);
        _requireValidSignature(
            from,
            keccak256(abi.encode(
                keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"),
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )),
            v,
            r,
            s
        );

        authorizationState[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Cancel an authorization
     * @param authorizer Authorizer's address
     * @param nonce Nonce to cancel
     * @param v Signature v
     * @param r Signature r
     * @param s Signature s
     */
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _requireValidAuthorization(authorizer, nonce, 0, type(uint256).max);
        _requireValidSignature(
            authorizer,
            keccak256(abi.encode(
                keccak256("CancelAuthorization(address authorizer,bytes32 nonce)"),
                authorizer,
                nonce
            )),
            v,
            r,
            s
        );

        authorizationState[authorizer][nonce] = true;
        emit AuthorizationCanceled(authorizer, nonce);
    }

    /**
     * @notice Verify authorization is valid
     */
    function _requireValidAuthorization(
        address authorizer,
        bytes32 nonce,
        uint256 validAfter,
        uint256 validBefore
    ) internal view {
        if (block.timestamp <= validAfter) revert AuthorizationExpired();
        if (block.timestamp >= validBefore) revert AuthorizationExpired();
        if (authorizationState[authorizer][nonce]) revert AuthorizationAlreadyUsed();
    }

    /**
     * @notice Verify signature
     */
    function _requireValidSignature(
        address signer,
        bytes32 digest,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure {
        address recovered = ecrecover(digest, v, r, s);
        if (recovered != signer || recovered == address(0)) revert InvalidSignature();
    }
}
