import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const wagmiConfig = getDefaultConfig({
  appName: 'Optimistic Arbitration',
  projectId: process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID, // 从 WalletConnect Cloud 获取
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http(process.env.REACT_APP_RPC_URL),
  },
  ssr: true,
});
