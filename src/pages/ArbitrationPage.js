import React, { useState, useEffect, useCallback, useMemo } from "react";
import MarketCard from "../components/MarketCard";
import Pagination from "../components/Pagination";
import { UseEthersSigner } from "../config/EtherAdapter.js";

import { useAccount } from "wagmi";
import { ethers } from "ethers";

import { AroundPoolFactoryAddress, AroundUIHelperAddress } from "../Address.js";

import { GetMarketId } from "../contracts/AroundPoolFactory.js";
import { GetMarketsData } from "../contracts/AroundUIHelper.js"; 

//abis
import AroundPoolFactoryABI from "../abis/AroundPoolFactory.json";
import AroundUIHelperABI from "../abis/AroundUIHelper.json";

const PAGE_SIZE = 10n;
const FIRST_PAGE = 1; 

const ArbitrationPage = () => {
  const { address, isConnected } = useAccount();

  const [marketDataGroup, setMarketDataGroup] = useState([]);
  const [currentPage, setCurrentPage] = useState(FIRST_PAGE);
  const [currentTotalPage, setCurrentTotalPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMarketCount, setTotalMarketCount] = useState(0n); // 0n for BigInt

  const signer = UseEthersSigner();
  const provider = signer ? signer.provider : null; 

  const AroundPoolFactory = useMemo(() => {
    if (provider) { 
      return new ethers.Contract(
        AroundPoolFactoryAddress,
        AroundPoolFactoryABI.abi,
        provider 
      );
    }
    return null;
  }, [provider]); 

  const AroundUIHelper = useMemo(() => {
    if (provider) { 
      return new ethers.Contract(
        AroundUIHelperAddress,
        AroundUIHelperABI.abi,
        provider 
      );
    }
    return null;
  }, [provider]);

  const FetchTotalMarketCount = useCallback(async () => {
    if (!AroundPoolFactory) return;
    setIsLoading(true);

    try {
      const marketId = await GetMarketId(AroundPoolFactory);

      setTotalMarketCount(marketId);

      const totalPages =
        marketId > 0n ? Number((marketId - 1n) / PAGE_SIZE + 1n) : 1;
      setCurrentTotalPage(totalPages);

      if (currentPage > totalPages) {
        setCurrentPage(FIRST_PAGE);
      }
    } catch (e) {
      console.error("Fetch market ID fail:", e);
    } finally {
      setIsLoading(false);
    }
  }, [AroundPoolFactory, currentPage]);


  const FetchMarketsByPage = useCallback(async (page, totalCount, helperContract) => {
    if (!isConnected || totalCount === 0n || !helperContract) {
      setMarketDataGroup([]);
      return;
    }
    
    if (isLoading && marketDataGroup.length > 0) return; 

    setIsLoading(true);

    try {
      
      const lastMarketId = totalCount; 

      const [
          poolInfoGroup, 
          marketInfoGroup, 
          liqudityInfoGroup, 
          oracleInfoGroup,
          yesPriceGroup, 
          noPriceGroup
      ] = await GetMarketsData(
        helperContract, 
        0n,
        PAGE_SIZE 
      );
      
      const rawMarkets = marketInfoGroup.map((marketInfo, index) => {
          const marketId = BigInt(page) * PAGE_SIZE + BigInt(index);
          
          return {
              id: marketId,
              quest: marketInfo.quest,
              endTime: marketInfo.endTime, 
              result: marketInfo.result, 
              collateral: marketInfo.collateral,
              participants: marketInfo.participants,
              poolInfo: poolInfoGroup[index],
              liqudityInfo: liqudityInfoGroup[index],
              oracleInfo: oracleInfoGroup[index],
              yesPrice: yesPriceGroup[index],
              noPrice: noPriceGroup[index],
          };
      });

      // 3. 反转数组以确保最新的市场 (即最大的 ID) 在列表前面
      const reversedMarkets = rawMarkets.reverse(); 

      setMarketDataGroup(reversedMarkets);
      setCurrentPage(page); 
    } catch (e) {
      console.error("Fetch markets data fail:", e);
      setMarketDataGroup([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, isLoading, marketDataGroup.length]); // 移除 totalCount, helperContract, page，在 useEffect 中处理

  
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
    AroundUIHelper,
    FetchMarketsByPage
  ]);


  const handlePageChange = useCallback(
    (newPage) => {
      if (
        newPage !== currentPage &&
        newPage >= FIRST_PAGE &&
        newPage <= currentTotalPage &&
        !isLoading
      ) {
        setCurrentPage(newPage);
      }
    },
    [currentPage, isLoading, currentTotalPage]
  );

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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {marketDataGroup.map((marketData) => (
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