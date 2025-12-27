import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import EchoOptimisticOracleABI from '../abis/EchoOptimisticOracle.json';
import { EchoOptimisticOracleAddress as StaticOracle } from '../address.js';
import { useEthers } from '../context/EthersContext.jsx';

const Layout = ({ children }) => {
  const { isConnected, address } = useAccount();
  const { provider, addresses } = useEthers();
  const echoRead = useMemo(() => {
    if (!provider) return null;
    const oracleAddr = addresses?.EchoOptimisticOracle || StaticOracle;
    if (!oracleAddr) return null;
    return new ethers.Contract(oracleAddr, EchoOptimisticOracleABI.abi, provider);
  }, [provider, addresses]);
  const [providerStatus, setProviderStatus] = useState('');
  useEffect(() => {
    (async () => {
      if (!isConnected || !echoRead || !address) {
        setProviderStatus('');
        return;
      }
      try {
        const info = await echoRead.dataProviderInfo(address);
        if (!info?.valid) {
          setProviderStatus('Not Registered');
          return;
        }
        let cooling = 7 * 24 * 3600;
        try {
          const c = await echoRead.coolingTime();
          cooling = Number(c) || cooling;
        } catch { }
        const latest = Number(info.latestSubmitTime || 0);
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec > latest + cooling) {
          setProviderStatus('Active');
        } else {
          setProviderStatus('Cooling');
        }
      } catch {
        setProviderStatus('Unknown');
      }
    })();
  }, [isConnected, echoRead, address]);

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-emerald-100 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">OA</span>
                </div>
                <span className="text-xl font-bold text-emerald-700">
                  Optimistic Arbitration
                </span>
              </Link>

              <div className="hidden md:flex items-center space-x-6">
                <Link
                  to="/"
                  className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/arbitration"
                  className="text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
                >
                  Arbitration Markets
                </Link>
                <Link
                  to="/register-provider"
                  className="px-4 py-2 rounded-full font-medium bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all"
                >
                  Become a Provider
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isConnected && providerStatus && (
                <div className="hidden sm:block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  Provider Status: <span className="font-semibold">{providerStatus}</span>
                </div>
              )}
              <ConnectButton
                showBalance={false}
                chainStatus="icon"
                accountStatus="full"
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="mt-auto border-t border-emerald-100 bg-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-emerald-600 font-medium">
                Optimistic Arbitration Protocol
              </span>
            </div>
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} All rights reserved
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
