import { createPublicClient, http } from 'viem';
import { mantleSepoliaTestnet } from 'viem/chains';

export const publicClient = createPublicClient({
    chain: mantleSepoliaTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.mantle.xyz')
});

export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_WALLET_REGISTRY_ADDRESS || '0x5C44B0C511664bebF5EF2BD7B10DD46Ceb109Bcd') as `0x${string}`;

// Block at which WalletRegistry was deployed — avoid scanning from block 0
export const DEPLOY_BLOCK = BigInt(38030410);

