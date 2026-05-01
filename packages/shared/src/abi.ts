export const WALLET_REGISTRY_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "initialAttestor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approvedAttestors",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLabel",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct WalletRegistry.Attestation",
        "components": [
          {
            "name": "label",
            "type": "uint8",
            "internalType": "enum WalletRegistry.Label"
          },
          {
            "name": "score",
            "type": "uint16",
            "internalType": "uint16"
          },
          {
            "name": "evidenceHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "timestamp",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "attestor",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "labels",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "label",
        "type": "uint8",
        "internalType": "enum WalletRegistry.Label"
      },
      {
        "name": "score",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "timestamp",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "attestor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setAttestor",
    "inputs": [
      {
        "name": "attestor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitLabel",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "label",
        "type": "uint8",
        "internalType": "enum WalletRegistry.Label"
      },
      {
        "name": "score",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "AttestorChanged",
    "inputs": [
      {
        "name": "attestor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LabelSubmitted",
    "inputs": [
      {
        "name": "wallet",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "label",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum WalletRegistry.Label"
      },
      {
        "name": "score",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "evidenceHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "attestor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidLabel",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidScore",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnauthorizedAttestor",
    "inputs": []
  }
] as const;