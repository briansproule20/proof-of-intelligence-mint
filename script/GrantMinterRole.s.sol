// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {POIC} from "../src/POICv2.sol";

contract GrantMinterRole is Script {
    function run() external {
        address poicAddress = vm.envAddress("POIC_ADDRESS");
        address serverWallet = 0x32d831cd322EB5DF497A1A640175a874b5372BF8;

        console.log("=== Granting MINTER_ROLE ===");
        console.log("POIC Contract:", poicAddress);
        console.log("Server Wallet:", serverWallet);

        vm.startBroadcast();

        POIC poic = POIC(poicAddress);
        bytes32 minterRole = poic.MINTER_ROLE();

        console.log("MINTER_ROLE:", vm.toString(minterRole));

        poic.grantRole(minterRole, serverWallet);

        console.log("\n=== MINTER_ROLE Granted Successfully ===");

        vm.stopBroadcast();
    }
}
