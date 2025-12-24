import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import { UseEthersSigner } from "../config/EtherAdapter.js";
import { ethers } from "ethers";
import { AroundUIHelperAddress, USDCAddress } from "../address.js";
import AroundUIHelperABI from "../abis/AroundUIHelper.json";
import EchoOptimisticOracleABI from "../abis/EchoOptimisticOracle.json";
import { EchoOptimisticOracleAddress } from "../address.js";
import ERC20ABI from "../abis/ERC20.json";

const fmt = (v, d = 18, f = 2) => {
  if (v === undefined || v === null) return "N/A";
  try {
    const s = ethers.formatUnits(v, d);
    return Number.parseFloat(s).toFixed(f);
  } catch {
    return v.toString();
  }
};

const toMs = (v) => {
  if (v === undefined || v === null) return null;
  const n = typeof v === "bigint" ? Number(v) : Number(v);
  return n < 1e12 ? n * 1000 : n;
};

export default function MarketDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const passedMarket = location?.state?.market;
  const [data, setData] = useState(null);
  const [oracleData, setOracleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [decimals, setDecimals] = useState(18);
  const signer = UseEthersSigner();
  const provider = signer ? signer.provider : null;
  const { isConnected, address } = useAccount();

  const helper = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(AroundUIHelperAddress, AroundUIHelperABI.abi, provider);
  }, [provider]);

  const echoRead = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(EchoOptimisticOracleAddress, EchoOptimisticOracleABI.abi, provider);
  }, [provider]);

  const echoWrite = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(EchoOptimisticOracleAddress, EchoOptimisticOracleABI.abi, signer);
  }, [signer]);

  const usdc = useMemo(() => {
    if (!signer || !USDCAddress) return null;
    return new ethers.Contract(USDCAddress, ERC20ABI.abi, signer);
  }, [signer]);

  const reload = useCallback(async () => {
    if (!helper || !id) return;
    setLoading(true);
    try {
      const md = await helper.indexMarketData(BigInt(id));
      setData(md);
      try {
        const oi = await echoRead.getOracleInfo(BigInt(id));
        setOracleData(oi);
      } catch { }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [helper, id, echoRead]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const c = data?.thisPoolInfo?.collateral;
    const key = c ? String(c).toLowerCase() : '';
    if (!c) return;
    if (USDCAddress && key === String(USDCAddress).toLowerCase()) {
      setDecimals(6);
      return;
    }
    (async () => {
      try {
        const d = await helper.getDecimals(c);
        setDecimals(Number(d) || 18);
      } catch {
        setDecimals(18);
      }
    })();
  }, [data, helper]);

  const quest = (passedMarket?.title) || passedMarket?.quest || data?.thisPoolInfo?.quest || data?.thisOracleInfo?.quest || "";
  const [titleExpanded, setTitleExpanded] = useState(false);
  const maxTitleLen = 56;
  const displayTitle = (quest || "").length > maxTitleLen ? `${String(quest).slice(0, maxTitleLen)}…` : quest || "";
  const remainderTitle = (quest || "").length > maxTitleLen ? String(quest).slice(maxTitleLen) : "";
  const endTime = data?.thisMarketInfo?.endTime ? new Date(toMs(data.thisMarketInfo.endTime)).toLocaleString() : "N/A";
  const participants = data?.thisMarketInfo?.participants?.toString?.() || "0";
  const yesPrice = fmt(data?.thisYesPrice, 18, 2);
  const noPrice = fmt(data?.thisNoPrice, 18, 2);
  const volumeSource = data?.thisLiqudityInfo?.volume ?? data?.thisLiqudityInfo?.tradeCollateralAmount;
  const volumeRaw = fmt(volumeSource, 18, 2);
  const volumeNum = Number.parseFloat(volumeRaw || '0');
  const volumeK = `${(volumeNum / 1000).toFixed(2)}k ${decimals === 6 ? 'USDC' : 'Token'}`;
  const oracle = oracleData || data?.thisOracleInfo || {};
  const opt = oracle?.optimisticInfo || {};
  const updateTime = oracle?.updateTime ? new Date(toMs(oracle.updateTime)).toLocaleString() : "N/A";
  const eventText = (s) => (Number(s) === 1 ? 'Yes' : Number(s) === 2 ? 'No' : 'Pending');
  const withdrawText = (s) => (Number(s) === 1 ? 'Provider Withdrawn' : Number(s) === 2 ? 'Dispute Withdrawn' : 'Pending');
  const short = (addr) => (addr ? `${String(addr).slice(0, 6)}...${String(addr).slice(-4)}` : '');
  const providersCount = Array.isArray(opt?.providers) ? opt.providers.length : 0;
  const investigatorsCount = Array.isArray(opt?.investigators) ? opt.investigators.length : 0;
  const [evidenceQuery, setEvidenceQuery] = useState('');
  const evidenceText = String(opt?.evidence || "N/A");
  const evidenceMatchCount = useMemo(() => {
    const q = String(evidenceQuery || '').toLowerCase();
    if (!q) return 0;
    return (evidenceText.toLowerCase().match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  }, [evidenceText, evidenceQuery]);
  const copyToClipboard = useCallback((t) => {
    if (!t) return;
    navigator.clipboard?.writeText?.(String(t));
  }, []);
  const openExplorer = useCallback((addr) => {
    if (!addr) return;
    const url = `https://etherscan.io/address/${String(addr)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeEvidence, setChallengeEvidence] = useState("");
  const [challengeFee, setChallengeFee] = useState(null);
  const [acting, setActing] = useState(false);

  const openChallenge = useCallback(async () => {
    if (!echoRead) return;
    setShowChallenge(true);
    try {
      const fee = await echoRead.challengerFee();
      setChallengeFee(fee);
    } catch { }
  }, [echoRead]);

  const submitChallenge = useCallback(async () => {
    if (!isConnected || !echoWrite || !usdc || !address || acting) return;
    if (!challengeEvidence || !id) return;
    setActing(true);
    try {
      const allowance = await usdc.allowance(address, EchoOptimisticOracleAddress);
      const need = challengeFee ?? 0n;
      if (allowance < need) {
        const tx = await usdc.approve(EchoOptimisticOracleAddress, need);
        await tx.wait();
      }
      const c = await echoWrite.challenge(BigInt(id), String(challengeEvidence));
      await c.wait();
      setShowChallenge(false);
      setChallengeEvidence("");
      reload();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }, [isConnected, echoWrite, usdc, address, acting, challengeEvidence, id, challengeFee, reload]);

  const [showSubmit, setShowSubmit] = useState(false);
  const [submitVote, setSubmitVote] = useState(null);
  const [submitSource, setSubmitSource] = useState("");
  const [submitRand, setSubmitRand] = useState(Math.floor(Math.random() * 9007199254740991));
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const openSubmit = useCallback(async () => {
    setShowSubmit(true);
    setSubmitRand(Math.floor(Math.random() * 9007199254740991));
    setSubmitVote(null);
    setSubmitSource("");
    try {
      if (echoRead && address && id) {
        const info = await echoRead.getSubmitDataInfo(address, BigInt(id));
        setAlreadySubmitted(Boolean(info?.isSubmit));
      }
    } catch { }
  }, [echoRead, address, id]);

  const submitDataAction = useCallback(async () => {
    if (!isConnected || !echoWrite || acting) return;
    if (!submitVote || !submitSource || !id) return;
    setActing(true);
    try {
      const isYes = submitVote === "yes";
      const tx = await echoWrite.submitData(
        BigInt(id),
        isYes,
        BigInt(submitRand),
        String(submitSource)
      );
      await tx.wait();
      setShowSubmit(false);
      reload();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }, [isConnected, echoWrite, submitVote, submitSource, id, submitRand, reload]);
  const [showExit, setShowExit] = useState(false);
  const [providerInfo, setProviderInfo] = useState(null);
  const [canExit, setCanExit] = useState(false);
  const [exitReason, setExitReason] = useState("");
  useEffect(() => {
    (async () => {
      if (!showExit) return;
      try {
        if (!isConnected || !echoRead || !address) {
          setCanExit(false);
          setExitReason("Wallet not connected");
          return;
        }
        const info = await echoRead.dataProviderInfo(address);
        setProviderInfo(info);
        if (!info?.valid) {
          setCanExit(false);
          setExitReason("Not a registered provider");
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
          setCanExit(true);
          setExitReason("");
        } else {
          const remain = Math.max(0, latest + cooling - nowSec);
          const hrs = (remain / 3600).toFixed(1);
          setCanExit(false);
          setExitReason(`Cooling time has not elapsed (${hrs}h remaining)`);
        }
      } catch {
        setCanExit(false);
        setExitReason("Failed to load provider status");
      }
    })();
  }, [showExit, isConnected, echoRead, address]);
  const confirmExit = useCallback(async () => {
    if (!isConnected || !echoWrite || acting || !canExit) return;
    setActing(true);
    try {
      const tx = await echoWrite.exit();
      await tx.wait();
      setShowExit(false);
      reload();
    } catch (e) {
      console.error(e);
    } finally {
      setActing(false);
    }
  }, [isConnected, echoWrite, acting, canExit, reload]);

  return (
    <div className="max-w-6xl mx-auto fade-in">
      {loading ? (
        <div className="text-center p-8">Loading...</div>
      ) : !data ? (
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">No data</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100 mb-6">
            <div className="flex items-start justify-between">
              <div className="text-2xl font-semibold text-emerald-800 cursor-pointer" onClick={() => setTitleExpanded(v => !v)}>
                <span className="block">{displayTitle}</span>
                {titleExpanded && !!remainderTitle && (
                  <span className="block mt-1 text-sm text-emerald-700 break-words whitespace-normal leading-relaxed">{remainderTitle}</span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={reload}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
                >
                  Refresh
                </button>
                <button
                  onClick={openChallenge}
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium"
                >
                  Challenge
                </button>
                <button
                  onClick={openSubmit}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium"
                >
                  Submit
                </button>
                <button
                  onClick={() => setShowExit(true)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-200"
                >
                  Exit
                </button>
                <div className="text-sm text-emerald-600">#{id}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Traders</div>
                <div className="text-lg font-semibold text-emerald-700">{participants}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Volume</div>
                <div className="text-lg font-semibold text-emerald-700">{volumeK}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Yes Price</div>
                <div className="text-lg font-semibold text-emerald-700">{yesPrice}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">No Price</div>
                <div className="text-lg font-semibold text-emerald-700">{noPrice}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Ends</div>
                <div className="text-lg font-semibold text-emerald-700">{endTime}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Oracle Earn</div>
                <div className="text-lg font-semibold text-emerald-700">{fmt(oracle?.earn, decimals, 2)}</div>
              </div>
            </div>
          </div>

          {showChallenge && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-emerald-800">Challenge Market #{id}</h3>
                    <button onClick={() => setShowChallenge(false)} className="text-emerald-600 hover:text-emerald-800">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <div className="text-sm text-emerald-600">Challenger Fee</div>
                      <div className="text-lg font-semibold text-emerald-700">
                        {challengeFee ? fmt(challengeFee, 18, 4) : "Loading..."}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 mb-2">Evidence</label>
                      <textarea
                        value={challengeEvidence}
                        onChange={(e) => setChallengeEvidence(e.target.value)}
                        placeholder="Provide on-chain/off-chain evidence references"
                        className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        rows={4}
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setShowChallenge(false)}
                      className="px-4 py-2 text-emerald-600 hover:text-emerald-800 font-medium"
                      disabled={acting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitChallenge}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                      disabled={acting || !challengeEvidence}
                    >
                      {acting ? "Submitting..." : "Confirm Challenge"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showSubmit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-emerald-800">Submit Data #{id}</h3>
                    <button onClick={() => setShowSubmit(false)} className="text-emerald-600 hover:text-emerald-800">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {alreadySubmitted && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                        You have already submitted data for this market.
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setSubmitVote("yes")}
                        className={`p-4 rounded-lg border-2 ${submitVote === "yes" ? "border-green-500 bg-green-50 text-green-700" : "border-emerald-200 text-emerald-600 hover:border-emerald-300"}`}
                      >
                        <div className="font-semibold">Yes</div>
                        <div className="text-sm">Event occurred</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubmitVote("no")}
                        className={`p-4 rounded-lg border-2 ${submitVote === "no" ? "border-red-500 bg-red-50 text-red-700" : "border-emerald-200 text-emerald-600 hover:border-emerald-300"}`}
                      >
                        <div className="font-semibold">No</div>
                        <div className="text-sm">Event did not occur</div>
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 mb-2">Data Source URL</label>
                      <input
                        type="url"
                        value={submitSource}
                        onChange={(e) => setSubmitSource(e.target.value)}
                        placeholder="https://api.example.com/data"
                        className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-emerald-700 mb-2">Random Number</label>
                      <input
                        type="number"
                        value={submitRand}
                        onChange={(e) => setSubmitRand(Math.min(parseInt(e.target.value) || 0, 9007199254740991))}
                        className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        min="0"
                        max="9007199254740991"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setShowSubmit(false)}
                      className="px-4 py-2 text-emerald-600 hover:text-emerald-800 font-medium"
                      disabled={acting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitDataAction}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                      disabled={acting || !submitVote || !submitSource || alreadySubmitted}
                    >
                      {acting ? "Submitting..." : "Confirm Submit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showExit && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-emerald-800">Exit Provider</h3>
                    <button onClick={() => setShowExit(false)} className="text-emerald-600 hover:text-emerald-800">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <div className="text-sm text-emerald-600">Address</div>
                      <div className="text-lg font-semibold text-emerald-700">{short(address) || "Not connected"}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg">
                      <div className="text-sm text-emerald-600">Latest Submit Time</div>
                      <div className="text-lg font-semibold text-emerald-700">
                        {providerInfo ? new Date(toMs(providerInfo.latestSubmitTime)).toLocaleString() : "Loading..."}
                      </div>
                    </div>
                    {!canExit && (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
                        {exitReason || "You are not eligible to exit now."}
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      onClick={() => setShowExit(false)}
                      className="px-4 py-2 text-emerald-600 hover:text-emerald-800 font-medium"
                      disabled={acting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmExit}
                      className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                      disabled={acting || !canExit}
                    >
                      {acting ? "Processing..." : "Confirm Exit"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
            <div className="text-lg font-semibold text-emerald-700 mb-4">Oracle Details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Event</div>
                <div className="text-lg font-semibold text-emerald-700">{eventText(oracle?.eventState)}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Withdraw</div>
                <div className="text-lg font-semibold text-emerald-700">{withdrawText(oracle?.withdrawState)}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Raffle Tickets</div>
                <div className="text-lg font-semibold text-emerald-700">{Number(data?.thisMarketInfo?.totalRaffleTicket || 0).toLocaleString()}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Yes Votes</div>
                <div className="text-lg font-semibold text-emerald-700">{oracle?.yesVote || 0}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">No Votes</div>
                <div className="text-lg font-semibold text-emerald-700">{oracle?.noVote || 0}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Update Time</div>
                <div className="text-lg font-semibold text-emerald-700">{updateTime}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Dispute Votes</div>
                <div className="text-lg font-semibold text-emerald-700">{opt?.disputeVotes || 0}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Responses</div>
                <div className="text-lg font-semibold text-emerald-700">{opt?.responseCount || 0}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Challenger</div>
                <div className="text-lg font-semibold text-emerald-700">{short(opt?.challenger)}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Providers</div>
                <div className="text-lg font-semibold text-emerald-700">{providersCount}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600">Investigators</div>
                <div className="text-lg font-semibold text-emerald-700">{investigatorsCount}</div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg col-span-1 md:col-span-2 lg:col-span-3">
                <div className="text-sm text-emerald-600">Evidence</div>
                <div className="mb-2">
                  <input
                    type="text"
                    value={evidenceQuery}
                    onChange={(e) => setEvidenceQuery(e.target.value)}
                    placeholder="Search evidence text…"
                    className="w-full px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <div className="text-xs text-emerald-600 mt-1">Matches: {evidenceMatchCount}</div>
                </div>
                <div className="text-sm font-medium text-emerald-700 break-words whitespace-normal">
                  {(() => {
                    const q = String(evidenceQuery || '');
                    if (!q) return evidenceText;
                    const parts = evidenceText.split(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
                    const match = (evidenceText.match(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')) || [])[0] || q;
                    const out = [];
                    for (let i = 0; i < parts.length; i++) {
                      out.push(parts[i]);
                      if (i < parts.length - 1) out.push(<span key={i} className="bg-yellow-100 text-emerald-900 px-0.5">{match}</span>);
                    }
                    return out;
                  })()}
                </div>
              </div>
            </div>
            {(Array.isArray(opt?.providers) && opt.providers.length > 0) && (
              <div className="mt-6">
                <div className="text-sm text-emerald-600 mb-2">Providers List</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {opt.providers.map((addr, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                      <span className="text-emerald-700 text-sm">{short(addr)}</span>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => copyToClipboard(addr)} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs">Copy</button>
                        <button onClick={() => openExplorer(addr)} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs">Open</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(Array.isArray(opt?.investigators) && opt.investigators.length > 0) && (
              <div className="mt-4">
                <div className="text-sm text-emerald-600 mb-2">Investigators List</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {opt.investigators.map((addr, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2">
                      <span className="text-emerald-700 text-sm">{short(addr)}</span>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => copyToClipboard(addr)} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs">Copy</button>
                        <button onClick={() => openExplorer(addr)} className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-xs">Open</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
