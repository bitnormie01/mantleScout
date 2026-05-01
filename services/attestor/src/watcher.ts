import { createPublicClient, http, parseAbiItem } from 'viem';
import { mantle } from 'viem/chains';
import pino from 'pino';
import { insertTrade, updateWalletStateTradeCount, updateSyncState, getWalletState, updateWalletClassification, getWalletTrades } from './db';
import { classifyWallet, Trade } from './classifier';

export const logger = pino(pino.destination(1));

const STABLECOINS = [
    '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9'.toLowerCase(), // USDC
    '0x201eba5cc46d216ce6dc03f6a759e8e766e956ae'.toLowerCase(), // USDT
    '0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8'.toLowerCase(), // WMNT
];

function isStablecoin(address: string) {
    return STABLECOINS.includes(address.toLowerCase());
}

export function determineDirection(tokenIn: string, tokenOut: string) {
    if (isStablecoin(tokenOut)) return 'sell';
    if (isStablecoin(tokenIn)) return 'buy';
    return 'buy';
}

export const publicClient = createPublicClient({
    chain: mantle,
    transport: http(process.env.DEX_RPC_URL || 'https://rpc.mantle.xyz')
});

export const MOE_SWAP_EVENT = parseAbiItem('event Swap(address indexed sender, address indexed to, uint24 id, bytes32 amountsIn, bytes32 amountsOut)');
export const AGNI_SWAP_EVENT = parseAbiItem('event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)');

export async function processNewTrade(trade: Omit<Trade, 'id'>) {
    logger.info({ wallet: trade.wallet, tx_hash: trade.tx_hash, dex: trade.dex, block_number: trade.block_number }, 'New swap event');
    
    insertTrade.run(
        trade.wallet, trade.tx_hash, trade.block_number, trade.timestamp, trade.dex,
        trade.token_in, trade.token_out, trade.amount_in, trade.amount_out, trade.direction
    );
    
    const now = trade.timestamp;
    updateWalletStateTradeCount.run(trade.wallet, now);
    
    const state = getWalletState.get(trade.wallet) as any;
    const isNewState = !state || state.trade_count === 1;
    const lastClassified = state?.last_classified_at || 0;
    const tradeCount = state?.trade_count || 1;
    
    if (tradeCount % 5 === 0 || (now - lastClassified) >= 24 * 3600) {
        const trades = getWalletTrades.all(trade.wallet) as Trade[];
        const result = classifyWallet(trade.wallet, trades, now);
        
        let pending = 0;
        if (result.label !== 0 && result.label !== state?.current_label) {
            pending = 1;
        }
        
        updateWalletClassification.run(
            result.label.toString(),
            result.score,
            JSON.stringify(result.evidence),
            pending,
            now,
            trade.wallet
        );
        
        logger.info({ wallet: trade.wallet, label: result.label, pending }, 'Wallet classified');
    }
}

export async function watchEvents() {
    let reconnectDelay = 1000;
    
    async function loop() {
        try {
            publicClient.watchEvent({
                event: MOE_SWAP_EVENT,
                onLogs: async (logs) => {
                    for (const log of logs) {
                        try {
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
                            updateSyncState.run('merchant_moe', Number(log.blockNumber));
                        } catch(e) {
                            logger.error(e, 'Error processing Moe log');
                        }
                    }
                }
            });

            publicClient.watchEvent({
                event: AGNI_SWAP_EVENT,
                onLogs: async (logs) => {
                    for (const log of logs) {
                        try {
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
                            updateSyncState.run('agni', Number(log.blockNumber));
                        } catch(e) {
                            logger.error(e, 'Error processing Agni log');
                        }
                    }
                }
            });
            
            reconnectDelay = 1000;
        } catch(error) {
            logger.error(error, `Watcher crashed, reconnecting in ${reconnectDelay}ms`);
            setTimeout(loop, reconnectDelay);
            reconnectDelay = Math.min(30000, reconnectDelay * 2);
        }
    }
    
    loop();
}
