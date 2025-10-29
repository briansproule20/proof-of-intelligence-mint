// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/POICv2.sol";

contract DeployPOICv2 is Script {
    // Uniswap V2 Router on Base mainnet
    address constant UNISWAP_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24;

    function run() external {
        // Get deployment private key and mint signer address from env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address mintSigner = vm.envAddress("MINT_SIGNER_ADDRESS");

        console.log("Deploying POICv2 with:");
        console.log("  Deployer:", vm.addr(deployerPrivateKey));
        console.log("  Mint Signer:", mintSigner);
        console.log("  Uniswap Router:", UNISWAP_ROUTER);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy POICv2
        POICv2 poic = new POICv2(mintSigner, UNISWAP_ROUTER);

        console.log("\nPOICv2 deployed at:", address(poic));
        console.log("Max Supply:", poic.MAX_SUPPLY() / 10**18, "tokens");
        console.log("Mint Fee:", poic.MINT_FEE(), "wei");

        vm.stopBroadcast();

        // Output for frontend
        console.log("\n=== Update .env.local ===");
        console.log("NEXT_PUBLIC_CONTRACT_ADDRESS=%s", address(poic));
    }
}
