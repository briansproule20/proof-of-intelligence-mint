// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/POIC.sol";

/**
 * @title DeployScript
 * @notice Deployment script for POIC token
 * @dev Run with: forge script script/Deploy.s.sol:DeployScript --rpc-url <RPC_URL> --broadcast
 */
contract DeployScript is Script {
    function run() external {
        // Read the mint signer address from environment variable
        address mintSigner = vm.envAddress("MINT_SIGNER_ADDRESS");

        // Get the deployer private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy POIC contract
        POIC poic = new POIC(mintSigner);

        console.log("POIC deployed to:", address(poic));
        console.log("Mint signer set to:", mintSigner);
        console.log("Owner:", poic.owner());
        console.log("Token name:", poic.name());
        console.log("Token symbol:", poic.symbol());

        vm.stopBroadcast();
    }
}
