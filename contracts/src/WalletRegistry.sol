// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract WalletRegistry {
    enum Label { UNKNOWN, SMART_TRADER, PATIENT_ACCUMULATOR, ACTIVE_LP, MEV_BOT, DUMP_PRONE, NEUTRAL }

    struct Attestation {
        Label label;
        uint16 score;
        bytes32 evidenceHash;
        uint64 timestamp;
        address attestor;
    }

    mapping(address => Attestation) public labels;
    mapping(address => bool) public approvedAttestors;
    address public owner;

    event LabelSubmitted(address indexed wallet, Label label, uint16 score, bytes32 evidenceHash, address indexed attestor);
    event AttestorChanged(address indexed attestor, bool approved);

    error UnauthorizedAttestor();
    error InvalidScore();
    error InvalidLabel();
    error NotOwner();
    error InvalidSignature();

    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant ATTESTATION_TYPEHASH = keccak256("Attestation(address wallet,uint8 label,uint16 score,bytes32 evidenceHash)");
    bytes32 private immutable DOMAIN_SEPARATOR;

    constructor(address initialAttestor) {
        owner = msg.sender;
        approvedAttestors[initialAttestor] = true;
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("MantleScout")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setAttestor(address attestor, bool approved) external onlyOwner {
        approvedAttestors[attestor] = approved;
        emit AttestorChanged(attestor, approved);
    }

    /// @notice Submits a new label for a wallet. Later attestations intentionally OVERWRITE earlier ones for the same wallet.
    function submitLabel(
        address wallet, 
        Label label, 
        uint16 score, 
        bytes32 evidenceHash, 
        bytes calldata signature
    ) external {
        if (score > 1000) revert InvalidScore();
        if (label == Label.UNKNOWN) revert InvalidLabel();

        bytes32 structHash = keccak256(
            abi.encode(
                ATTESTATION_TYPEHASH,
                wallet,
                uint8(label),
                score,
                evidenceHash
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));
        
        address signer = recoverSigner(digest, signature);
        
        if (!approvedAttestors[signer]) revert UnauthorizedAttestor();

        labels[wallet] = Attestation({
            label: label,
            score: score,
            evidenceHash: evidenceHash,
            timestamp: uint64(block.timestamp),
            attestor: signer
        });

        emit LabelSubmitted(wallet, label, score, evidenceHash, signer);
    }

    function getLabel(address wallet) external view returns (Attestation memory) {
        return labels[wallet];
    }

    function recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        if (signature.length != 65) revert InvalidSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) revert InvalidSignature();

        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        
        return signer;
    }
}
