import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { mantleSepoliaTestnet } from 'viem/chains';

const WALLET_REGISTRY_ABI = [
    {
        "type": "function",
        "name": "getLabel",
        "inputs": [
            {
                "name": "wallet",
                "type": "address",
                "internalType": "address"
            }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct WalletRegistry.Attestation",
                "components": [
                    { "name": "label", "type": "uint8", "internalType": "enum WalletRegistry.Label" },
                    { "name": "score", "type": "uint16", "internalType": "uint16" },
                    { "name": "evidenceHash", "type": "bytes32", "internalType": "bytes32" },
                    { "name": "timestamp", "type": "uint64", "internalType": "uint64" },
                    { "name": "attestor", "type": "address", "internalType": "address" }
                ]
            }
        ],
        "stateMutability": "view"
    }
];

const LABEL_DISPLAY: Record<number, string> = {
    0: '❓ Unknown',
    1: '🧠 Smart Trader',
    2: '🐢 Patient Accumulator',
    3: '💧 Active LP',
    4: '🤖 MEV Bot',
    5: '📉 Dump Prone',
    6: '⚖️ Neutral'
};

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const rpcUrl = process.env.RPC_URL || 'https://rpc.sepolia.mantle.xyz';
const registryAddress = process.env.REGISTRY_ADDRESS as `0x${string}`;

if (!token || !chatId || !registryAddress) {
    console.error('Missing required env variables (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, REGISTRY_ADDRESS)');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const client = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(rpcUrl)
});

const messageQueue: string[] = [];
let isSending = false;

async function processQueue() {
    if (isSending || messageQueue.length === 0) return;
    isSending = true;

    while (messageQueue.length > 0) {
        const msg = messageQueue.shift();
        if (msg) {
            try {
                // Ignore TS error for disable_web_page_preview if any, but it should be standard
                await bot.sendMessage(chatId!, msg, { parse_mode: 'HTML', disable_web_page_preview: true });
            } catch (err) {
                console.error('Failed to send message:', err);
            }
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    
    isSending = false;
}

function queueMessage(msg: string) {
    messageQueue.push(msg);
    processQueue();
}

const startTime = new Date().toUTCString();
let alertsSent = 0;

let unwatch: (() => void) | undefined;
let reconnectDelay = 1000;

function startWatching() {
    console.log('Starting event watcher...');
    
    try {
        unwatch = client.watchEvent({
            address: registryAddress,
            event: parseAbiItem('event LabelSubmitted(address indexed wallet, uint8 label, uint16 score, bytes32 evidenceHash, address indexed attestor)'),
            onLogs: (logs) => {
                for (const log of logs) {
                    const { wallet, label, score, evidenceHash } = log.args;
                    if (!wallet || label === undefined || score === undefined) continue;
                    
                    alertsSent++;
                    
                    const labelName = LABEL_DISPLAY[label] || `Unknown (${label})`;
                    
                    const message = `
🔍 <b>New Wallet Classification</b>
📊 Label: ${labelName}
💯 Score: ${score} / 1000
👛 Wallet: <code>${wallet}</code>
🔗 <a href="https://explorer.sepolia.mantle.xyz/address/${wallet}">Explorer</a>
🏷 Evidence Hash: <code>${evidenceHash}</code>
⏰ Block: ${log.blockNumber}
                    `.trim();
                    
                    queueMessage(message);
                }
            },
            onError: (err) => {
                console.error('Watcher error:', err);
                if (unwatch) unwatch();
                setTimeout(startWatching, reconnectDelay);
                reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            }
        });
        reconnectDelay = 1000;
        console.log('Watcher active.');
    } catch (err) {
        console.error('Failed to start watcher:', err);
        setTimeout(startWatching, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    }
}

bot.onText(/\/status/, (msg) => {
    const text = `
🤖 <b>MantleScout Bot Status</b>
📡 Watching: <code>${registryAddress}</code>
🔗 Network: Mantle Sepolia
✅ Active since: ${startTime}
📊 Alerts sent: ${alertsSent}
    `.trim();
    bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
});

bot.onText(/\/lookup (.+)/, async (msg, match) => {
    const address = match ? match[1] : null;
    if (!address || !address.startsWith('0x')) {
        bot.sendMessage(msg.chat.id, 'Invalid address format. Usage: /lookup 0x...');
        return;
    }

    try {
        const attestation = await client.readContract({
            address: registryAddress,
            abi: WALLET_REGISTRY_ABI,
            functionName: 'getLabel',
            args: [address as `0x${string}`]
        }) as any;

        if (!attestation || Number(attestation.timestamp) === 0) {
            bot.sendMessage(msg.chat.id, '❌ No attestation found for this address.');
            return;
        }

        const labelName = LABEL_DISPLAY[attestation.label] || `Unknown (${attestation.label})`;
        // Format to YYYY-MM-DD HH:MM
        const lastUpdated = new Date(Number(attestation.timestamp) * 1000).toISOString().replace('T', ' ').substring(0, 16);

        const text = `
🔍 <b>Wallet Lookup:</b> <code>${address}</code>
📊 Label: ${labelName}
💯 Score: ${attestation.score} / 1000
⏰ Last Updated: ${lastUpdated}
        `.trim();
        bot.sendMessage(msg.chat.id, text, { parse_mode: 'HTML' });
    } catch (err) {
        console.error('Lookup failed:', err);
        bot.sendMessage(msg.chat.id, '❌ Failed to fetch attestation.');
    }
});

startWatching();

process.on('SIGINT', () => {
    console.log('Bot shutting down');
    if (unwatch) unwatch();
    bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Bot shutting down');
    if (unwatch) unwatch();
    bot.stopPolling();
    process.exit(0);
});
