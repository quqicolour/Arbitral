import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
// import { WagmiProvider } from 'wagmi'
// import { okxWallet, zerionWallet, walletConnectWallet, safeWallet } from '@rainbow-me/rainbowkit/wallets'
// import { arbitrumSepolia, mantleSepoliaTestnet} from 'wagmi/chains'
// import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

// const cuurent_projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;

// const config = getDefaultConfig({
//   appName: 'Around Arbitral',
//   projectId: cuurent_projectId,
//   chains: [arbitrumSepolia, mantleSepoliaTestnet],
//   wallets: [
//     {
//       groupName: 'Preferred',
//       wallets: [okxWallet, zerionWallet, walletConnectWallet, safeWallet],
//     },
//   ],
//   ssr: false, // true if your dapp uses server-side rendering.
// });
// const queryClient = new QueryClient();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider coolMode = {true}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider> */}
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
