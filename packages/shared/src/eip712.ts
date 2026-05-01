import { keccak256, toHex, stringToHex, Hex, signTypedData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const getDomain = (chainId: number, verifyingContract: Hex) => ({
    name: 'MantleScout',
    version: '1',
    chainId,
    verifyingContract
});

export const types = {
    Attestation: [
        { name: 'wallet', type: 'address' },
        { name: 'label', type: 'uint8' },
        { name: 'score', type: 'uint16' },
        { name: 'evidenceHash', type: 'bytes32' }
    ]
} as const;

export const encodeEvidenceHash = (evidenceJson: any): Hex => {
    return keccak256(stringToHex(JSON.stringify(evidenceJson)));
};

export async function signAttestation(
    params: { wallet: Hex; label: number; score: number; evidenceHash: Hex },
    privateKey: Hex,
    domain: { name: string; version: string; chainId: number; verifyingContract: Hex }
): Promise<Hex> {
    const account = privateKeyToAccount(privateKey);
    return account.signTypedData({
        domain,
        types,
        primaryType: 'Attestation',
        message: {
            wallet: params.wallet,
            label: params.label,
            score: params.score,
            evidenceHash: params.evidenceHash
        }
    });
}
