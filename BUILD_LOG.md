# MantleScout Build Log
Last updated: 2026-05-01 04:53 (Phase 5, turn 1)

## Repo Structure (current)
[ASCII tree of files that exist. Tag each leaf:
 [DONE] / [WIP-PHASE-N] / [STUB] / [DEPRECATED]
 mantlescout/
 ├── contracts/
 │   ├── src/WalletRegistry.sol            [DONE]
 │   ├── test/WalletRegistry.t.sol         [DONE]
 │   ├── script/Deploy.s.sol               [DONE]
 │   └── foundry.toml                      [DONE]
 ├── services/
 │   ├── attestor/
 │   │   ├── package.json                  [DONE]
 │   │   ├── tsconfig.json                 [DONE]
 │   │   ├── src/db.ts                     [DONE]
 │   │   ├── src/watcher.ts                [DONE]
 │   │   ├── src/classifier.ts             [DONE]
 │   │   ├── src/backfill.ts               [DONE]
 │   │   ├── src/llm.ts                    [DONE]
 │   │   ├── src/submitter.ts              [DONE]
 │   │   ├── src/__tests__/classifier.test.ts [DONE]
 │   │   ├── src/__tests__/submitter.test.ts  [DONE]
 │   │   └── src/index.ts                  [DONE]
 │   └── telegram-bot/
 │       ├── package.json                  [DONE]
 │       ├── tsconfig.json                 [DONE]
 │       └── src/index.ts                  [DONE]
 ├── apps/web/                             
 │   ├── app/
 │   │   ├── globals.css                   [DONE]
 │   │   ├── layout.tsx                    [DONE]
 │   │   ├── page.tsx                      [DONE]
 │   │   └── wallet/[address]/page.tsx     [DONE]
 │   ├── lib/
 │   │   ├── abi.ts                        [DONE]
 │   │   ├── client.ts                     [DONE]
 │   │   └── constants.ts                  [DONE]
 │   ├── .env.local.example                [DONE]
 │   └── package.json                      [DONE]
 ├── scripts/
 │   └── seed-demo.ts                      [DONE]
 ├── packages/shared/
 │   ├── package.json                      [DONE]
 │   ├── tsconfig.json                     [DONE]
 │   ├── src/index.ts                      [DONE]
 │   ├── src/eip712.ts                     [DONE]
 │   └── src/abi.ts                        [DONE]
 ├── SPEC.md                               [DONE]
 ├── README.md                             [DONE]
 ├── .env.example                          [DONE]
 ├── .gitignore                            [DONE]
 └── package.json                          [DONE]
]

## Locked Technical Decisions
- Solidity: ^0.8.24
- Foundry forge-std: v1.16.x
- viem: ^2.21
- Package manager: npm workspaces
- DB: SQLite via better-sqlite3
- Next.js: 14.2.x
- Target network: Mantle Sepolia (DEX events from Mantle Mainnet)

## Public Interfaces Built
### WalletRegistry.sol
- enum Label { UNKNOWN, SMART_TRADER, PATIENT_ACCUMULATOR, ACTIVE_LP, MEV_BOT, DUMP_PRONE, NEUTRAL }
- struct Attestation { Label label; uint16 score; bytes32 evidenceHash; uint64 timestamp; address attestor; }
- function submitLabel(address wallet, Label label, uint16 score, bytes32 evidenceHash, bytes calldata signature) external
- function setAttestor(address attestor, bool approved) external
- function getLabel(address wallet) external view returns (Attestation memory)
- event LabelSubmitted(...)
- event AttestorChanged(...)

### Frontend Data Fetching
- Leaderboard: publicClient.getLogs('LabelSubmitted') -> deduplicate -> sort by score
- Wallet Page: publicClient.readContract('getLabel')

### Telegram Bot
- Monitors LabelSubmitted events
- Rate limited (2 seconds) message queuing to Telegram
- Slash commands: /status, /lookup <address>

## Test Status
- contracts/test/WalletRegistry.t.sol: 11/11 passing, 100% line coverage
- services/attestor/src/__tests__/classifier.test.ts: 9/9 passing
- services/attestor/src/__tests__/submitter.test.ts: 3/3 passing
- apps/web: builds successfully

## Phase History (append-only)
- Phase 0: SUBMITTED [2026-05-01] — locked SPEC.md, repo skeleton
- Phase 1: SUBMITTED [2026-05-01] — WalletRegistry.sol, tests, deploy script, shared EIP712 & ABI
- Phase 2: SUBMITTED [2026-05-01] — Event Watcher & Heuristic Classifiers, SQLite Schema
- Phase 3: SUBMITTED [2026-05-01] — Attestor Signing & Submission pipeline, LLM generation, Submitter tests
- Phase 4: SUBMITTED [2026-05-01] — Next.js public leaderboard frontend and seed script
- Phase 5: SUBMITTED [2026-05-01] — Telegram bot event watcher and notifier
- Phase 6: SUBMITTED [2026-05-01] — Final README, SUBMISSION.md, env updates, and project handoff
