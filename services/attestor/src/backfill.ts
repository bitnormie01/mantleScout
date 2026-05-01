import { publicClient, MOE_SWAP_EVENT, AGNI_SWAP_EVENT, processNewTrade, logger } from './watcher';
import { updateSyncState } from './db';

export async function runBackfill(blocks: number) {
    const latestBlock = await publicClient.getBlockNumber();
    const fromBlock = latestBlock - BigInt(blocks);
    
    logger.info(`Starting backfill from block ${fromBlock} to ${latestBlock}`);
    
    const CHUNK_SIZE = 2000n;
    
    for (let i = fromBlock; i < latestBlock; i += CHUNK_SIZE) {
        const toBlock = i + CHUNK_SIZE - 1n > latestBlock ? latestBlock : i + CHUNK_SIZE - 1n;
        
        try {
            const moeLogs = await publicClient.getLogs({
                event: MOE_SWAP_EVENT,
                fromBlock: i,
                toBlock: toBlock
            });
            
            const agniLogs = await publicClient.getLogs({
                event: AGNI_SWAP_EVENT,
                fromBlock: i,
                toBlock: toBlock
            });
            
            for (const log of moeLogs) {
                const block = await publicClient.getBlock({ blockHash: log.blockHash });
                await processNewTrade({
                    wallet: log.args.sender?.toLowerCase() || log.address.toLowerCase(),
                    tx_hash: log.transactionHash,
                    block_number: Number(log.blockNumber),
                    timestamp: Number(block.timestamp),
                    dex: 'merchant_moe',
                    token_in: 'unknown_in',
                    token_out: 'unknown_out',
                    amount_in: log.args.amountsIn?.toString() || '0',
                    amount_out: log.args.amountsOut?.toString() || '0',
                    direction: 'buy'
                });
            }
            
            for (const log of agniLogs) {
                const block = await publicClient.getBlock({ blockHash: log.blockHash });
                await processNewTrade({
                    wallet: log.args.sender?.toLowerCase() || log.address.toLowerCase(),
                    tx_hash: log.transactionHash,
                    block_number: Number(log.blockNumber),
                    timestamp: Number(block.timestamp),
                    dex: 'agni',
                    token_in: 'unknown_in',
                    token_out: 'unknown_out',
                    amount_in: log.args.amount0?.toString() || '0',
                    amount_out: log.args.amount1?.toString() || '0',
                    direction: 'sell'
                });
            }
            
            updateSyncState.run('merchant_moe', Number(toBlock));
            updateSyncState.run('agni', Number(toBlock));
            
            logger.info(`Backfilled blocks ${i}-${toBlock}, found ${moeLogs.length + agniLogs.length} swaps`);
        } catch (e) {
            logger.error(e, `Error in backfill chunk ${i}-${toBlock}`);
        }
    }
}
