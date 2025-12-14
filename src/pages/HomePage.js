import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

const HomePage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();

  return (
    <div className="fade-in">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-emerald-800 mb-4">
          Optimistic Arbitration Protocol
        </h1>
        <p className="text-xl text-emerald-600 max-w-3xl mx-auto">
          A decentralized oracle system where providers submit data with economic security
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-700 mb-2">Secure</h3>
          <p className="text-emerald-600">
            Economic security through staking and slashing mechanisms
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-700 mb-2">Fast</h3>
          <p className="text-emerald-600">
            Optimistic resolution with dispute periods for challenging incorrect data
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-emerald-700 mb-2">Decentralized</h3>
          <p className="text-emerald-600">
            Multiple independent providers ensure data integrity and censorship resistance
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-8 border border-emerald-100 mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="md:w-2/3 mb-6 md:mb-0">
            <h2 className="text-2xl font-bold text-emerald-800 mb-3">
              Ready to Participate?
            </h2>
            <p className="text-emerald-600 mb-4">
              Become a data provider and start earning oracle fees by participating in arbitration markets.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/arbitration')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                View Markets
              </button>
              <button
                onClick={() => navigate('/register-provider')}
                className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Become a Provider
              </button>
            </div>
          </div>
          <div className="w-40 h-40 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">OA</span>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="text-center">
          <div className="inline-block p-8 bg-white rounded-xl shadow-lg border border-emerald-100">
            <h3 className="text-xl font-semibold text-emerald-700 mb-3">
              Connect Your Wallet to Get Started
            </h3>
            <p className="text-emerald-600 mb-4">
              Connect your Ethereum wallet to view markets and register as a provider
            </p>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;