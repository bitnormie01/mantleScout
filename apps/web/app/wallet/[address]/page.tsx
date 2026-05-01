import Link from 'next/link';
import { publicClient, REGISTRY_ADDRESS } from '../../../lib/client';
import { WALLET_REGISTRY_ABI } from '../../../lib/abi';
import { LABEL_NAMES, LABEL_COLORS } from '../../../lib/constants';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';

export const revalidate = 30;

export default async function WalletPage({ params }: { params: { address: string } }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let attestation: any;
    try {
        const res = await publicClient.readContract({
            address: REGISTRY_ADDRESS,
            abi: WALLET_REGISTRY_ABI,
            functionName: 'getLabel',
            args: [params.address as `0x${string}`]
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        attestation = res as any;
    } catch (e) {
        console.error("Failed to read contract", e);
    }

    if (!attestation || attestation.timestamp === BigInt(0)) {
        return (
            <main className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
                <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Leaderboard
                </Link>
                <ShieldCheck className="w-16 h-16 text-gray-600 mb-6" />
                <h1 className="text-3xl font-bold mb-4">No attestation found</h1>
                <p className="text-gray-400">We don&apos;t have any classification data for {params.address} yet.</p>
            </main>
        );
    }

    const timestamp = Number(attestation.timestamp) * 1000;
    const labelId = attestation.label;
    
    return (
        <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 md:mb-12">
                <ArrowLeft className="w-4 h-4" /> Back to Leaderboard
            </Link>

            <header className="mb-12">
                <h1 className="text-2xl md:text-4xl font-mono break-all mb-4">{params.address}</h1>
                <div className="flex flex-wrap items-center gap-4">
                    <a 
                        href={`https://explorer.sepolia.mantle.xyz/address/${params.address}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 bg-blue-400/10 px-4 py-2 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" /> View on Explorer
                    </a>
                </div>
            </header>

            <div className="bg-[var(--card)] rounded-2xl border border-gray-800 shadow-2xl p-6 md:p-8 relative overflow-hidden">
                <div 
                    className="absolute top-0 left-0 w-full h-2"
                    style={{ backgroundColor: LABEL_COLORS[labelId] }}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    <div>
                        <h2 className="text-gray-400 font-medium mb-2 uppercase tracking-wider text-sm">Classification</h2>
                        <div className="mb-8 inline-block px-4 py-2 rounded-xl text-xl font-bold bg-opacity-10 border"
                            style={{ 
                                color: LABEL_COLORS[labelId], 
                                backgroundColor: `${LABEL_COLORS[labelId]}15`,
                                borderColor: `${LABEL_COLORS[labelId]}30`
                            }}
                        >
                            {LABEL_NAMES[labelId]}
                        </div>

                        <h2 className="text-gray-400 font-medium mb-2 uppercase tracking-wider text-sm">Confidence Score</h2>
                        <div className="flex items-end gap-2 mb-8">
                            <span className="text-5xl md:text-6xl font-extrabold" style={{ color: LABEL_COLORS[labelId] }}>
                                {attestation.score}
                            </span>
                            <span className="text-gray-500 text-xl pb-1">/ 1000</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h2 className="text-gray-400 font-medium mb-2 uppercase tracking-wider text-sm">Evidence Hash</h2>
                            <p className="font-mono text-sm break-all text-gray-300">
                                {attestation.evidenceHash}
                            </p>
                        </div>
                        
                        <div>
                            <h2 className="text-gray-400 font-medium mb-2 uppercase tracking-wider text-sm">Attestor</h2>
                            <a 
                                href={`https://explorer.sepolia.mantle.xyz/address/${attestation.attestor}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-sm break-all text-gray-300 hover:text-emerald-400 transition-colors"
                            >
                                {attestation.attestor}
                            </a>
                        </div>
                        
                        <div>
                            <h2 className="text-gray-400 font-medium mb-2 uppercase tracking-wider text-sm">Last Updated</h2>
                            <p className="text-gray-300">{formatDistanceToNow(timestamp, { addSuffix: true })}</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
