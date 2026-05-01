import Link from 'next/link';
import { publicClient, REGISTRY_ADDRESS, DEPLOY_BLOCK } from '../lib/client';
import { LABEL_NAMES, LABEL_COLORS } from '../lib/constants';
import { parseAbiItem } from 'viem';
import { formatDistanceToNow } from 'date-fns';
import { Activity, ShieldAlert, Users, Target } from 'lucide-react';

export const revalidate = 30;

export default async function LeaderboardPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let logs: any[] = [];
    try {
        logs = await publicClient.getLogs({
            address: REGISTRY_ADDRESS,
            event: parseAbiItem('event LabelSubmitted(address indexed wallet, uint8 label, uint16 score, bytes32 evidenceHash, address indexed attestor)'),
            fromBlock: DEPLOY_BLOCK,
            toBlock: 'latest'
        });
    } catch (e) {
        console.error("Failed to fetch logs:", e);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestPerWallet = new Map<string, any>();
    for (const log of logs) {
        const wallet = log.args.wallet?.toLowerCase();
        if (!wallet) continue;
        
        const existing = latestPerWallet.get(wallet);
        if (!existing || log.blockNumber > existing.blockNumber || (log.blockNumber === existing.blockNumber && log.logIndex > existing.logIndex)) {
            latestPerWallet.set(wallet, log);
        }
    }

    const uniqueWallets = Array.from(latestPerWallet.values());
    
    const attestations = await Promise.all(uniqueWallets.map(async (log) => {
        let timestamp = 0;
        try {
            const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
            timestamp = Number(block.timestamp) * 1000;
        } catch {}
        
        return {
            wallet: log.args.wallet as string,
            label: Number(log.args.label),
            score: Number(log.args.score),
            timestamp,
        };
    }));

    attestations.sort((a, b) => b.score - a.score);
    const top50 = attestations.slice(0, 50);

    const stats = {
        total: logs.length,
        unique: uniqueWallets.length,
    };

    return (
        <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
            <header className="mb-12 text-center">
                <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-emerald-400 to-blue-500 text-transparent bg-clip-text">MantleScout</h1>
                <p className="text-lg md:text-xl text-gray-400">Smart Money Intelligence for Mantle Network</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-[var(--card)] p-6 rounded-xl border border-gray-800 shadow-lg">
                    <div className="flex items-center gap-4 mb-2">
                        <Activity className="text-emerald-400" />
                        <h3 className="text-gray-400 font-medium">Total Attestations</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-[var(--card)] p-6 rounded-xl border border-gray-800 shadow-lg">
                    <div className="flex items-center gap-4 mb-2">
                        <Users className="text-blue-400" />
                        <h3 className="text-gray-400 font-medium">Unique Wallets</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats.unique}</p>
                </div>
                <div className="bg-[var(--card)] p-6 rounded-xl border border-gray-800 shadow-lg">
                    <div className="flex items-center gap-4 mb-2">
                        <Target className="text-violet-400" />
                        <h3 className="text-gray-400 font-medium">Top Label</h3>
                    </div>
                    <p className="text-3xl font-bold">{
                        attestations.length > 0 ? 
                            LABEL_NAMES[attestations[0].label] : 'N/A'
                    }</p>
                </div>
            </div>

            <div className="bg-[var(--card)] rounded-xl border border-gray-800 shadow-2xl overflow-hidden">
                {attestations.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="inline-block p-4 rounded-full bg-emerald-500/10 mb-4 animate-pulse">
                            <ShieldAlert className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">No attestations yet</h2>
                        <p className="text-gray-400">The attestor service is analyzing wallet activity on Mantle Network.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="border-b border-gray-800 bg-black/20 text-gray-400 text-sm">
                                    <th className="p-4 font-medium">Rank</th>
                                    <th className="p-4 font-medium">Wallet</th>
                                    <th className="p-4 font-medium">Classification</th>
                                    <th className="p-4 font-medium">Score</th>
                                    <th className="p-4 font-medium">Last Active</th>
                                </tr>
                            </thead>
                            <tbody>
                                {top50.map((att, i) => (
                                    <tr key={att.wallet} className="border-b border-gray-800/50 hover:bg-[var(--card-hover)] transition-colors">
                                        <td className="p-4 text-gray-400">#{i + 1}</td>
                                        <td className="p-4">
                                            <Link href={`/wallet/${att.wallet}`} className="font-mono text-emerald-400 hover:text-emerald-300 transition-colors">
                                                {att.wallet.slice(0,6)}...{att.wallet.slice(-4)}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <span 
                                                className="px-3 py-1 rounded-full text-sm font-medium bg-opacity-10 border whitespace-nowrap"
                                                style={{ 
                                                    color: LABEL_COLORS[att.label], 
                                                    backgroundColor: `${LABEL_COLORS[att.label]}15`,
                                                    borderColor: `${LABEL_COLORS[att.label]}30`
                                                }}
                                            >
                                                {LABEL_NAMES[att.label]}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <span className="font-bold w-8">{att.score}</span>
                                                <div className="hidden sm:block w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full rounded-full"
                                                        style={{ 
                                                            width: `${(att.score / 1000) * 100}%`,
                                                            backgroundColor: LABEL_COLORS[att.label]
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm whitespace-nowrap">
                                            {att.timestamp ? formatDistanceToNow(att.timestamp, { addSuffix: true }) : 'Unknown'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </main>
    );
}
