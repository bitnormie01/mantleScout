import { createWalletClient, http, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mantleSepoliaTestnet } from 'viem/chains';
import { getWalletsPendingSubmission, insertSubmission, getRecentSubmission, clearPendingSubmission, updateWalletClassification } from './db';
import { generateRationale } from './llm';
import { logger } from './watcher';
import { signAttestation, encodeEvidenceHash, getDomain, WALLET_REGISTRY_ABI } from '@mantlescout/shared';

const REGISTRY = process.env.REGISTRY_ADDRESS as Hex;
const account = privateKeyToAccount((process.env.ATTESTOR_PRIVATE_KEY as Hex) || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');

export const walletClient = createWalletClient({
    account,
    chain: mantleSepoliaTestnet,
    transport: http(process.env.RPC_URL)
});

const SIXTY_MINS_SEC = 60 * 60;

export async function processPendingSubmissions() {
    const pendingWallets = getWalletsPendingSubmission.all() as any[];
    
    for (const state of pendingWallets) {
        const now = Math.floor(Date.now() / 1000);
        
        // Idempotency check
        const recent = getRecentSubmission.get(state.wallet, state.current_label, state.current_score, now - SIXTY_MINS_SEC) as any;
        if (recent && recent.status !== 'failed') {
            logger.info({ wallet: state.wallet }, 'Skipping duplicate submission within 60 mins');
            clearPendingSubmission.run(state.wallet);
            continue;
        }

        let originalEvidence = {};
        try {
            originalEvidence = JSON.parse(state.evidence_json || '{}');
        } catch (e) {}

        const rationale = await generateRationale(originalEvidence, state.current_label);
        
        const evidence = {
            ...originalEvidence,
            rationale
        };
        const evidenceHash = encodeEvidenceHash(evidence);
        
        const labelInt = parseInt(state.current_label, 10);
        
        try {
            const domain = getDomain(mantleSepoliaTestnet.id, REGISTRY);
            const signature = await signAttestation({
                wallet: state.wallet as Hex,
                label: labelInt,
                score: state.current_score,
                evidenceHash
            }, (process.env.ATTESTOR_PRIVATE_KEY as Hex) || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', domain);

            logger.info(`Submitting attestation for ${state.wallet} label=${state.current_label} score=${state.current_score}`);

            let attempts = 0;
            let success = false;
            let txHash = '';
            
            while (attempts < 3 && !success) {
                try {
                    txHash = await walletClient.writeContract({
                        address: REGISTRY,
                        abi: WALLET_REGISTRY_ABI,
                        functionName: 'submitLabel',
                        args: [state.wallet, labelInt, state.current_score, evidenceHash, signature],
                        gas: 200000n
                    });
                    success = true;
                } catch (err) {
                    attempts++;
                    if (attempts >= 3) throw err;
                    await new Promise(r => setTimeout(r, Math.pow(2, attempts-1) * 1000));
                }
            }

            insertSubmission.run(state.wallet, state.current_label, state.current_score, txHash, now, 'confirmed');
            
            updateWalletClassification.run(state.current_label, state.current_score, JSON.stringify(evidence), 0, now, state.wallet);

        } catch (err) {
            logger.error(err, `Submission failed for ${state.wallet}`);
            insertSubmission.run(state.wallet, state.current_label, state.current_score, null, now, 'failed');
        }
    }
}

export function startSubmitterPoll() {
    setInterval(async () => {
        try {
            await processPendingSubmissions();
        } catch (err) {
            logger.error(err, 'Error in submitter poll');
        }
    }, 30000);
}
