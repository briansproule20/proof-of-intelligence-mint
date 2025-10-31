// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/POIC.sol";

contract POICTest is Test {
    POIC public poic;

    address public owner;
    address public mintSigner;
    address public user;

    uint256 public mintSignerPrivateKey;
    uint256 public userPrivateKey;

    bytes32 public constant MINT_PERMIT_TYPEHASH =
        keccak256("MintPermit(address to,uint256 amount,uint256 nonce,uint256 deadline)");

    function setUp() public {
        owner = address(this);

        // Generate private keys for testing
        mintSignerPrivateKey = 0x1234;
        userPrivateKey = 0x5678;

        mintSigner = vm.addr(mintSignerPrivateKey);
        user = vm.addr(userPrivateKey);

        // Deploy contract
        poic = new POIC(mintSigner);
    }

    function testDeployment() public view {
        assertEq(poic.name(), "Proof of Intelligence Coin");
        assertEq(poic.symbol(), "POIC");
        assertEq(poic.owner(), owner);
        assertEq(poic.mintSigner(), mintSigner);
    }

    function testMintWithValidSignature() public {
        uint256 amount = 1 ether;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        // Create signature
        bytes memory signature = createMintSignature(
            user,
            amount,
            nonce,
            deadline,
            mintSignerPrivateKey
        );

        // Mint tokens
        vm.prank(user);
        poic.mintWithSig(user, amount, nonce, deadline, signature);

        // Verify balance
        assertEq(poic.balanceOf(user), amount);

        // Verify nonce is used
        assertTrue(poic.isNonceUsed(user, nonce));
    }

    function testMintWithInvalidSignature() public {
        uint256 amount = 1 ether;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        // Create signature with wrong signer
        uint256 wrongPrivateKey = 0x9999;
        bytes memory signature = createMintSignature(
            user,
            amount,
            nonce,
            deadline,
            wrongPrivateKey
        );

        // Attempt to mint should fail
        vm.prank(user);
        vm.expectRevert(POIC.InvalidSignature.selector);
        poic.mintWithSig(user, amount, nonce, deadline, signature);
    }

    function testMintWithExpiredSignature() public {
        uint256 amount = 1 ether;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp - 1; // Past deadline

        bytes memory signature = createMintSignature(
            user,
            amount,
            nonce,
            deadline,
            mintSignerPrivateKey
        );

        vm.prank(user);
        vm.expectRevert(POIC.SignatureExpired.selector);
        poic.mintWithSig(user, amount, nonce, deadline, signature);
    }

    function testCannotReuseNonce() public {
        uint256 amount = 1 ether;
        uint256 nonce = 0;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = createMintSignature(
            user,
            amount,
            nonce,
            deadline,
            mintSignerPrivateKey
        );

        // First mint succeeds
        vm.prank(user);
        poic.mintWithSig(user, amount, nonce, deadline, signature);

        // Second mint with same nonce fails
        vm.prank(user);
        vm.expectRevert(POIC.NonceAlreadyUsed.selector);
        poic.mintWithSig(user, amount, nonce, deadline, signature);
    }

    function testSetMintSigner() public {
        address newSigner = address(0x123);

        poic.setMintSigner(newSigner);
        assertEq(poic.mintSigner(), newSigner);
    }

    function testSetMintSignerZeroAddress() public {
        vm.expectRevert(POIC.ZeroAddress.selector);
        poic.setMintSigner(address(0));
    }

    function testSetMintSignerOnlyOwner() public {
        address newSigner = address(0x123);

        vm.prank(user);
        vm.expectRevert();
        poic.setMintSigner(newSigner);
    }

    function testDomainSeparator() public view {
        bytes32 separator = poic.domainSeparator();
        assertTrue(separator != bytes32(0));
    }

    // Helper function to create valid mint signatures
    function createMintSignature(
        address to,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        uint256 privateKey
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(MINT_PERMIT_TYPEHASH, to, amount, nonce, deadline)
        );

        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                poic.domainSeparator(),
                structHash
            )
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
