import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';

const MarketCard = ({ market }) => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteData, setVoteData] = useState({
    dataSource: '',
    randomNumber: Math.floor(Math.random() * 10000),
    vote: 'yes',
  });

  const handleVoteSubmit = (e) => {
    e.preventDefault();
    // 这里应该调用合约接口
    console.log('Submitting vote:', voteData);
    setShowVoteModal(false);
    alert('Vote submitted successfully!');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Resolved': return 'bg-blue-100 text-blue-800';
      case 'Disputed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="card-hover bg-white rounded-xl shadow-lg p-6 border border-emerald-100 hover:border-emerald-300">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(market.status)}`}>
              {market.status}
            </span>
            {market.isProviderRegistered && (
              <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                Registered
              </span>
            )}
          </div>
          <span className="text-sm text-emerald-600">ID: {market.id}</span>
        </div>

        <h3 className="text-xl font-semibold text-emerald-800 mb-2">
          {market.title}
        </h3>
        <p className="text-emerald-600 mb-4">
          {market.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="text-sm text-emerald-600 font-medium mb-1">Oracle Fee</div>
            <div className="text-lg font-semibold text-emerald-700">{market.oracleFee}</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="text-sm text-emerald-600 font-medium mb-1">Threshold</div>
            <div className="text-lg font-semibold text-emerald-700">{market.requiredThreshold} providers</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="text-sm text-emerald-600 font-medium mb-1">Total Stake</div>
            <div className="text-lg font-semibold text-emerald-700">{market.totalStake}</div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="text-sm text-emerald-600 font-medium mb-1">Expires</div>
            <div className="text-lg font-semibold text-emerald-700">
              {new Date(market.expiryTime).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate(`/market/${market.id}`)}
            className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center"
          >
            View Details
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {isConnected && market.isProviderRegistered && market.status === 'Active' && (
            <button
              onClick={() => setShowVoteModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Submit Vote
            </button>
          )}
        </div>
      </div>

      {/* 投票模态框 */}
      {showVoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full fade-in">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-emerald-800">Submit Vote</h3>
                <button
                  onClick={() => setShowVoteModal(false)}
                  className="text-emerald-600 hover:text-emerald-800"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleVoteSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-2">
                      Data Source URL
                    </label>
                    <input
                      type="text"
                      value={voteData.dataSource}
                      onChange={(e) => setVoteData({...voteData, dataSource: e.target.value})}
                      placeholder="https://api.example.com/data"
                      className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-2">
                      Random Number (for commitment)
                    </label>
                    <input
                      type="number"
                      value={voteData.randomNumber}
                      onChange={(e) => setVoteData({...voteData, randomNumber: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-emerald-700 mb-2">
                      Your Vote
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setVoteData({...voteData, vote: 'yes'})}
                        className={`p-4 rounded-lg border-2 ${voteData.vote === 'yes' 
                          ? 'border-green-500 bg-green-50 text-green-700' 
                          : 'border-emerald-200 text-emerald-600 hover:border-emerald-300'}`}
                      >
                        <div className="font-semibold">Yes</div>
                        <div className="text-sm">Agree with proposition</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setVoteData({...voteData, vote: 'no'})}
                        className={`p-4 rounded-lg border-2 ${voteData.vote === 'no' 
                          ? 'border-red-500 bg-red-50 text-red-700' 
                          : 'border-emerald-200 text-emerald-600 hover:border-emerald-300'}`}
                      >
                        <div className="font-semibold">No</div>
                        <div className="text-sm">Disagree with proposition</div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowVoteModal(false)}
                    className="px-4 py-2 text-emerald-600 hover:text-emerald-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Submit Vote
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarketCard;