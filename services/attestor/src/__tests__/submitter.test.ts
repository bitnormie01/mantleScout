import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPendingSubmissions } from '../submitter';
import { db } from '../db';
import * as llm from '../llm';
import { walletClient } from '../submitter';

vi.mock('../llm', () => ({
    generateRationale: vi.fn()
}));

vi.mock('../watcher', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
    }
}));

walletClient.writeContract = vi.fn().mockResolvedValue('0xmocktxhash');

process.env.REGISTRY_ADDRESS = '0x5C44B0C511664bebF5EF2BD7B10DD46Ceb109Bcd';

describe('Submitter Pipeline', () => {
    beforeEach(() => {
        db.exec('DELETE FROM wallet_state');
        db.exec('DELETE FROM submissions');
        vi.clearAllMocks();
    });

    it('processes pending submission successfully', async () => {
        db.prepare(`
            INSERT INTO wallet_state (wallet, current_label, current_score, evidence_json, pending_submission, last_classified_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('0x1111111111111111111111111111111111111111', '1', 850, '{"foo":"bar"}', 1, Math.floor(Date.now() / 1000));

        vi.mocked(llm.generateRationale).mockResolvedValue('Test rationale');

        await processPendingSubmissions();

        expect(llm.generateRationale).toHaveBeenCalledWith({ foo: 'bar' }, '1');
        expect(walletClient.writeContract).toHaveBeenCalledTimes(1);
        
        const state = db.prepare('SELECT pending_submission FROM wallet_state WHERE wallet = ?').get('0x1111111111111111111111111111111111111111') as any;
        expect(state.pending_submission).toBe(0);

        const sub = db.prepare('SELECT * FROM submissions WHERE wallet = ?').get('0x1111111111111111111111111111111111111111') as any;
        expect(sub.status).toBe('confirmed');
        expect(sub.tx_hash).toBe('0xmocktxhash');
    });

    it('skips duplicate submission within 60 mins', async () => {
        const now = Math.floor(Date.now() / 1000);
        db.prepare(`
            INSERT INTO wallet_state (wallet, current_label, current_score, pending_submission, last_classified_at)
            VALUES (?, ?, ?, ?, ?)
        `).run('0x1111111111111111111111111111111111111111', '1', 850, 1, now);

        db.prepare(`
            INSERT INTO submissions (wallet, label, score, tx_hash, submitted_at, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('0x1111111111111111111111111111111111111111', '1', 850, '0xtx', now - 100, 'confirmed');

        await processPendingSubmissions();

        expect(llm.generateRationale).not.toHaveBeenCalled();
        expect(walletClient.writeContract).not.toHaveBeenCalled();
        const state = db.prepare('SELECT pending_submission FROM wallet_state WHERE wallet = ?').get('0x1111111111111111111111111111111111111111') as any;
        expect(state.pending_submission).toBe(0);
    });

    it('proceeds even if LLM fails and returns empty rationale', async () => {
        db.prepare(`
            INSERT INTO wallet_state (wallet, current_label, current_score, evidence_json, pending_submission, last_classified_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('0x1111111111111111111111111111111111111111', '1', 850, '{"foo":"bar"}', 1, Math.floor(Date.now() / 1000));

        vi.mocked(llm.generateRationale).mockResolvedValue('');

        await processPendingSubmissions();

        expect(walletClient.writeContract).toHaveBeenCalledTimes(1);
        const evidence = JSON.parse((db.prepare('SELECT evidence_json FROM wallet_state WHERE wallet = ?').get('0x1111111111111111111111111111111111111111') as any).evidence_json);
        expect(evidence.rationale).toBe('');
    });
});
