export enum Label {
    UNKNOWN = 0,
    SMART_TRADER = 1,
    PATIENT_ACCUMULATOR = 2,
    ACTIVE_LP = 3,
    MEV_BOT = 4,
    DUMP_PRONE = 5,
    NEUTRAL = 6
}

export interface Trade {
    id?: number;
    wallet: string;
    tx_hash: string;
    block_number: number;
    timestamp: number;
    dex: string;
    token_in: string;
    token_out: string;
    amount_in: string;
    amount_out: string;
    direction: string; // 'buy' or 'sell'
}

export interface ClassificationResult {
    label: Label;
    score: number;
    evidence: any;
}

const THIRTY_DAYS_SEC = 30 * 24 * 60 * 60;
const TWENTY_FOUR_HOURS_SEC = 24 * 60 * 60;
const FOUR_HOURS_SEC = 4 * 60 * 60;
const SEVEN_DAYS_SEC = 7 * 24 * 60 * 60;

export function classifyMevBot(trades: Trade[], now: number): ClassificationResult | null {
    const recentTrades = trades.filter(t => (now - t.timestamp) <= TWENTY_FOUR_HOURS_SEC);
    if (recentTrades.length >= 20) {
        recentTrades.sort((a, b) => a.timestamp - b.timestamp);
        const gaps: number[] = [];
        for (let i = 1; i < recentTrades.length; i++) {
            gaps.push(recentTrades[i].timestamp - recentTrades[i - 1].timestamp);
        }
        gaps.sort((a, b) => a - b);
        const medianGap = gaps[Math.floor(gaps.length / 2)];
        if (medianGap < 60) {
            const score = Math.min(1000, 500 + recentTrades.length * 5);
            return {
                label: Label.MEV_BOT,
                score,
                evidence: { swapCount24h: recentTrades.length, medianGapSec: medianGap }
            };
        }
    }
    return null;
}

export function classifySmartTrader(trades: Trade[], now: number): ClassificationResult | null {
    const recentTrades = trades.filter(t => (now - t.timestamp) <= THIRTY_DAYS_SEC);
    
    const buysByToken: Record<string, Trade[]> = {};
    const sellsByToken: Record<string, Trade[]> = {};
    
    for (const t of recentTrades) {
        if (t.direction === 'buy') {
            if (!buysByToken[t.token_out]) buysByToken[t.token_out] = [];
            buysByToken[t.token_out].push(t);
        } else {
            if (!sellsByToken[t.token_in]) sellsByToken[t.token_in] = [];
            sellsByToken[t.token_in].push(t);
        }
    }
    
    let closedTradesCount = 0;
    let winningTradesCount = 0;
    let totalRealizedPnL = 0;
    
    const parseAmount = (a: string) => Number(BigInt(a)) / 1e6;
    
    for (const token of Object.keys(buysByToken)) {
        if (sellsByToken[token]) {
            const buys = buysByToken[token];
            const sells = sellsByToken[token];
            
            const matchedCount = Math.min(buys.length, sells.length);
            closedTradesCount += matchedCount;
            
            let cost = 0;
            for (let i=0; i<matchedCount; i++) cost += parseAmount(buys[i].amount_in);
            
            let revenue = 0;
            for (let i=0; i<matchedCount; i++) revenue += parseAmount(sells[i].amount_out);
            
            const pnl = revenue - cost;
            totalRealizedPnL += pnl;
            if (pnl > 0) winningTradesCount += matchedCount;
        }
    }
    
    const winRate = closedTradesCount > 0 ? winningTradesCount / closedTradesCount : 0;
    
    if (closedTradesCount >= 10 && totalRealizedPnL > 500 && winRate >= 0.55) {
        return {
            label: Label.SMART_TRADER,
            score: Math.min(1000, 600 + Math.floor(totalRealizedPnL / 100)),
            evidence: { closedTrades: closedTradesCount, realizedPnl: totalRealizedPnL, winRate }
        };
    }
    
    return null;
}

export function classifyPatientAccumulator(trades: Trade[], now: number): ClassificationResult | null {
    const recentTrades = trades.filter(t => (now - t.timestamp) <= THIRTY_DAYS_SEC);
    let buys = 0;
    let sells = 0;
    let firstBuyTime = Number.MAX_SAFE_INTEGER;
    
    for (const t of recentTrades) {
        if (t.direction === 'buy') {
            buys++;
            if (t.timestamp < firstBuyTime) firstBuyTime = t.timestamp;
        } else {
            sells++;
        }
    }
    
    if (buys >= 5 && sells === 0) {
        const holdDuration = now - firstBuyTime;
        if (holdDuration > SEVEN_DAYS_SEC) {
            return {
                label: Label.PATIENT_ACCUMULATOR,
                score: Math.min(1000, 500 + buys * 10),
                evidence: { buys, sells, holdDurationSecs: holdDuration }
            };
        }
    }
    return null;
}

export function classifyDumpProne(trades: Trade[], now: number): ClassificationResult | null {
    const recentTrades = trades.filter(t => (now - t.timestamp) <= THIRTY_DAYS_SEC);
    let dumpCount = 0;
    
    for (let i = 0; i < recentTrades.length; i++) {
        const t = recentTrades[i];
        if (t.direction === 'sell') {
            const recentBuys = recentTrades.filter(b => 
                b.direction === 'buy' && 
                b.token_out === t.token_in && 
                b.timestamp < t.timestamp && 
                (t.timestamp - b.timestamp) <= FOUR_HOURS_SEC
            );
            
            if (recentBuys.length > 0) {
                let totalReceived = BigInt(0);
                for (const b of recentBuys) totalReceived += BigInt(b.amount_out);
                
                const sellAmt = BigInt(t.amount_in);
                if (sellAmt * 2n > totalReceived) {
                    dumpCount++;
                }
            }
        }
    }
    
    if (dumpCount >= 2) {
        return {
            label: Label.DUMP_PRONE,
            score: Math.min(1000, 500 + dumpCount * 50),
            evidence: { dumpCount }
        };
    }
    
    return null;
}

export function classifyActiveLP(trades: Trade[], now: number): ClassificationResult | null {
    // TODO: requires Merchant Moe LB and Agni V3 position tracking. 
    return null;
}

export function classifyWallet(wallet: string, trades: Trade[], now: number): ClassificationResult {
    if (trades.length < 3) {
        return { label: Label.UNKNOWN, score: 0, evidence: { reason: "Insufficient trades" } };
    }
    
    const mev = classifyMevBot(trades, now);
    if (mev) return mev;
    
    const smart = classifySmartTrader(trades, now);
    if (smart) return smart;
    
    const dump = classifyDumpProne(trades, now);
    if (dump) return dump;
    
    const patient = classifyPatientAccumulator(trades, now);
    if (patient) return patient;
    
    const lp = classifyActiveLP(trades, now);
    if (lp) return lp;
    
    return {
        label: Label.NEUTRAL,
        score: 500,
        evidence: { swapCount: trades.length, note: "Did not match heuristics" }
    };
}
