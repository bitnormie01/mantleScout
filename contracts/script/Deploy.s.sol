// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/WalletRegistry.sol";

contract DeployWalletRegistry is Script {
    function run() external {
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        
        vm.startBroadcast();
        WalletRegistry registry = new WalletRegistry(attestor);
        vm.stopBroadcast();
        
        console.log("WalletRegistry deployed at:", address(registry));
    }
}
