// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {POIC} from "../src/POICv2.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";

contract DeployPOICv2 is Script {
    function run() external returns (POIC) {
        // Constructor parameters
        uint256 mintAmount = 5000 * 10**18; // 5,000 POIC per mint
        uint256 maxMintCount = 100_000; // 100k mints trigger LP deployment

        // Uniswap v4 addresses on Base mainnet
        IPoolManager poolManager = IPoolManager(0x498581fF718922c3f8e6A244956aF099B2652b2b);
        IPositionManager positionManager = IPositionManager(0x7C5f5A4bBd8fD63184577525326123B519429bDc);
        IAllowanceTransfer permit2 = IAllowanceTransfer(0x000000000022D473030F116dDEE9F6B43aC78BA3);

        // USDC on Base
        address paymentToken = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;

        // LP pool parameters
        uint256 paymentSeed = 100_000 * 10**6; // 100k USDC (6 decimals)
        uint256 poolSeedAmount = 500_000_000 * 10**18; // 500M POIC (18 decimals)

        console.log("=== POICv2 Deployment Configuration ===");
        console.log("Mint Amount:", mintAmount);
        console.log("Max Mint Count:", maxMintCount);
        console.log("Payment Seed (USDC):", paymentSeed);
        console.log("Pool Seed Amount (POIC):", poolSeedAmount);
        console.log("PoolManager:", address(poolManager));
        console.log("PositionManager:", address(positionManager));
        console.log("Permit2:", address(permit2));
        console.log("Payment Token (USDC):", paymentToken);

        vm.startBroadcast();

        POIC poic = new POIC(
            mintAmount,
            maxMintCount,
            poolManager,
            positionManager,
            permit2,
            paymentToken,
            paymentSeed,
            poolSeedAmount
        );

        console.log("\n=== Deployment Successful ===");
        console.log("POIC Address:", address(poic));
        console.log("Deployer:", msg.sender);

        vm.stopBroadcast();

        return poic;
    }
}
