import { describe, it, expect } from 'vitest';
import { 
    Trade, 
    Label, 
    classifyMevBot, 
    classifyPatientAccumulator, 
    classifySmartTrader, 
    classifyDumpProne, 
    classifyWallet 
} from '../classifier';

const now = 1000000000;

function createTrade(overrides: Partial<Trade>): Trade {
    return {
        wallet: '0x123',
        tx_hash: '0x' + Math.random().toString(16).slice(2),
        block_number: 1,
        timestamp: now,
        dex: 'merchant_moe',
        token_in: '0xtokenin',
        token_out: '0xtokenout',
        amount_in: '1000000', // 1 unit assuming 6 decimals
        amount_out: '1000000',
        direction: 'buy',
        ...overrides
    };
}

describe('Classifier Rules', () => {
    describe('MEV_BOT', () => {
        it('identifies MEV_BOT: >=20 swaps in 24h, median gap < 60s', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 25; i++) {
                trades.push(createTrade({ timestamp: now - 24 * 3600 + i * 30 })); // 30s gap
            }
            const result = classifyMevBot(trades, now);
            expect(result?.label).toBe(Label.MEV_BOT);
        });

        it('does not identify MEV_BOT if median gap >= 60s', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 25; i++) {
                trades.push(createTrade({ timestamp: now - 24 * 3600 + i * 120 })); // 120s gap
            }
            const result = classifyMevBot(trades, now);
            expect(result).toBeNull();
        });
    });

    describe('SMART_TRADER', () => {
        it('identifies SMART_TRADER: >=10 closed trades, PnL > $500, win rate >= 55%', () => {
            const trades: Trade[] = [];
            // 12 winning trades (buy at 1M, sell at 200M -> PnL is 199M = 199 * 1e6 = 199 "USD")
            // Wait, amount_in for buy = cost. amount_out for sell = revenue.
            // 1e6 is $1.
            // To get $600 PnL, we need 600e6 difference.
            for (let i = 0; i < 12; i++) {
                // Buy token_out (TokenA) with token_in (USD)
                trades.push(createTrade({ 
                    direction: 'buy', token_in: 'USD', token_out: `Token${i}`, amount_in: '1000000' // $1 cost
                }));
                // Sell token_in (TokenA) for token_out (USD)
                trades.push(createTrade({ 
                    direction: 'sell', token_in: `Token${i}`, token_out: 'USD', amount_out: '101000000' // $101 revenue (100 profit)
                }));
            }
            // total PnL = 12 * $100 = $1200 > $500. closed trades = 12 >= 10. win rate = 12/12 = 100% >= 55%
            const result = classifySmartTrader(trades, now);
            expect(result?.label).toBe(Label.SMART_TRADER);
        });

        it('does not identify SMART_TRADER: < 10 trades', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 8; i++) {
                trades.push(createTrade({ direction: 'buy', token_in: 'USD', token_out: `Token${i}`, amount_in: '1000000' }));
                trades.push(createTrade({ direction: 'sell', token_in: `Token${i}`, token_out: 'USD', amount_out: '101000000' }));
            }
            const result = classifySmartTrader(trades, now);
            expect(result).toBeNull();
        });
    });

    describe('PATIENT_ACCUMULATOR', () => {
        it('identifies PATIENT_ACCUMULATOR: >=5 buys, 0 sells, >7 days hold', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 6; i++) {
                // First buy 10 days ago
                trades.push(createTrade({ direction: 'buy', timestamp: now - 10 * 24 * 3600 + i * 10 }));
            }
            const result = classifyPatientAccumulator(trades, now);
            expect(result?.label).toBe(Label.PATIENT_ACCUMULATOR);
        });

        it('does not identify PATIENT_ACCUMULATOR: >=1 sells', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 5; i++) {
                trades.push(createTrade({ direction: 'buy', timestamp: now - 10 * 24 * 3600 + i * 10 }));
            }
            trades.push(createTrade({ direction: 'sell', timestamp: now }));
            const result = classifyPatientAccumulator(trades, now);
            expect(result).toBeNull();
        });
    });

    describe('DUMP_PRONE', () => {
        it('identifies DUMP_PRONE: >=2 occurrences of selling >50% within 4h', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 3; i++) {
                // Buy TokenX
                trades.push(createTrade({ 
                    direction: 'buy', token_out: `Token${i}`, amount_out: '1000', timestamp: now - 5 * 3600 + i * 10 
                }));
                // Sell TokenX > 50% (600) within 4h (timestamp diff 2 hours)
                trades.push(createTrade({ 
                    direction: 'sell', token_in: `Token${i}`, amount_in: '600', timestamp: now - 3 * 3600 + i * 10
                }));
            }
            const result = classifyDumpProne(trades, now);
            expect(result?.label).toBe(Label.DUMP_PRONE);
        });
    });

    describe('Orchestrator classifyWallet', () => {
        it('returns NEUTRAL if >=3 trades but no rules match', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 5; i++) {
                trades.push(createTrade({ direction: 'buy', timestamp: now - i * 3600 })); // gap 1h, doesn't match MevBot. sells=0 but hold < 7d.
            }
            const result = classifyWallet('0x123', trades, now);
            expect(result.label).toBe(Label.NEUTRAL);
        });

        it('returns UNKNOWN if <3 trades', () => {
            const trades: Trade[] = [];
            for (let i = 0; i < 2; i++) {
                trades.push(createTrade({ direction: 'buy' }));
            }
            const result = classifyWallet('0x123', trades, now);
            expect(result.label).toBe(Label.UNKNOWN);
        });
    });
});
