// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/WalletRegistry.sol";

contract WalletRegistryTest is Test {
    WalletRegistry public registry;
    uint256 public attestorPrivateKey = 0xA11CE;
    address public attestor;

    uint256 public nonAttestorPrivateKey = 0xB0B;
    address public nonAttestor;

    bytes32 private DOMAIN_SEPARATOR;

    function setUp() public {
        attestor = vm.addr(attestorPrivateKey);
        nonAttestor = vm.addr(nonAttestorPrivateKey);
        registry = new WalletRegistry(attestor);

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("MantleScout")),
                keccak256(bytes("1")),
                block.chainid,
                address(registry)
            )
        );
    }

    function getSignature(uint256 privateKey, address wallet, WalletRegistry.Label label, uint16 score, bytes32 evidenceHash) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Attestation(address wallet,uint8 label,uint16 score,bytes32 evidenceHash)"),
                wallet,
                uint8(label),
                score,
                evidenceHash
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    // Happy path
    function test_SubmitLabel_Success() public {
        address wallet = address(0x123);
        WalletRegistry.Label label = WalletRegistry.Label.SMART_TRADER;
        uint16 score = 850;
        bytes32 evidenceHash = keccak256("evidence");
        
        bytes memory sig = getSignature(attestorPrivateKey, wallet, label, score, evidenceHash);

        vm.expectEmit(true, true, true, true);
        emit WalletRegistry.LabelSubmitted(wallet, label, score, evidenceHash, attestor);

        registry.submitLabel(wallet, label, score, evidenceHash, sig);

        WalletRegistry.Attestation memory att = registry.getLabel(wallet);
        assertEq(uint(att.label), uint(label));
        assertEq(att.score, score);
        assertEq(att.evidenceHash, evidenceHash);
        assertEq(att.attestor, attestor);
        assertEq(att.timestamp, block.timestamp);
    }

    // Non-attestor revert
    function test_RevertIf_UnauthorizedAttestor() public {
        address wallet = address(0x123);
        bytes memory sig = getSignature(nonAttestorPrivateKey, wallet, WalletRegistry.Label.MEV_BOT, 500, keccak256(""));
        
        vm.expectRevert(WalletRegistry.UnauthorizedAttestor.selector);
        registry.submitLabel(wallet, WalletRegistry.Label.MEV_BOT, 500, keccak256(""), sig);
    }

    // Invalid score revert
    function test_RevertIf_InvalidScore() public {
        address wallet = address(0x123);
        uint16 invalidScore = 1001;
        bytes memory sig = getSignature(attestorPrivateKey, wallet, WalletRegistry.Label.MEV_BOT, invalidScore, keccak256(""));
        
        vm.expectRevert(WalletRegistry.InvalidScore.selector);
        registry.submitLabel(wallet, WalletRegistry.Label.MEV_BOT, invalidScore, keccak256(""), sig);
    }

    // Invalid label revert
    function test_RevertIf_InvalidLabel() public {
        address wallet = address(0x123);
        bytes memory sig = getSignature(attestorPrivateKey, wallet, WalletRegistry.Label.UNKNOWN, 500, keccak256(""));
        
        vm.expectRevert(WalletRegistry.InvalidLabel.selector);
        registry.submitLabel(wallet, WalletRegistry.Label.UNKNOWN, 500, keccak256(""), sig);
    }

    // Overwrite test
    function test_SubmitLabel_OverwritesPrevious() public {
        address wallet = address(0x123);
        bytes32 ev1 = keccak256("ev1");
        bytes memory sig1 = getSignature(attestorPrivateKey, wallet, WalletRegistry.Label.SMART_TRADER, 800, ev1);
        registry.submitLabel(wallet, WalletRegistry.Label.SMART_TRADER, 800, ev1, sig1);
        
        vm.warp(block.timestamp + 10);

        bytes32 ev2 = keccak256("ev2");
        bytes memory sig2 = getSignature(attestorPrivateKey, wallet, WalletRegistry.Label.DUMP_PRONE, 900, ev2);
        registry.submitLabel(wallet, WalletRegistry.Label.DUMP_PRONE, 900, ev2, sig2);

        WalletRegistry.Attestation memory att = registry.getLabel(wallet);
        assertEq(uint(att.label), uint(WalletRegistry.Label.DUMP_PRONE));
        assertEq(att.score, 900);
        assertEq(att.evidenceHash, ev2);
        assertEq(att.timestamp, block.timestamp);
    }

    // setAttestor access control
    function test_RevertIf_NonOwnerSetsAttestor() public {
        vm.prank(nonAttestor);
        vm.expectRevert(WalletRegistry.NotOwner.selector);
        registry.setAttestor(nonAttestor, true);
    }

    // setAttestor event
    function test_SetAttestor_Success() public {
        vm.expectEmit(true, true, true, true);
        emit WalletRegistry.AttestorChanged(nonAttestor, true);
        registry.setAttestor(nonAttestor, true);
        assertTrue(registry.approvedAttestors(nonAttestor));
    }

    // Constructor test
    function test_ConstructorState() public {
        assertEq(registry.owner(), address(this));
        assertTrue(registry.approvedAttestors(attestor));
    }

    // Signature length error
    function test_RevertIf_InvalidSignatureLength() public {
        address wallet = address(0x123);
        bytes memory sig = new bytes(64);
        vm.expectRevert(WalletRegistry.InvalidSignature.selector);
        registry.submitLabel(wallet, WalletRegistry.Label.MEV_BOT, 500, keccak256(""), sig);
    }

    // Invalid signature v
    function test_RevertIf_InvalidSignatureV() public {
        address wallet = address(0x123);
        bytes memory sig = getSignature(attestorPrivateKey, wallet, WalletRegistry.Label.MEV_BOT, 500, keccak256(""));
        sig[64] = bytes1(uint8(2)); // Will become 29, which is invalid
        vm.expectRevert(WalletRegistry.InvalidSignature.selector);
        registry.submitLabel(wallet, WalletRegistry.Label.MEV_BOT, 500, keccak256(""), sig);
    }

    // Invalid signature ecrecover fail
    function test_RevertIf_InvalidSignatureZeroAddr() public {
        address wallet = address(0x123);
        bytes memory sig = getSignature(attestorPrivateKey, wallet, WalletRegistry.Label.MEV_BOT, 500, keccak256(""));
        sig[0] = bytes1(uint8(uint8(sig[0]) ^ 0xff));
        vm.expectRevert(WalletRegistry.UnauthorizedAttestor.selector);
        registry.submitLabel(wallet, WalletRegistry.Label.MEV_BOT, 500, keccak256(""), sig);
    }
}
