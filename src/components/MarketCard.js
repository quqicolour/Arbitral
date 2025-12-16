import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { UseEthersSigner } from "../config/EtherAdapter.js";
import { ethers } from "ethers";

import { EchoOptimisticOracleAddress } from "../Address.js";
import EchoOptimisticOracleABI from "../abis/EchoOptimisticOracle.json";

// 辅助函数：将 BigInt/Wei 格式化
const formatBigNumber = (bn, decimals = 18, fixed = 2) => {
    if (bn === undefined || bn === null) return 'N/A';
    try {
        // 确保 bn 是 BigNumberish，例如 BigInt 或 string
        const num = ethers.formatUnits(bn, decimals);
        return parseFloat(num).toFixed(fixed);
    } catch (e) {
        // console.error("Format Big Number error:", e);
        return bn.toString(); 
    }
};

const MarketCard = ({ market }) => {
    const navigate = useNavigate();
    const { isConnected } = useAccount();
    const signer = UseEthersSigner(); 
    
    const [showVoteModal, setShowVoteModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 完善点 1: 确保 voteData 初始状态的 ID 为 null，并在打开模态框时设置
    const [voteData, setVoteData] = useState({
        id: null,
        dataSource: '',
        // 随机数用于链上提交时的承诺 (commitment)，uint64 在 JS 的安全整数 (53 位) 范围内
        randomNumber: Math.floor(Math.random() * 9007199254740991), 
        vote: null, // 'yes' or 'no'
    });

    const getStatusColor = (statusKey) => {
        switch (statusKey) {
            case 'Active': return 'bg-green-100 text-green-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Resolved': return 'bg-blue-100 text-blue-800';
            case 'Disputed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // 状态推断逻辑 (保持不变)
    const { status, statusColor, isSubmittable } = useMemo(() => {
        const now = Date.now();
        const endTime = market.endTime;
        const result = market.result;
        
        // ... (状态推断逻辑保持不变)
        let currentStatus = 'Pending';
        let color = getStatusColor('Pending');
        let submittable = false; 

        if (endTime && now > endTime) {
            if (result === 1 || result === 2) {
                currentStatus = result === 1 ? 'Resolved (Yes)' : 'Resolved (No)';
                color = getStatusColor('Resolved');
            } else if (result === 3) {
                currentStatus = 'Disputed';
                color = getStatusColor('Disputed');
            } else if (result === 0) {
                currentStatus = 'Voting/Submission';
                color = getStatusColor('Active'); 
                submittable = true;
            }
        } else {
            currentStatus = 'Active';
            color = getStatusColor('Active');
        }

        return { status: currentStatus, statusColor: color, isSubmittable: submittable };
    }, [market.endTime, market.result]);

    const handleOpenVoteModal = () => {
        setVoteData(prev => ({
            ...prev, 
            id: market.id,
            vote: null, 
            randomNumber: Math.floor(Math.random() * 9007199254740991), // 重新生成随机数，确保在安全整数范围内
        }));
        setShowVoteModal(true);
    }
    
    const handleVoteSubmit = async (e) => {
        e.preventDefault();

        if (!voteData.vote || !voteData.dataSource.trim() || !voteData.id) { 
            alert("Please select a vote and provide a data source.");
            return;
        }

        if (!isConnected || !signer || isSubmitting) {
            console.error("Wallet not connected, signer unavailable, or already submitting.");
            return;
        }

        setIsSubmitting(true);

        try {
            const EchoOptimisticOracleContract = new ethers.Contract(
                EchoOptimisticOracleAddress,
                EchoOptimisticOracleABI.abi,
                signer
            );
            
            const isYes = voteData.vote === 'yes'; 

            // 调用 submitData(uint256 id, bool isYes, uint64 randomNumber, string calldata eventDataSources)
            const submitData = await EchoOptimisticOracleContract.submitData(
                voteData.id, 
                isYes,
                voteData.randomNumber, // uint64
                voteData.dataSource
            );

            const submitDataTx = await submitData.wait(); 
            console.log('Sending transaction:', submitDataTx.hash);
            setShowVoteModal(false);
            // 💡 提示：可以在这里添加一个回调来刷新 ArbitrationPage 的列表数据
        } catch (error) {
            console.error('Submit data failed:', error);
            const errorMessage = error.reason || error.message || "An unknown error occurred.";
            alert(`Data submission failed. Error: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const questTitle = market.quest || "Market Question Loading..."; 
    const totalVolume = formatBigNumber(market.liqudityInfo?.volume, 18, 2); 
    const participants = market.participants?.toString() || '0';
    // ⚠️ market.collateral 和 market.poolInfo?.collateral 字段可能需要根据实际合约定义调整格式化
    const collateralSymbol = market.collateral === market.poolInfo?.collateral ? "USDC" : "Token"; 
    const formattedEndTime = market.endTime 
        ? new Date(market.endTime).toLocaleDateString() + ' ' + new Date(market.endTime).toLocaleTimeString()
        : 'N/A';

    return (
        <>
            <div className="card-hover bg-white rounded-xl shadow-lg p-6 border border-emerald-100 hover:border-emerald-300">
                {/* ... (其他 JSX 保持不变) */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {status}
                        </span>
                        {/* 🚀 修复点 1: 确保 marketDataGroup 返回了 isProviderRegistered 字段 */}
                        {market.isProviderRegistered && ( 
                            <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                                Registered Provider
                            </span>
                        )}
                    </div>
                    <span className="text-sm text-emerald-600">ID: {market.id}</span> 
                </div>

                <h3 className="text-xl font-semibold text-emerald-800 mb-2 line-clamp-2">
                    {questTitle}
                </h3>
                
                {/* ... (指标展示部分保持不变) */}
                 <div className="grid grid-cols-2 gap-4 mb-6">
                     <div className="bg-emerald-50 p-3 rounded-lg">
                        <div className="text-sm text-emerald-600 font-medium mb-1">Participants</div>
                        <div className="text-lg font-semibold text-emerald-700">{participants}</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg">
                        <div className="text-sm text-emerald-600 font-medium mb-1">Total Volume</div>
                        <div className="text-lg font-semibold text-emerald-700">{totalVolume} {collateralSymbol}</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg">
                        <div className="text-sm text-emerald-600 font-medium mb-1">Yes Price</div>
                        <div className="text-lg font-semibold text-emerald-700">{formatBigNumber(market.yesPrice, 18, 4)}</div> 
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg">
                        <div className="text-sm text-emerald-600 font-medium mb-1">No Price</div>
                        <div className="text-lg font-semibold text-emerald-700">{formatBigNumber(market.noPrice, 18, 4)}</div> 
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg col-span-2">
                        <div className="text-sm text-emerald-600 font-medium mb-1">Resolution Time</div>
                        <div className="text-lg font-semibold text-emerald-700">{formattedEndTime}</div>
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

                    {/* 仅在连接钱包、已注册、并且处于可提交数据的状态时显示按钮 */}
                    {isConnected && market.isProviderRegistered && isSubmittable && (
                        <button
                            onClick={handleOpenVoteModal} 
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Data'}
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
                                    <h3 className="text-xl font-semibold text-emerald-800">Submit Data for Market ID: {market.id}</h3>
                                    <button
                                        onClick={() => setShowVoteModal(false)}
                                        className="text-emerald-600 hover:text-emerald-800"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <p className="text-emerald-700 mb-4 font-medium">Question: {questTitle}</p>

                                <form onSubmit={handleVoteSubmit}>
                                    <div className="space-y-4">
                                        {/* Data Source URL */}
                                        <div>
                                            <label className="block text-sm font-medium text-emerald-700 mb-2">
                                                Data Source URL
                                            </label>
                                            <input
                                                type="url" // 更好的输入类型
                                                value={voteData.dataSource}
                                                onChange={(e) => setVoteData({...voteData, dataSource: e.target.value})}
                                                placeholder="https://api.example.com/data"
                                                className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                required
                                            />
                                        </div>

                                        {/* Random Number (for commitment) */}
                                        <div>
                                            <label className="block text-sm font-medium text-emerald-700 mb-2">
                                                Random Number (for commitment)
                                            </label>
                                            <input
                                                type="number"
                                                value={voteData.randomNumber}
                                                // 限制最大值以确保在 uint64 范围内，且在 JS 安全整数范围内
                                                onChange={(e) => setVoteData({...voteData, randomNumber: Math.min(parseInt(e.target.value) || 0, 9007199254740991)})}
                                                className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                                required
                                                min="0"
                                                max="9007199254740991" // JS Number.MAX_SAFE_INTEGER
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Used for a secure, hidden vote commitment.</p>
                                        </div>

                                        {/* Your Vote */}
                                        <div>
                                            <label className="block text-sm font-medium text-emerald-700 mb-2">
                                                Your Data Submission
                                            </label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setVoteData({...voteData, vote: 'yes'})}
                                                    className={`p-4 rounded-lg border-2 ${voteData.vote === 'yes' 
                                                        ? 'border-green-500 bg-green-50 text-green-700' 
                                                        : 'border-emerald-200 text-emerald-600 hover:border-emerald-300'}`}
                                                >
                                                    <div className="font-semibold">Yes (True)</div>
                                                    <div className="text-sm">The event occurred/The answer is Yes.</div>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setVoteData({...voteData, vote: 'no'})}
                                                    className={`p-4 rounded-lg border-2 ${voteData.vote === 'no' 
                                                        ? 'border-red-500 bg-red-50 text-red-700' 
                                                        : 'border-emerald-200 text-emerald-600 hover:border-emerald-300'}`}
                                                >
                                                    <div className="font-semibold">No (False)</div>
                                                    <div className="text-sm">The event did not occur/The answer is No.</div>
                                                </button>
                                            </div>
                                            {!voteData.vote && (
                                                <p className="text-red-500 text-sm mt-2">Please select 'Yes' or 'No'.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowVoteModal(false)}
                                            className="px-4 py-2 text-emerald-600 hover:text-emerald-800 font-medium"
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            // 🚀 修复点 2: 仅在有投票结果和数据源时才允许提交
                                            disabled={isSubmitting || !voteData.vote || !voteData.dataSource.trim()} 
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Data'}
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