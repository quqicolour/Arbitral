import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia, mantleSepoliaTestnet } from 'wagmi/chains';
import { http } from 'wagmi';

const mantleChain = {
  ...mantleSepoliaTestnet,
  name: 'Mantle Sepolia',
  iconUrl: '/icons/mantle.svg',
  iconBackground: '#0f172a',
};
export const wagmiConfig = getDefaultConfig({
  appName: 'Optimistic Arbitration',
  projectId: (process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || '').trim(),
  chains: [mantleChain, arbitrumSepolia],
  transports: {
    [mantleSepoliaTestnet.id]: http(process.env.REACT_APP_MANTLE_RPC_URL || 'https://rpc.sepolia.mantle.xyz'),
    [arbitrumSepolia.id]: http(process.env.REACT_APP_ARB_RPC_URL || process.env.REACT_APP_RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/demo'),
  },
  ssr: false,
});
