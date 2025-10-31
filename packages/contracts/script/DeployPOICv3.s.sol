// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/POIC.sol";

contract DeployPOICv3 is Script {
    // Base Mainnet addresses
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

    // Uniswap V4 addresses on Base Mainnet (verified December 2024)
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;

    function run() external {
        // Get deployment private key and server wallet address from env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address serverWallet = vm.envAddress("SERVER_WALLET_ADDRESS");

        console.log("Deploying POIC v3 with:");
        console.log("  Deployer:", vm.addr(deployerPrivateKey));
        console.log("  Server Wallet (Minter):", serverWallet);
        console.log("  USDC:", USDC_BASE);
        console.log("  Pool Manager:", POOL_MANAGER);
        console.log("  Position Manager:", POSITION_MANAGER);
        console.log("  Permit2:", PERMIT2);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy POIC v3
        POIC poic = new POIC(
            POOL_MANAGER,
            POSITION_MANAGER,
            PERMIT2
        );

        console.log("\nPOIC v3 deployed at:", address(poic));
        console.log("Mint Amount:", poic.MINT_AMOUNT() / 10**18, "POIC");
        console.log("Max Mint Count:", poic.MAX_MINT_COUNT());
        console.log("Payment Required:", poic.PAYMENT_SEED() / 10**6, "USDC");
        console.log("Pool Seed Amount:", poic.POOL_SEED_AMOUNT() / 10**18, "POIC");

        // Grant MINTER_ROLE to server wallet
        bytes32 minterRole = poic.MINTER_ROLE();
        poic.grantRole(minterRole, serverWallet);
        console.log("\nMINTER_ROLE granted to:", serverWallet);

        vm.stopBroadcast();

        // Output for frontend and post-deployment steps
        console.log("\n=== Update .env.local ===");
        console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=%s", address(poic));
        console.log("\n=== Post-Deployment Steps ===");
        console.log("1. Transfer 100,000 USDC to contract:", address(poic));
        console.log("2. (Optional) Set LP guard hook: poic.setLpGuardHook(hookAddress)");
        console.log("3. Verify contract on Basescan");
        console.log("\n=== Verification Command ===");
        console.log("forge verify-contract %s src/POIC.sol:POIC --chain-id 8453 \\", address(poic));
        console.log("  --constructor-args $(cast abi-encode \"constructor(address,address,address)\" %s %s %s)",
            POOL_MANAGER, POSITION_MANAGER, PERMIT2);
    }
}
