import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiConfig } from 'wagmi';
import { wagmiConfig } from './config/wagmi';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ArbitrationPage from './pages/ArbitrationPage';
import RegisterProviderPage from './pages/RegisterProviderPage';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#4ade80',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          <Router>
            <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50">
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/arbitration" element={<ArbitrationPage />} />
                  <Route path="/register-provider" element={<RegisterProviderPage />} />
                </Routes>
              </Layout>
            </div>
          </Router>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default App;