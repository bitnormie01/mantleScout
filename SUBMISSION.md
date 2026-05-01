# DoraHacks BUIDL Submission

## Project Name
MantleScout

## Short Description (≤200 chars)
AI-powered smart money tracking for Mantle Network. Classifies wallet behavior using heuristics + DeepSeek LLM, writes EIP-712 attestations on-chain.

## Long Description
MantleScout is a comprehensive, AI-powered smart-money tracking and on-chain attestation system built exclusively for the Mantle Network ecosystem. By continuously monitoring decentralized exchange (DEX) swap events on Mantle Mainnet—such as Agni Finance and Merchant Moe—MantleScout aggregates trading behaviors and passes them through a sophisticated heuristic classification engine to identify actionable wallet profiles like Smart Traders, Patient Accumulators, and MEV Bots. 

To bring a human-readable, qualitative edge to these raw quantitative heuristics, MantleScout integrates with the DGrid AI Gateway using the DeepSeek model. This AI integration analyzes the raw trade evidence and generates a concise, insightful rationale explaining exactly *why* a particular wallet received its classification. This combined heuristic-AI evidence is then hashed and securely signed using EIP-712 off-chain.

Finally, the attestations are pushed to an immutable, fully verified `WalletRegistry` smart contract deployed on Mantle Sepolia. The ecosystem is fully viewable via a highly responsive, visually stunning Next.js 14 frontend leaderboard and supported by real-time alerts pushed through a dedicated Telegram bot.

## Deployed Contract Address
0x5C44B0C511664bebF5EF2BD7B10DD46Ceb109Bcd

## Network
Mantle Sepolia Testnet (Chain ID: 5003)

## GitHub Repository
[URL TBD]

## Frontend URL
[URL TBD after Vercel deploy]

## Demo Video URL
[URL TBD — screen recording with voiceover, ≥2 minutes]

## Team
0xjaadu (solo)

## Track
Turing Test — 20 Project Deployment Award (FCFS)

## AI Integration Details
- Provider: DGrid AI Gateway (https://api.dgrid.ai/v1)
- Model: deepseek/deepseek-chat
- Purpose: Generates natural language rationale for wallet classifications
- Integration: Called via openai SDK, rationale stored as part of evidence hash

## Tech Stack
Foundry, TypeScript, viem, Next.js 14, better-sqlite3, DGrid/DeepSeek, Telegram Bot API
