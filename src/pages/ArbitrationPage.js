import React, { useState } from 'react';
import MarketCard from '../components/MarketCard';
import Pagination from '../components/Pagination';
import { useAccount } from 'wagmi';

// 模拟数据
const mockMarkets = Array.from({ length: 45 }, (_, i) => ({
  id: i + 1,
  title: `Market #${i + 1}: ETH Price Prediction`,
  description: `Will ETH price be above $${(2500 + i * 50).toLocaleString()} by Dec 31?`,
  oracleFee: `${(0.1 + i * 0.01).toFixed(2)} ETH`,
  requiredThreshold: 3 + Math.floor(i / 10),
  totalStake: `${(100 + i * 20).toFixed(2)} ETH`,
  expiryTime: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
  status: i % 4 === 0 ? 'Active' : i % 4 === 1 ? 'Pending' : i % 4 === 2 ? 'Resolved' : 'Disputed',
  isProviderRegistered: i % 3 === 0,
}));

const ArbitrationPage = () => {
  const { isConnected } = useAccount();
  const [currentPage, setCurrentPage] = useState(1);
  const marketsPerPage = 10;

  // 计算分页
  const indexOfLastMarket = currentPage * marketsPerPage;
  const indexOfFirstMarket = indexOfLastMarket - marketsPerPage;
  const currentMarkets = mockMarkets.slice(indexOfFirstMarket, indexOfLastMarket);
  const totalPages = Math.ceil(mockMarkets.length / marketsPerPage);

  return (
    <div className="fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-800 mb-2">
          Arbitration Markets
        </h1>
        <p className="text-emerald-600">
          Participate in optimistic arbitration by providing data for various markets
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-emerald-700 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-emerald-600 mb-4">
            Please connect your wallet to view and participate in arbitration markets
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {currentMarkets.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />

          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
            <h3 className="text-lg font-semibold text-emerald-700 mb-4">
              💡 How Arbitration Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-emerald-600 font-medium mb-2">1. Market Creation</div>
                <p className="text-sm text-emerald-700">Markets are created with specific conditions and oracle fees</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-emerald-600 font-medium mb-2">2. Provider Participation</div>
                <p className="text-sm text-emerald-700">Registered providers submit data and vote on outcomes</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-emerald-600 font-medium mb-2">3. Resolution</div>
                <p className="text-sm text-emerald-700">Markets resolve based on provider consensus and threshold</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ArbitrationPage;