// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.4.0
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IPositionManager, PoolKey as PositionPoolKey} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {LiquidityAmounts} from "v4-periphery/src/libraries/LiquidityAmounts.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {SafeCast} from "@openzeppelin/contracts/utils/math/SafeCast.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract POIC is ERC20, ERC20Burnable, AccessControl, EIP712, Ownable {
    /// @notice The error thrown when the array length mismatch
    error ArrayLengthMismatch();
    /// @notice The error thrown when the tx hash has already been minted
    error AlreadyMinted(address to, bytes32 txHash);
    /// @notice The error thrown when the mint count exceeds the maximum mint count
    error MaxMintCountExceeded();

    // --- EIP-3009 specific errors ---
    error AuthorizationStateInvalid(address authorizer, bytes32 nonce); // used or canceled
    error AuthorizationExpired(uint256 nowTime, uint256 validBefore);
    error AuthorizationNotYetValid(uint256 nowTime, uint256 validAfter);
    error InvalidSigner(address signer, address expected);
    error InvalidRecipient(address to);

    // --- EIP-3009 events ---
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);
    event AuthorizationCanceled(
        address indexed authorizer,
        bytes32 indexed nonce
    );

    // --- EIP-3009 typehashes (per spec) ---
    bytes32 private constant _TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 private constant _RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
        keccak256(
            "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
        );

    bytes32 private constant _CANCEL_AUTHORIZATION_TYPEHASH =
        keccak256("CancelAuthorization(address authorizer,bytes32 nonce)");

    // --- EIP-3009 authorization state tracking ---
    // 0 = Unused, 1 = Used, 2 = Canceled
    mapping(address => mapping(bytes32 => uint8)) private _authorizationStates;

    // -- immutable state --

    /// @notice The pool manager (Uniswap v4 PoolManager)
    IPoolManager internal immutable POOL_MANAGER;

    /// @notice The PositionManager for managing liquidity NFTs
    IPositionManager internal immutable POSITION_MANAGER;

    /// @notice Permit2 for token approvals
    IAllowanceTransfer internal immutable PERMIT2;

    /// @notice The payment token
    address internal immutable PAYMENT_TOKEN;

    /// @notice The total payment token amount for liquidity pool seeding
    uint256 internal immutable PAYMENT_SEED;

    /// @notice The pool seed amount (POIC tokens for liquidity)
    uint256 internal immutable POOL_SEED_AMOUNT;

    /// @notice The amount of tokens to mint in the batch
    uint256 internal immutable MINT_AMOUNT;

    /// @notice The number of mints allowed
    uint256 internal immutable MAX_MINT_COUNT;

    /// @notice The number of mints
    uint256 internal _mintCount;

    /// @notice Tracks which tx hashes have already been minted
    mapping(bytes32 => bool) public hasMinted;

    /// @notice The lp guard hook
    address internal lpGuardHook;

    /// @notice Token ID for the protocol-owned LP position
    uint256 internal _lpTokenId;

    /// @notice Flag indicating whether liquidity has been deployed
    bool internal _liquidityDeployed;

    /// @notice Flag indicating whether emergency withdraw has been used
    bool internal _emergencyWithdrawUsed;

    /// @notice Emitted when the position manager mints the protocol-owned LP token
    event LiquidityDeployed(uint256 tokenId, uint128 liquidity);

    /// @notice Emitted when fees are collected for the protocol-owned LP token
    event FeesCollected(
        address recipient,
        uint256 amountToken0,
        uint256 amountToken1
    );

    /// @notice Constant sqrtPriceX96 when payment token precedes POIC token
    uint160 internal immutable SQRT_PRICE_PAYMENT_TOKEN_FIRST;

    /// @notice Constant sqrtPriceX96 when POIC token precedes payment token
    uint160 internal immutable SQRT_PRICE_POIC_FIRST;

    /// @notice Cached sorted token ordering flag (true when payment token < POIC)
    bool internal immutable PAYMENT_TOKEN_IS_TOKEN0;

    /// @notice Role identifier for minters allowed to call batchMint
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(
        uint256 _mintAmount,
        uint256 _maxMintCount,
        IPoolManager _poolManager,
        IPositionManager _positionManager,
        IAllowanceTransfer _permit2,
        address _paymentToken,
        uint256 _paymentSeed,
        uint256 _poolSeedAmount
    )
        ERC20("Proof of Intelligence Coin", "POIC")
        EIP712("POIC", "1")
        Ownable(msg.sender)
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        MINT_AMOUNT = _mintAmount;
        MAX_MINT_COUNT = _maxMintCount;
        POOL_MANAGER = _poolManager;
        POSITION_MANAGER = _positionManager;
        PERMIT2 = _permit2;
        PAYMENT_TOKEN = _paymentToken;
        PAYMENT_SEED = _paymentSeed;
        POOL_SEED_AMOUNT = _poolSeedAmount;

        bool paymentTokenIsToken0 = _paymentToken < address(this);
        PAYMENT_TOKEN_IS_TOKEN0 = paymentTokenIsToken0;

        // price ratios accounting for decimal differences (6 decimals for USDC, 18 for POIC)
        // 100k USDC : 500M POIC ratio
        uint160 sqrtPricePaymentFirst = 5602277097478614411626293834203267072;
        uint160 sqrtPricePoicFirst = 1120455419495722778624;
        SQRT_PRICE_PAYMENT_TOKEN_FIRST = sqrtPricePaymentFirst;
        SQRT_PRICE_POIC_FIRST = sqrtPricePoicFirst;
    }

    // -------------------------
    // EIP-3009 public interface
    // -------------------------

    /// @notice EIP-712 domain separator (for compatibility with offchain tooling)
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @notice Returns authorization state for a given authorizer & nonce.
    /// true = Used or Canceled, false = Unused
    function authorizationState(
        address authorizer,
        bytes32 nonce
    ) external view returns (bool) {
        return _authorizationStates[authorizer][nonce] != 0;
    }

    /// @notice Execute an ERC20 transfer signed by `from`.
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
    ) external returns (bool) {
        _validateTimeframe(validAfter, validBefore);
        _useAuthorization(from, nonce);

        bytes32 structHash = keccak256(
            abi.encode(
                _TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );
        _requireValidSignature(from, structHash, v, r, s);

        _transfer(from, to, value);
        return true;
    }

    /// @notice Execute a transfer to the caller, preventing front-running.
    /// `to` MUST equal msg.sender per EIP-3009 best-practice.
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
    ) external returns (bool) {
        if (to != msg.sender) revert InvalidRecipient(to);

        _validateTimeframe(validAfter, validBefore);
        _useAuthorization(from, nonce);

        bytes32 structHash = keccak256(
            abi.encode(
                _RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
                from,
                to,
                value,
                validAfter,
                validBefore,
                nonce
            )
        );
        _requireValidSignature(from, structHash, v, r, s);

        _transfer(from, to, value);
        return true;
    }

    /// @notice Cancel a previously issued authorization (that hasn't been used yet).
    function cancelAuthorization(
        address authorizer,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // must be unused
        if (_authorizationStates[authorizer][nonce] != 0) {
            revert AuthorizationStateInvalid(authorizer, nonce);
        }

        bytes32 structHash = keccak256(
            abi.encode(_CANCEL_AUTHORIZATION_TYPEHASH, authorizer, nonce)
        );
        _requireValidSignature(authorizer, structHash, v, r, s);

        _authorizationStates[authorizer][nonce] = 2; // Canceled
        emit AuthorizationCanceled(authorizer, nonce);
    }

    // -------------------------
    // Internal helpers (EIP-3009)
    // -------------------------

    function _validateTimeframe(
        uint256 validAfter,
        uint256 validBefore
    ) internal view {
        uint256 nowTs = block.timestamp;
        if (nowTs <= validAfter)
            revert AuthorizationNotYetValid(nowTs, validAfter);
        if (nowTs >= validBefore)
            revert AuthorizationExpired(nowTs, validBefore);
    }

    function _useAuthorization(address authorizer, bytes32 nonce) internal {
        // must be unused
        if (_authorizationStates[authorizer][nonce] != 0) {
            revert AuthorizationStateInvalid(authorizer, nonce);
        }
        _authorizationStates[authorizer][nonce] = 1; // Used
        emit AuthorizationUsed(authorizer, nonce);
    }

    function _requireValidSignature(
        address expectedSigner,
        bytes32 structHash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view {
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        if (signer != expectedSigner)
            revert InvalidSigner(signer, expectedSigner);
    }

    // -------------------------
    // Minting logic
    // -------------------------

    /// @notice Batch mints tokens to multiple addresses with unique txHashes
    /// @param to Array of addresses to mint tokens to
    /// @param txHashes Array of tx hashes to prevent double minting
    function batchMint(
        address[] memory to,
        bytes32[] memory txHashes
    ) public onlyRole(MINTER_ROLE) {
        if (to.length != txHashes.length) {
            revert ArrayLengthMismatch();
        }

        if (_mintCount + to.length > MAX_MINT_COUNT) {
            revert MaxMintCountExceeded();
        }

        for (uint256 i = 0; i < to.length; i++) {
            // check if the tx hash has already been minted
            if (hasMinted[txHashes[i]]) {
                revert AlreadyMinted(to[i], txHashes[i]);
            }

            hasMinted[txHashes[i]] = true;
            _mint(to[i], MINT_AMOUNT);
        }

        _mintCount += to.length;

        if (_mintCount == MAX_MINT_COUNT) {
            _initializePoolAndDeployLiquidity(10_000, 200);
        }
    }

    /// @dev Initialize the Uniswap v4 pool, mint a full range LP position, and settle funds in one flow.
    /// @param fee The pool fee in pips (e.g. 3000 = 0.3%)
    /// @param tickSpacing The tick spacing for the pool configuration
    function _initializePoolAndDeployLiquidity(
        uint24 fee,
        int24 tickSpacing
    ) internal {
        (
            address token0,
            address token1,
            uint160 sqrtPriceX96
        ) = _sortedTokenData();

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: fee,
            tickSpacing: tickSpacing,
            hooks: IHooks(lpGuardHook)
        });

        // Initialize pool via PositionManager's initializer interface
        POOL_MANAGER.initialize(poolKey, sqrtPriceX96);

        // Prepare mint actions payload
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.SETTLE_PAIR)
        );

        // Total payment seed amount for liquidity
        uint256 amountPayment = PAYMENT_SEED;

        _mint(address(this), POOL_SEED_AMOUNT);

        (
            uint128 amount0Max,
            uint128 amount1Max,
            uint128 liquidity
        ) = _calculateMintParams(poolKey, amountPayment, POOL_SEED_AMOUNT);

        (int24 tickLower, int24 tickUpper) = _fullRangeTicks(tickSpacing);

        // Set up approvals for Permit2 and PositionManager
        // Approve Permit2 to spend both tokens with the correct amount
        IERC20(PAYMENT_TOKEN).approve(address(PERMIT2), amountPayment);
        IERC20(address(this)).approve(address(PERMIT2), POOL_SEED_AMOUNT);

        // Approve PositionManager via Permit2 for both tokens
        PERMIT2.approve(
            PAYMENT_TOKEN,
            address(POSITION_MANAGER),
            SafeCast.toUint160(amountPayment),
            type(uint48).max
        );
        PERMIT2.approve(
            address(this),
            address(POSITION_MANAGER),
            SafeCast.toUint160(POOL_SEED_AMOUNT),
            type(uint48).max
        );

        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(
            poolKey,
            tickLower,
            tickUpper,
            liquidity,
            amount0Max,
            amount1Max,
            address(this),
            bytes("")
        );
        params[1] = abi.encode(poolKey.currency0, poolKey.currency1);

        uint256 tokenIdBefore = POSITION_MANAGER.nextTokenId();
        POSITION_MANAGER.modifyLiquidities(
            abi.encode(actions, params),
            block.timestamp
        );

        uint256 mintedTokenId = tokenIdBefore;
        _lpTokenId = mintedTokenId;
        _liquidityDeployed = true;
        emit LiquidityDeployed(mintedTokenId, liquidity);
    }

    /// @notice Set the LP guard hook address (can only be called once before liquidity deployment)
    /// @param _lpGuardHook The address of the LP guard hook
    function setLpGuardHook(
        address _lpGuardHook
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(lpGuardHook == address(0), "Hook already set");
        require(_lpGuardHook != address(0), "Invalid hook address");
        lpGuardHook = _lpGuardHook;
    }

    /// @notice Emergency withdraw function to recover funds before liquidity deployment
    /// @dev Can only be called once and only before liquidity is deployed to the pool
    function emergencyWithdraw() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(!_liquidityDeployed, "Liquidity already deployed");
        require(!_emergencyWithdrawUsed, "Emergency withdraw already used");

        // Mark as used
        _emergencyWithdrawUsed = true;

        // Mint POIC LP seed tokens to sender
        _mint(msg.sender, POOL_SEED_AMOUNT);

        // Transfer all PAYMENT_TOKEN balance to sender
        uint256 balance = IERC20(PAYMENT_TOKEN).balanceOf(address(this));
        if (balance > 0) {
            IERC20(PAYMENT_TOKEN).transfer(msg.sender, balance);
        }
    }

    /// @notice Collect outstanding fees from the protocol-owned LP position to the owner
    function collectLpFees() external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 tokenId = _lpTokenId;
        require(tokenId != 0, "LP_NOT_INITIALIZED");

        (PositionPoolKey memory poolKey, ) = POSITION_MANAGER
            .getPoolAndPositionInfo(tokenId);

        bytes memory actions = abi.encodePacked(
            uint8(Actions.DECREASE_LIQUIDITY),
            uint8(Actions.TAKE_PAIR)
        );

        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(
            tokenId,
            uint256(0),
            uint128(0),
            uint128(0),
            bytes("")
        );
        params[1] = abi.encode(
            poolKey.currency0,
            poolKey.currency1,
            msg.sender
        );

        uint256 deadline = block.timestamp + 1 hours;
        POSITION_MANAGER.modifyLiquidities(
            abi.encode(actions, params),
            deadline
        );
    }

    /// @notice Withdraw any ERC20 token from the contract to the admin
    /// @param token The address of the ERC20 token to withdraw
    /// @param amount The amount of tokens to withdraw
    function withdrawToken(
        address token,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(token).transfer(msg.sender, amount);
    }

    function _calculateMintParams(
        PoolKey memory poolKey,
        uint256 amountPaymentToken,
        uint256 amountPoic
    )
        internal
        view
        returns (uint128 amount0Max, uint128 amount1Max, uint128 liquidity)
    {
        uint256 amount0;
        uint256 amount1;

        if (PAYMENT_TOKEN_IS_TOKEN0) {
            amount0 = amountPaymentToken;
            amount1 = amountPoic;
        } else {
            amount0 = amountPoic;
            amount1 = amountPaymentToken;
        }

        amount0Max = SafeCast.toUint128(amount0);
        amount1Max = SafeCast.toUint128(amount1);

        uint256 sqrtPriceX96 = PAYMENT_TOKEN_IS_TOKEN0
            ? SQRT_PRICE_PAYMENT_TOKEN_FIRST
            : SQRT_PRICE_POIC_FIRST;
        (int24 tickLower, int24 tickUpper) = _fullRangeTicks(
            poolKey.tickSpacing
        );

        liquidity = LiquidityAmounts.getLiquidityForAmounts(
            SafeCast.toUint160(sqrtPriceX96),
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            amount0,
            amount1
        );
    }

    function _fullRangeTicks(
        int24 tickSpacing
    ) internal pure returns (int24 tickLower, int24 tickUpper) {
        tickLower = (TickMath.MIN_TICK / tickSpacing) * tickSpacing;
        if (tickLower < TickMath.MIN_TICK) {
            tickLower += tickSpacing;
        }

        tickUpper = (TickMath.MAX_TICK / tickSpacing) * tickSpacing;
        if (tickUpper > TickMath.MAX_TICK) {
            tickUpper -= tickSpacing;
        }
    }

    function _sortedTokenData()
        internal
        view
        returns (address token0, address token1, uint160 sqrtPriceX96)
    {
        if (PAYMENT_TOKEN_IS_TOKEN0) {
            token0 = PAYMENT_TOKEN;
            token1 = address(this);
            sqrtPriceX96 = SQRT_PRICE_PAYMENT_TOKEN_FIRST;
        } else {
            token0 = address(this);
            token1 = PAYMENT_TOKEN;
            sqrtPriceX96 = SQRT_PRICE_POIC_FIRST;
        }
    }

    // -------------------------
    // Getters
    // -------------------------

    /// @notice Returns the maximum mint count
    function maxMintCount() public view returns (uint256) {
        return MAX_MINT_COUNT;
    }

    /// @notice Returns the mint count
    function mintCount() public view returns (uint256) {
        return _mintCount;
    }

    /// @notice Returns the mint amount of the token
    function mintAmount() public view returns (uint256) {
        return MINT_AMOUNT;
    }

    /// @notice Returns the payment seed amount for liquidity
    function paymentSeed() public view returns (uint256) {
        return PAYMENT_SEED;
    }

    /// @notice Returns whether liquidity has been deployed
    function liquidityDeployed() public view returns (bool) {
        return _liquidityDeployed;
    }
}
