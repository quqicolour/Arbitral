import React from 'react';
import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

const Layout = ({ children }) => {
  const { isConnected } = useAccount();

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
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Become a Provider
                </Link>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {isConnected && (
                <div className="hidden sm:block px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  Provider Status: <span className="font-semibold">Active</span>
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