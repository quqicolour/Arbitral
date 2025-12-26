import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import MarketCard from "../components/MarketCard";
import Pagination from "../components/Pagination";
import { useEthers } from "../context/EthersContext.jsx";
import { useSearchParams } from "react-router-dom";

import { useAccount } from "wagmi";
import { ethers } from "ethers";

import { AroundMarketAddress as StaticAroundMarket } from "../address.js";

import { GetMarketId } from "../contracts/AroundPoolFactory.js";
import { GetMarketsData } from "../contracts/AroundUIHelper.js";

//abis
import AroundPoolFactoryABI from "../abis/AroundPoolFactory.json";
import AroundUIHelperABI from "../abis/AroundUIHelper.json";
import AroundMarketABI from "../abis/AroundMarket.json";

const PAGE_SIZE = 10n;
const FIRST_PAGE = 1;

const ArbitrationPage = () => {
  const { address, isConnected } = useAccount();

  const [marketDataGroup, setMarketDataGroup] = useState([]);
  const [currentPage, setCurrentPage] = useState(FIRST_PAGE);
  const [currentTotalPage, setCurrentTotalPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMarketCount, setTotalMarketCount] = useState(0n); // 0n for BigInt
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // all | active | voting | resolved | disputed
  const [searchText, setSearchText] = useState('');
  const [onlyArbitration, setOnlyArbitration] = useState(false);
  const pageCache = useRef(new Map());
  const fetchTokenRef = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const { provider, signer, addresses, chainId } = useEthers();

  const AroundPoolFactory = useMemo(() => {
    if (!provider || !addresses?.AroundPoolFactory) return null;
    return new ethers.Contract(addresses.AroundPoolFactory, AroundPoolFactoryABI.abi, provider);
  }, [provider, addresses]);

  const AroundUIHelper = useMemo(() => {
    if (!provider || !addresses?.AroundUIHelper) return null;
    return new ethers.Contract(addresses.AroundUIHelper, AroundUIHelperABI.abi, provider);
  }, [provider, addresses]);

  const FetchTotalMarketCount = useCallback(async () => {
    if (!AroundPoolFactory) return;
    setIsLoading(true);

    try {
      const marketId = await GetMarketId(AroundPoolFactory);

      setTotalMarketCount(marketId);

      const totalPages =
        marketId > 0n ? Number((marketId - 1n) / PAGE_SIZE + 1n) : 1;
      setCurrentTotalPage(totalPages);
      setCurrentPage((prev) => (prev > totalPages ? FIRST_PAGE : prev));
    } catch (e) {
      console.error("Fetch market ID fail:", e);
    } finally {
      setIsLoading(false);
    }
  }, [AroundPoolFactory]);


  const FetchMarketsByPage = useCallback(async (page, totalCount, helperContract) => {
    if (!isConnected || totalCount === 0n || !helperContract) {
      setMarketDataGroup([]);
      return;
    }

    if (isLoading && marketDataGroup.length > 0) return;

    const cached = pageCache.current.get(page);
    if (cached) {
      setMarketDataGroup(cached);
      setCurrentPage(page);
      return;
    }

    setIsLoading(true);

    try {
      const token = ++fetchTokenRef.current;
      const lastMarketId = totalCount;
      const startId = lastMarketId - BigInt((page - 1)) * PAGE_SIZE;
      let poolInfoGroup, marketInfoGroup, liqudityInfoGroup, oracleInfoGroup, yesPriceGroup, noPriceGroup;
      try {
        [
          poolInfoGroup,
          marketInfoGroup,
          liqudityInfoGroup,
          oracleInfoGroup,
          yesPriceGroup,
          noPriceGroup
        ] = await GetMarketsData(helperContract, BigInt(page - 1), PAGE_SIZE);
      } catch (err) {
        const am = new ethers.Contract(addresses?.AroundMarket || StaticAroundMarket, AroundMarketABI.abi, provider);
        const pf = new ethers.Contract(addresses?.AroundPoolFactory, AroundPoolFactoryABI.abi, provider);
        const fallbackPool = [];
        const fallbackMarket = [];
        const fallbackLiq = [];
        const fallbackOracle = [];
        const fallbackYes = [];
        const fallbackNo = [];
        for (let i = 0n; i < PAGE_SIZE; i++) {
          const marketId = startId - i;
          if (marketId <= 0n) break;
          let pool = null, mi = null, li = null, oi = null, yp = 0, np = 0;
          try { pool = await pf.getPoolInfo(marketId); } catch { }
          try { mi = await am.getMarketInfo(marketId); } catch { }
          try { li = await am.getLiqudityInfo(marketId); } catch { }
          try { yp = await helperContract.getYesPrice(marketId); } catch { }
          try { np = await helperContract.getNoPrice(marketId); } catch { }
          fallbackPool.push(pool || {});
          fallbackMarket.push(mi || {});
          fallbackLiq.push(li || {});
          fallbackOracle.push(oi || {}); // oracle 详情列表页不必用，保持占位
          fallbackYes.push(yp || 0);
          fallbackNo.push(np || 0);
        }
        poolInfoGroup = fallbackPool;
        marketInfoGroup = fallbackMarket;
        liqudityInfoGroup = fallbackLiq;
        oracleInfoGroup = fallbackOracle;
        yesPriceGroup = fallbackYes;
        noPriceGroup = fallbackNo;
      }

      // resolve decimals per collateral
      const collateralAddrs = Array.isArray(poolInfoGroup) ? poolInfoGroup.map(p => (Array.isArray(p) ? p[0] : p?.collateral)).filter(Boolean) : [];
      const uniqueCollaterals = Array.from(new Set(collateralAddrs.map(a => String(a).toLowerCase())));
      const decimalsMap = {};
      if (helperContract && uniqueCollaterals.length) {
        const decPromises = uniqueCollaterals.map(addr => helperContract.getDecimals(addr).then(d => ({ addr, d })).catch(() => ({ addr, d: 18 })));
        const decResults = await Promise.all(decPromises);
        for (const { addr, d } of decResults) decimalsMap[String(addr).toLowerCase()] = Number(d);
      }
      const rawMarkets = marketInfoGroup.map((marketInfo, index) => {
        const marketId = startId - BigInt(index);
        return {
          id: marketId,
          quest: poolInfoGroup[index]?.quest ?? marketInfo.quest,
          endTime: marketInfo.endTime,
          result: marketInfo.result,
          collateral: marketInfo.collateral,
          participants: marketInfo.participants,
          poolInfo: poolInfoGroup[index],
          liqudityInfo: liqudityInfoGroup[index],
          oracleInfo: oracleInfoGroup[index],
          yesPrice: yesPriceGroup[index],
          noPrice: noPriceGroup[index],
          decimals: (() => {
            const c = poolInfoGroup[index]?.collateral || marketInfo.collateral;
            const key = c ? String(c).toLowerCase() : '';
            if (addresses?.USDC && c && String(addresses.USDC).toLowerCase() === key) return 6;
            return (decimalsMap[key] ?? 18);
          })(),
        };
      });

      // resolve market type to category tag
      const getCategoryName = (typeId) => {
        const t = Number(typeId);
        switch (t) {
          case 1: return 'crypto';
          case 2: return 'sports';
          case 3: return 'gaming';
          case 4: return 'politics';
          case 5: return 'economy';
          case 6: return 'technology';
          case 7: return 'weather';
          default: return 'other';
        }
      };
      let typesGroup = [];
      if (AroundPoolFactory && Array.isArray(rawMarkets) && rawMarkets.length) {
        try {
          const typePromises = rawMarkets.map(m => AroundPoolFactory.getMarketPlace(m.id).catch(() => null));
          const places = await Promise.all(typePromises);
          typesGroup = places.map(p => Number(p?.marketType ?? 0));
        } catch { }
      }
      const enhancedMarkets = rawMarkets.map((m, idx) => ({
        ...m,
        category: getCategoryName(typesGroup[idx] ?? 0),
      }));

      const reversedMarkets = enhancedMarkets.reverse();
      const sortedMarkets = reversedMarkets.slice().sort((a, b) => {
        const ae = a.endTime ? (typeof a.endTime === 'bigint' ? Number(a.endTime) : Number(a.endTime)) : 0;
        const be = b.endTime ? (typeof b.endTime === 'bigint' ? Number(b.endTime) : Number(b.endTime)) : 0;
        if (be !== ae) return be - ae;
        return Number(b.id - a.id);
      });
      if (token === fetchTokenRef.current) {
        pageCache.current.set(page, sortedMarkets);
        setMarketDataGroup(sortedMarkets);
        setCurrentPage(page);
      }
    } catch (e) {
      console.error("Fetch markets data fail:", e);
      setMarketDataGroup([]);
    } finally {
      setIsLoading(false);
    }
  }, [provider]);


  useEffect(() => {
    if (isConnected && AroundPoolFactory && AroundUIHelper) {
      FetchTotalMarketCount();
    } else if (!isConnected) {
      setMarketDataGroup([]);
      setCurrentPage(1);
      setTotalMarketCount(0n);
      setCurrentTotalPage(1);
    }
  }, [isConnected, AroundPoolFactory, AroundUIHelper, FetchTotalMarketCount]);
  useEffect(() => {
    pageCache.current.clear();
    if (isConnected && AroundPoolFactory && AroundUIHelper) {
      FetchTotalMarketCount();
    }
  }, [chainId]);


  useEffect(() => {
    if (isConnected && totalMarketCount > 0n && AroundUIHelper) {
      FetchMarketsByPage(currentPage, totalMarketCount, AroundUIHelper);
    } else if (isConnected && totalMarketCount === 0n) {
      // 连接但市场数为0，确保清空列表
      setMarketDataGroup([]);
    }
  }, [
    isConnected,
    totalMarketCount,
    currentPage,
    AroundUIHelper
  ]);

  useEffect(() => {
    pageCache.current.clear();
  }, [totalMarketCount, chainId]);

  useEffect(() => {
    const sp = Number(searchParams.get('page') || FIRST_PAGE);
    if (Number.isFinite(sp) && sp >= FIRST_PAGE) {
      setCurrentPage(sp);
    }
  }, []);

  const handlePageChange = useCallback(
    (newPage) => {
      if (
        newPage !== currentPage &&
        newPage >= FIRST_PAGE &&
        newPage <= currentTotalPage &&
        !isLoading
      ) {
        setCurrentPage(newPage);
        const next = new URLSearchParams(searchParams);
        next.set('page', String(newPage));
        setSearchParams(next, { replace: true });
      }
    },
    [currentPage, isLoading, currentTotalPage, searchParams, setSearchParams]
  );

  const displayMarkets = useMemo(() => {
    const text = String(searchText || '').toLowerCase();
    const now = Date.now();
    const statusMatch = (m) => {
      const endTimeMs = m.endTime ? (typeof m.endTime === 'bigint' ? Number(m.endTime) * 1000 : Number(m.endTime) < 1e12 ? Number(m.endTime) * 1000 : Number(m.endTime)) : 0;
      const result = Number(m.result ?? 0);
      if (filterStatus === 'active') return endTimeMs && now < endTimeMs;
      if (filterStatus === 'voting') return endTimeMs && now >= endTimeMs && result === 0;
      if (filterStatus === 'resolved') return endTimeMs && now >= endTimeMs && (result === 1 || result === 2);
      if (filterStatus === 'disputed') return result === 3;
      return true;
    };
    const categoryMatch = (m) => {
      if (filterCategory === 'all') return true;
      return String(m.category || '').toLowerCase() === filterCategory;
    };
    const textMatch = (m) => {
      const q = String(m.quest || '').toLowerCase();
      return !text || q.includes(text);
    };
    const arbMatch = (m) => {
      if (!onlyArbitration) return true;
      const endTimeMs = m.endTime ? (typeof m.endTime === 'bigint' ? Number(m.endTime) * 1000 : Number(m.endTime) < 1e12 ? Number(m.endTime) * 1000 : Number(m.endTime)) : 0;
      const result = Number(m.result ?? 0);
      const now = Date.now();
      return result === 3 || (endTimeMs && now >= endTimeMs && result === 0);
    };
    return marketDataGroup.filter((m) => statusMatch(m) && categoryMatch(m) && textMatch(m) && arbMatch(m));
  }, [marketDataGroup, filterCategory, filterStatus, searchText, onlyArbitration]);

  const serializeMarkets = useCallback(() => {
    return displayMarkets.map((m) => {
      const end = m.endTime ? (typeof m.endTime === 'bigint' ? Number(m.endTime) : Number(m.endTime)) : 0;
      return {
        id: String(m.id),
        quest: String(m.quest || ''),
        category: String(m.category || ''),
        endTime: end,
        participants: String(m.participants || ''),
        yesPrice: String(m.yesPrice || ''),
        noPrice: String(m.noPrice || ''),
        result: String(m.result || '')
      };
    });
  }, [displayMarkets]);

  const exportJSON = useCallback(() => {
    const data = serializeMarkets();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markets_page_${currentPage}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [serializeMarkets, currentPage]);

  const exportCSV = useCallback(() => {
    const rows = serializeMarkets();
    const header = ['id', 'quest', 'category', 'endTime', 'participants', 'yesPrice', 'noPrice', 'result'];
    const lines = [
      header.join(','),
      ...rows.map(r => header.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `markets_page_${currentPage}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [serializeMarkets, currentPage]);

  return (
    <div className="fade-in">
      {isConnected && (
        <>
          {isLoading && marketDataGroup.length === 0 ? (
            <div className="text-center p-8">
              <svg
                className="animate-spin h-6 w-6 text-emerald-500 mx-auto"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="mt-2 text-emerald-600">Loading markets...</p>
            </div>
          ) : marketDataGroup.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
              <p className="text-emerald-600">No arbitration markets found.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-lg p-3 border border-emerald-100 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-sm text-emerald-700 mb-0.5">Category</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="crypto">Crypto</option>
                      <option value="sports">Sports</option>
                      <option value="gaming">Gaming</option>
                      <option value="politics">Politics</option>
                      <option value="economy">Economy</option>
                      <option value="technology">Technology</option>
                      <option value="weather">Weather</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-emerald-700 mb-0.5">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="voting">Voting/Submission</option>
                      <option value="resolved">Resolved</option>
                      <option value="disputed">Disputed</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm text-emerald-700 mb-0.5">Search</label>
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder="Search question text…"
                      className="w-full px-3 py-1.5 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={onlyArbitration}
                        onChange={(e) => setOnlyArbitration(e.target.checked)}
                        className="mr-2 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-emerald-700">Only arbitration (disputed or voting)</span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={exportCSV}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={exportJSON}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-emerald-600">
                  Showing {displayMarkets.length} of {marketDataGroup.length}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {displayMarkets.map((marketData) => (
                  <MarketCard key={marketData.id} market={marketData} />
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={currentTotalPage}
                onPageChange={handlePageChange}
              />
            </>
          )}

          <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
            <h3 className="text-lg font-semibold text-emerald-700 mb-4">
              💡 How Arbitration Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-emerald-600 font-medium mb-2">
                  1. Market Creation
                </div>
                <p className="text-sm text-emerald-700">
                  Markets are created with specific conditions and oracle fees
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-emerald-600 font-medium mb-2">
                  2. Provider Participation
                </div>
                <p className="text-sm text-emerald-700">
                  Registered providers submit data and vote on outcomes
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-emerald-600 font-medium mb-2">
                  3. Resolution
                </div>
                <p className="text-sm text-emerald-700">
                  Markets resolve based on provider consensus and threshold
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ArbitrationPage;
