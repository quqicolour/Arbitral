import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { UseEthersSigner } from "../config/EtherAdapter.js";
import { ethers } from "ethers";
import { AroundUIHelperAddress, USDCAddress } from "../address.js";
import AroundUIHelperABI from "../abis/AroundUIHelper.json";
import EchoOptimisticOracleABI from "../abis/EchoOptimisticOracle.json";
import { EchoOptimisticOracleAddress } from "../address.js";

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

  const helper = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(AroundUIHelperAddress, AroundUIHelperABI.abi, provider);
  }, [provider]);

  const reload = useCallback(async () => {
    if (!helper || !id) return;
    setLoading(true);
    try {
      const md = await helper.indexMarketData(BigInt(id));
      setData(md);
      try {
        const echo = new ethers.Contract(EchoOptimisticOracleAddress, EchoOptimisticOracleABI.abi, provider);
        const oi = await echo.getOracleInfo(BigInt(id));
        setOracleData(oi);
      } catch { }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [helper, id, provider]);

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
