import 'dotenv/config';
import { createWalletClient, createPublicClient, http, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepoliaTestnet } from 'viem/chains';
import { signAttestation, encodeEvidenceHash, getDomain, WALLET_REGISTRY_ABI } from '../packages/shared/src/index';

const REGISTRY = (process.env.REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_WALLET_REGISTRY_ADDRESS) as Hex;
const pkey = process.env.ATTESTOR_PRIVATE_KEY as Hex;

if (!REGISTRY || !pkey) {
    console.error("Missing REGISTRY_ADDRESS or ATTESTOR_PRIVATE_KEY env vars");
    process.exit(1);
}

const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
const account = privateKeyToAccount(pkey);
const walletClient = createWalletClient({
    account,
    chain: mantleSepoliaTestnet,
    transport: http(rpcUrl)
});
const publicClient = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(rpcUrl)
});

const labelsToSeed = [
    { label: 1, score: 850 },
    { label: 1, score: 780 },
    { label: 1, score: 720 },
    { label: 2, score: 650 },
    { label: 2, score: 580 },
    { label: 4, score: 900 },
    { label: 4, score: 820 },
    { label: 5, score: 700 },
    { label: 5, score: 550 },
    { label: 6, score: 500 },
    { label: 6, score: 480 },
    { label: 6, score: 460 },
    { label: 3, score: 600 }
];

async function main() {
    console.log('Starting seed script...');
    for (const item of labelsToSeed) {
        const wallet = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}` as Hex;
        const evidence = { rationale: 'Mock demo data for hackathon FCFS requirement', mock: true };
        const evidenceHash = encodeEvidenceHash(evidence);
        
        const domain = getDomain(mantleSepoliaTestnet.id, REGISTRY);
        const signature = await signAttestation({
            wallet, label: item.label, score: item.score, evidenceHash
        }, pkey, domain);
        
        try {
            const tx = await walletClient.writeContract({
                address: REGISTRY,
                abi: WALLET_REGISTRY_ABI,
                functionName: 'submitLabel',
                args: [wallet, item.label, item.score, evidenceHash, signature],
                gas: BigInt(200000)
            });
            console.log(`Seeded ${wallet} as ${item.label} with score ${item.score}. Tx: ${tx}`);
            // Wait for tx to be mined before sending next (prevents nonce collisions)
            await publicClient.waitForTransactionReceipt({ hash: tx });
            console.log(`  ✓ Confirmed`);
        } catch (e: any) {
            console.error(`Failed to seed ${wallet}:`, e.shortMessage || e.message);
        }
    }
    console.log('Seeding complete.');
}

main().catch(console.error);
