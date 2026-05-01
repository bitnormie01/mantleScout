# 🎬 MantleScout — Demo Video Script (AI Voiceover)

**Target length:** 3:30–4:00 (safely above 2-minute minimum)  
**Format:** Screen recording + AI voiceover (ElevenLabs / similar)  
**AI TTS rate:** ~130 words/min — script is calibrated for this  
**Total voiceover words:** ~430 words  

---

## Pre-Recording Setup Checklist

- [ ] Frontend running: `cd apps/web && npm run dev` (or Vercel URL)
- [ ] Explorer tab open: `https://explorer.sepolia.mantle.xyz/address/0x5C44B0C511664bebF5EF2BD7B10DD46Ceb109Bcd`
- [ ] Telegram bot running: `npx tsx services/telegram-bot/src/index.ts`
- [ ] Telegram app open with bot chat
- [ ] Code editor open with project files
- [ ] Close all unrelated tabs and notifications

---

## SCENE 1: Introduction (0:00 – 0:30)

**Screen:** Frontend leaderboard — slowly scroll down the table.

**Voiceover (~45 words):**

> This is MantleScout. An AI-powered smart money intelligence system built for the Mantle Network.
>
> It monitors swap activity on Mantle DEXes, classifies wallets using heuristics and AI, then writes signed attestations directly on-chain.
>
> Let's see how it works.

**Screen action:** Let the leaderboard sit for 3-4 seconds at the end. Slowly scroll.

---

## SCENE 2: Smart Contract on Explorer (0:30 – 1:15)

**Screen:** Switch to Mantle Sepolia Explorer. Show the WalletRegistry contract page.

**Voiceover (~65 words):**

> At the core is our WalletRegistry smart contract, deployed and verified on Mantle Sepolia.

*(pause 4 seconds — scroll down to show transactions)*

> Each transaction here is an on-chain attestation. It includes the wallet address, a classification label, a confidence score, and an evidence hash. Everything is signed using EIP-712.

*(click on one transaction — pause 5 seconds to let viewer read the details)*

> Here you can see the actual submitLabel function call with its arguments.

---

## SCENE 3: Frontend Leaderboard & Wallet Detail (1:15 – 2:10)

**Screen:** Switch to frontend. Show the leaderboard at `/`.

**Voiceover (~90 words):**

> The frontend reads directly from the smart contract. No backend needed. Pure on-chain data.

*(pause 3 seconds on stats bar)*

> The stats bar shows total attestations and unique wallets tracked.

*(slowly scroll the table — pause 4 seconds)*

> Each wallet has a classification badge. Green for Smart Trader. Red for MEV Bot. Amber for Dump Prone. Blue for Patient Accumulator.

*(click on a wallet address to go to detail page — pause 5 seconds)*

> The detail page shows the full attestation. Classification, score, evidence hash, and the attestor address. Every piece of data is verifiable on the explorer.

---

## SCENE 4: Classification Engine & AI (2:10 – 2:55)

**Screen:** Code editor — open `services/attestor/src/classifier.ts`.

**Voiceover (~80 words):**

> Under the hood, six heuristic rules drive classification. An MEV Bot needs over twenty swaps in twenty-four hours with a median gap under sixty seconds.

*(scroll to show Smart Trader classifier — pause 3 seconds)*

> Smart Traders need at least ten closed trades with a win rate above fifty-five percent.

*(switch to `services/attestor/src/llm.ts` — pause 3 seconds)*

> Once classified, we call the DGrid AI Gateway using the DeepSeek model. It generates a human-readable rationale explaining why the wallet received that label. If the AI fails, the attestation still goes through.

---

## SCENE 5: Telegram Bot (2:55 – 3:25)

**Screen:** Telegram app with bot chat.

**Voiceover (~50 words):**

> MantleScout also includes a Telegram alert bot.

*(type `/status` — wait for response — pause 4 seconds)*

> The status command shows the bot is actively watching the registry contract.

*(type `/lookup 0xabb90f1bd9066c269582b2ce5e43d446c3f6c56a` — wait for response — pause 5 seconds)*

> And lookup lets anyone query a wallet's classification instantly. This one is a Smart Trader with a score of 850.

---

## SCENE 6: Closing (3:25 – 3:50)

**Screen:** Show README.md with the Mermaid architecture diagram, or slowly scroll the project structure.

**Voiceover (~55 words):**

> To recap. DEX events flow into the attestor service. Trades are stored, classified, enriched by AI, signed with EIP-712, and submitted on-chain. The frontend and Telegram bot read independently from the contract.
>
> Twenty-three tests passing. One hundred percent Solidity coverage. Fully open-source. Deployed and verified on Mantle Sepolia.
>
> This is MantleScout.

*(hold on leaderboard or architecture diagram for 3 seconds — end)*

---

## 📋 Screen Timing Reference

| Time | Screen | Voiceover Words | Action |
|------|--------|:---:|--------|
| 0:00 | Frontend leaderboard | 45 | Slow scroll |
| 0:30 | Explorer — contract | 30 | Scroll to transactions |
| 0:50 | Explorer — tx detail | 35 | Click one tx, let it load |
| 1:15 | Frontend — leaderboard | 45 | Stats bar → scroll table |
| 1:40 | Frontend — wallet detail | 45 | Click wallet → show detail |
| 2:10 | Code — classifier.ts | 40 | Scroll through rules |
| 2:30 | Code — llm.ts | 40 | Show DGrid integration |
| 2:55 | Telegram — /status | 20 | Type command, wait |
| 3:05 | Telegram — /lookup | 30 | Type command, wait |
| 3:25 | README / architecture | 55 | Slow scroll, closing |
| 3:50 | End card | 0 | Fade out |

---

## 🎯 FCFS Criteria Covered

| # | Criterion | Shown In |
|---|-----------|----------|
| 1 | Smart contract on Mantle | Scene 2 |
| 2 | Contract verified | Scene 2 — "verified" on Explorer |
| 3 | AI-powered function | Scene 4 — DGrid code |
| 4 | Frontend accessible | Scene 1, 3 |
| 5 | Contract address visible | Scene 2 — in URL bar |
| 6 | Demo video ≥ 2 min | ~3:50 total |
| 7 | Open-source repo | Scene 6 — mentioned |
| 8 | README with setup | Scene 6 — shown |

---

## 💡 AI Voiceover Tips

1. **Generate each scene's voiceover as a separate audio clip** — easier to sync.
2. **Use a calm, professional male voice** — avoid overly energetic TTS styles.
3. **Add 2-3 seconds of silence** between scenes for transitions.
4. **Screen recording first, voiceover second** — record your screen actions, then lay audio over in a video editor.
5. **Speed up slow parts** (like typing Telegram commands) at 1.5x in the editor.
6. **Add subtle background music** (lo-fi or ambient) at 10-15% volume for polish.
