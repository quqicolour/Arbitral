import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useEthers } from "../context/EthersContext.jsx";
import { ethers } from "ethers";

import { EchoOptimisticOracleAddress as StaticOracle } from "../address.js";
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
const toMsTimestamp = (v) => {
    if (v === undefined || v === null) return null;
    const n = typeof v === 'bigint' ? Number(v) : Number(v);
    return n < 1e12 ? n * 1000 : n;
};
const compactNumber = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return n.toFixed(2);
};
const shortAddr = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};
const oracleEventText = (s) => {
    if (s === 1 || s === '1') return 'Yes';
    if (s === 2 || s === '2') return 'No';
    return 'Pending';
};
const oracleWithdrawText = (s) => {
    if (s === 1 || s === '1') return 'Provider Withdrawn';
    if (s === 2 || s === '2') return 'Dispute Withdrawn';
    return 'Pending';
};
const oracleStateText = (s) => {
    if (s === 1 || s === '1') return 'Dispute';
    return 'Normal';
};

const MarketCard = ({ market }) => {
    const navigate = useNavigate();
    const { isConnected } = useAccount();
    const { signer, addresses } = useEthers();

    const [showVoteModal, setShowVoteModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorOpen, setErrorOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const showError = (e, fallback) => {
        try {
            const raw = e && (e.shortMessage || e.reason || e.message) || fallback || "Unknown error";
            const msg = String(raw || "").replace(/\s+/g, " ").trim();
            setErrorMessage(msg.length > 200 ? msg.slice(0, 200) : msg);
            setErrorOpen(true);
        } catch {
            setErrorMessage(fallback || "Unknown error");
            setErrorOpen(true);
        }
        console.error(e);
    };

    // 完善点 1: 确保 voteData 初始状态的 ID 为 null，并在打开模态框时设置
    const [voteData, setVoteData] = useState({
        id: null,
        dataSource: '',
        randomNumber: (() => {
            const min = 1_000_000_000_000n;
            const range = 9_000_000_000_000n;
            const buf = new BigUint64Array(1);
            crypto.getRandomValues(buf);
            const r = buf[0] % range;
            return Number(min + r);
        })(),
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
        const endTimeMs = toMsTimestamp(market.endTime);
        const result = market.result;

        // ... (状态推断逻辑保持不变)
        let currentStatus = 'Pending';
        let color = getStatusColor('Pending');
        let submittable = false;

        if (endTimeMs && now > endTimeMs) {
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
            randomNumber: (() => {
                const min = 1_000_000_000_000n;
                const range = 9_000_000_000_000n;
                const buf = new BigUint64Array(1);
                crypto.getRandomValues(buf);
                const r = buf[0] % range;
                return Number(min + r);
            })(),
        }));
        setShowVoteModal(true);
    }

    const handleVoteSubmit = async (e) => {
        e.preventDefault();

        if (!voteData.vote || !voteData.dataSource.trim() || !voteData.id) {
            alert("Please select a vote and provide a data source.");
            return;
        }
        if (voteData.randomNumber < 1_000_000_000_000 || voteData.randomNumber >= 10_000_000_000_000) {
            alert("Random number must be in [1000000000000, 9999999999999).");
            return;
        }

        if (!isConnected || !signer || isSubmitting) {
            console.error("Wallet not connected, signer unavailable, or already submitting.");
            return;
        }

        setIsSubmitting(true);

        try {
            const EchoOptimisticOracleContract = new ethers.Contract(
                addresses?.EchoOptimisticOracle || StaticOracle,
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
            showError(error, "Submit failed");
        } finally {
            setIsSubmitting(false);
        }
    };

    const poolQuest = Array.isArray(market.poolInfo) ? (market.poolInfo?.[3] || '') : (market.poolInfo?.quest || '');
    const oracleQuest = Array.isArray(market.oracleInfo) ? (market.oracleInfo?.[7] || '') : (market.oracleInfo?.quest || '');
    const questTitle = (oracleQuest || market.quest || `Market #${String(market.id)}`).toString();
    const maxTitleLen = 24;
    const questDisplay = questTitle.length > maxTitleLen ? `${questTitle.slice(0, maxTitleLen)}…` : questTitle;
    const collateralDecimals = Number(market.decimals ?? (market.poolInfo?.collateral && addresses?.USDC && market.poolInfo.collateral.toLowerCase() === addresses.USDC.toLowerCase() ? 6 : 18));
    const volumeSource = market.liqudityInfo?.volume ?? market.liqudityInfo?.tradeCollateralAmount;
    const totalVolumeRaw = formatBigNumber(volumeSource, 18, 2);
    const totalVolumeNum = Number.parseFloat(totalVolumeRaw || '0');
    const totalVolumeK = (totalVolumeNum / 1000).toFixed(2);
    const participants = market.participants?.toString() || '0';
    const collateralSymbol = market.poolInfo?.collateral && addresses?.USDC && market.poolInfo.collateral.toLowerCase() === addresses.USDC.toLowerCase() ? "USDC" : "Token";
    const formattedEndTime = market.endTime
        ? (() => {
            const ms = toMsTimestamp(market.endTime);
            return new Date(ms).toLocaleDateString() + ' ' + new Date(ms).toLocaleTimeString();
        })()
        : 'N/A';
    const yesPrice = formatBigNumber(market.yesPrice, 18, 2);
    const noPrice = formatBigNumber(market.noPrice, 18, 2);

    return (
        <>
            <div className="card-hover bg-white rounded-xl shadow-lg p-6 border border-emerald-100 hover:border-emerald-300">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {status}
                        </span>
                        {market.category && (
                            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                                {market.category}
                            </span>
                        )}
                    </div>
                    <span className="text-sm text-emerald-600">#{String(market.id)}</span>
                </div>

                <h3 className="text-xl font-semibold text-emerald-800 mb-2 line-clamp-2">
                    {questDisplay}
                </h3>

                <div className="text-sm text-emerald-700 mb-4">
                    {participants} traders • {totalVolumeK}k {collateralSymbol} • Ends {formattedEndTime}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-emerald-50 p-3 rounded-lg">
                        <div className="text-sm text-emerald-600 font-medium mb-1">Yes Price</div>
                        <div className="text-lg font-semibold text-emerald-700">{yesPrice}</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg">
                        <div className="text-sm text-emerald-600 font-medium mb-1">No Price</div>
                        <div className="text-lg font-semibold text-emerald-700">{noPrice}</div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <button
                        onClick={() => navigate(`/market/${market.id}`, { state: { market: { id: String(market.id), title: questTitle } } })}
                        className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center"
                    >
                        View Details
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {isConnected && isSubmittable && (
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
                                    <div>
                                        <label className="block text-sm font-medium text-emerald-700 mb-2">
                                            Data Source URL
                                        </label>
                                        <input
                                            type="url"
                                            value={voteData.dataSource}
                                            onChange={(e) => setVoteData({ ...voteData, dataSource: e.target.value })}
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
                                            onChange={(e) => {
                                                const v = parseInt(e.target.value) || 0;
                                                const clamped = Math.max(1_000_000_000_000, Math.min(v, 9_999_999_999_999));
                                                setVoteData({ ...voteData, randomNumber: clamped });
                                            }}
                                            className="w-full px-4 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            required
                                            min="1000000000000"
                                            max="9999999999999"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Range: 1000000000000–9999999999999 • Used for commitment.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-emerald-700 mb-2">
                                            Your Data Submission
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setVoteData({ ...voteData, vote: 'yes' })}
                                                className={`p-4 rounded-lg border-2 ${voteData.vote === 'yes'
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-emerald-200 text-emerald-600 hover:border-emerald-300'}`}
                                            >
                                                <div className="font-semibold">Yes (True)</div>
                                                <div className="text-sm">The event occurred/The answer is Yes.</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setVoteData({ ...voteData, vote: 'no' })}
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
            {errorOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full">
                        <div className="p-5">
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-lg font-semibold text-red-600">Error</div>
                                <button onClick={() => setErrorOpen(false)} className="text-emerald-600 hover:text-emerald-800">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="text-sm text-emerald-800">{errorMessage}</div>
                            <div className="mt-5 flex justify-end">
                                <button onClick={() => setErrorOpen(false)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium">
                                    OK
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default React.memo(MarketCard);
