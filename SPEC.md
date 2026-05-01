# MantleScout Technical Specification

## Project Overview
*   **Project Name:** MantleScout
*   **Network (Deployment):** Mantle Sepolia Testnet
*   **DEX Event Source Network:** Mantle Mainnet (due to lack of Merchant Moe / Agni Finance testnet deployments)
*   **Stack:** Foundry, TypeScript, Node 20+, viem ^2.21, Next.js 14, Tailwind, better-sqlite3, openai SDK, node-telegram-bot-api

## Verified Network & Contract Details

### Mantle Sepolia Testnet
*   **Chain ID:** `5003` (Hex: `0x138b`)
*   **Public RPC URL:** `https://rpc.sepolia.mantle.xyz` (We use private Alchemy RPC in practice)
*   **Explorer URL:** `https://explorer.sepolia.mantle.xyz`
*   **Faucet URL:** `https://faucet.sepolia.mantle.xyz`
*   **Native Gas Token:** MNT
*   **Explorer Verification API:** `https://explorer.sepolia.mantle.xyz/api`
*   **Verification method:** Blockscout-compatible (Etherscan API standard). Use `forge verify-contract` with `--verifier blockscout --verifier-url https://explorer.sepolia.mantle.xyz/api`
*   **Source:** [Mantle Network Docs](https://docs.mantle.xyz) / RPC providers

### Mantle Mainnet (DEX Event Source)
*   **Chain ID:** `5000`
*   **Public RPC URL:** `https://rpc.mantle.xyz`
*   **Explorer URL:** `https://explorer.mantle.xyz`
*   **Source:** [Mantle Network Docs](https://docs.mantle.xyz)

### Merchant Moe (Mantle Mainnet)
*   **Moe Token:** `0x4515A45337F461A11Ff0FE8aBF3c606AE5dC00c9`
*   **MoeRouter:** `0xeaEE7EE68874218c3558b40063c42B82D3E7232a`
*   **LB Factory:** `0xa6630671775c4EA2743840F9A5016dCf2A104054`
*   **LB Router:** `0x013e138EF6008ae5FDFDE29700e3f2Bc61d21E3a`
*   *Note: Merchant Moe has no official testnet deployment. We monitor Mainnet for events.*
*   **Source:** [Merchant Moe Docs](https://docs.merchantmoe.com/)

### Agni Finance (Mantle Mainnet)
*   **AgniFactory:** `0x25780dc8Fc3cfBD75F33bFDAB65e969b603b2035`
*   **SwapRouter:** `0x319B69888b0d11cEC22caA5034e25FfFBDc88421`
*   **QuoterV2:** `0xc4aaDc921E1cdb66c5300Bc158a313292923C0cb`
*   **NonfungiblePositionManager:** `0x218bf598D1453383e2F4AA7b14fFB9BfB102D637`
*   **WMNT (Wrapped Mantle):** `0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8`
*   *Note: Agni Finance has no testnet deployment. We monitor Mainnet for events.*
*   **Source:** [Agni Protocol SDK — GitHub](https://github.com/agni-protocol/agni-sdk)

## Smart Contract Spec
*   **Contract:** `WalletRegistry.sol`
*   **Labels:** `UNKNOWN`, `SMART_TRADER`, `PATIENT_ACCUMULATOR`, `ACTIVE_LP`, `MEV_BOT`, `DUMP_PRONE`, `NEUTRAL`
*   **Attestation struct:** `{ label, score (0-1000), evidenceHash (bytes32), timestamp (uint64), attestor (address) }`
*   **EIP-712 domain:** name "MantleScout", version "1"
*   **Functions:** `submitLabel`, `setAttestor`, `getLabel`
*   **Events:** `LabelSubmitted`, `AttestorChanged`

## Heuristic Classification Rules (LOCKED)
*   **SMART_TRADER:** ≥10 closed trades in trailing 30d AND realized PnL > $500 AND win rate ≥ 55%
*   **PATIENT_ACCUMULATOR:** ≥5 buys, 0 sells in trailing 30d, average hold > 7 days
*   **ACTIVE_LP:** ≥3 mint/burn events on Merchant Moe LB or Agni V3 positions in trailing 30d
*   **MEV_BOT:** ≥20 swaps in trailing 24h AND median time-between-trades < 60s
*   **DUMP_PRONE:** any swap selling >50% of balance within 4h of receipt, ≥2 occurrences in 30d
*   **NEUTRAL:** any wallet with ≥3 swaps not matching above
*   **UNKNOWN:** default; no attestation written

## LLM Configuration
*   **Provider:** DGrid AI Gateway
*   **Base URL:** `https://api.dgrid.ai/v1`
*   **Model:** `deepseek/deepseek-chat`
*   **Auth:** `DGRID_API_KEY` env var
*   **SDK:** `openai` (npm package)
*   **Format:** OpenAI-compatible chat completions
*   **Purpose:** Generate 1-2 sentence rationale string ONLY; does NOT change label or score
*   **Failure mode:** If LLM call fails, rationale = empty string, submission proceeds

## Spec Additions (Locked)
*   Mantle uses MNT as gas token, not ETH
*   ABI export pipeline: `forge build` → JSON artifact → `packages/shared/abi.ts`
*   Demo seed script required (Phase 4 deliverable)
*   RPC retry logic mandatory (configurable RPC URL, exponential backoff)
*   `.gitignore` must cover: `.env`, `wallet_trades.db`, `broadcast/`, `node_modules/`, `cache/`, `out/`
*   Frontend env vars must be `NEXT_PUBLIC_` prefixed
*   LLM calls wrapped behind `generateRationale(evidence) → string` interface
*   Frontend must render graceful empty state when contract has 0 attestations
