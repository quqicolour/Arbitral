import React, { useState, useMemo } from 'react';
import { useAccount, useContractWrite } from 'wagmi';
import { parseEther } from 'viem';

import { useEthers } from "../context/EthersContext.jsx";
import { ethers } from "ethers";

import { EchoOptimisticOracleAddress as StaticOracle } from "../address.js";
import EchoOptimisticOracleABI from "../abis/EchoOptimisticOracle.json";
import ERC20ABI from "../abis/ERC20.json";

const RegisterFee = 10000n * 10n ** 18n;

const RegisterProviderPage = () => {
  const { isConnected, address } = useAccount();
  const [registrationFee, setRegistrationFee] = useState(10000);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [latestSubmitTime, setLatestSubmitTime] = useState(null);
  const [depositAmount, setDepositAmount] = useState(null);

  const { signer, provider, addresses } = useEthers();

  const USDC = useMemo(() => {
    if(signer) {
      return new ethers.Contract(
        addresses?.USDC,
        ERC20ABI.abi,
        signer
      );
    }
    return null;
  }, [signer, addresses]) 
  const EchoOptimisticOracleRead = useMemo(() => {
    if (provider) {
      return new ethers.Contract(
        addresses?.EchoOptimisticOracle || StaticOracle,
        EchoOptimisticOracleABI.abi,
        provider
      );
    }
    return null;
  }, [provider, addresses]);

  React.useEffect(() => {
    (async () => {
      try {
        if (!isConnected || !EchoOptimisticOracleRead || !address) return;
        const info = await EchoOptimisticOracleRead.dataProviderInfo(address);
        setIsRegistered(Boolean(info?.valid));
        setLatestSubmitTime(info?.latestSubmitTime ?? null);
        setDepositAmount(info?.depositeAmount ?? null);
      } catch {}
    })();
  }, [isConnected, EchoOptimisticOracleRead, address]);
  const EchoOptimisticOracle = useMemo(() => {
    if (!signer) return null;
    const oracleAddr = addresses?.EchoOptimisticOracle || StaticOracle;
    if (!oracleAddr) return null;
    return new ethers.Contract(oracleAddr, EchoOptimisticOracleABI.abi, signer);
  }, [signer, addresses]); 

  const handleRegister = async() => {
    try{
      if (isConnected) {
        const currentAddress = await signer.getAddress();
        //approve
        const allowance = await USDC.allowance(currentAddress, addresses?.EchoOptimisticOracle || StaticOracle);
        if(allowance < RegisterFee) {
          const approve = await USDC.approve(addresses?.EchoOptimisticOracle || StaticOracle, RegisterFee);
          const approveTx = await approve.wait();
          if(approveTx.status === 1) {
            console.log("Approve success");
          }else {
            console.log("Approve fail");
          }
        }else {
          console.log("Not approve");
        }

        const registProvider = await EchoOptimisticOracle.registProvider();
        const registProviderTx = await registProvider.wait();
        if(registProviderTx.status === 1) {
          console.log("Register provider success");
        } else {
          console.log("Register provider fail");
        }
      }else {
        alert('Please connect your wallet first');
      }
    }catch(e) {
      console.log("Register provider fail:", e);
    }
  };

  const handleRefund = async() => {
    try{
      if (isConnected) {
        const info = await EchoOptimisticOracleRead.dataProviderInfo(address);
        if (!info?.valid) {
          alert('You are not a registered provider.');
          return;
        }
        let cooling = 7 * 24 * 3600;
        try {
          const c = await EchoOptimisticOracleRead.coolingTime();
          cooling = Number(c) || cooling;
        } catch {}
        const latest = Number(info.latestSubmitTime || 0);
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec <= latest + cooling) {
          const remain = Math.max(0, latest + cooling - nowSec);
          const hrs = (remain / 3600).toFixed(1);
          alert(`Cooling time has not elapsed (${hrs}h remaining).`);
          return;
        }
        const tx = await EchoOptimisticOracle.exit();
        const receipt = await tx.wait();
        if(receipt.status === 1) {
          console.log("Refund success");
        } else {
          console.log("Refund fail");
        }
      }else {
        alert('Please connect your wallet first');
      }
    }catch(e) {
      console.log("Refund fail:", e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-800 mb-2">
          Become a Data Provider
        </h1>
        <p className="text-emerald-600">
          Register as an oracle provider to participate in optimistic arbitration markets
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-emerald-700 mb-2">
            Wallet Not Connected
          </h3>
          <p className="text-emerald-600">
            Please connect your wallet to register as a provider
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
              <h3 className="text-lg font-semibold text-emerald-700 mb-4">
                Registration Details
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700">Registration Fee</span>
                  <span className="font-semibold text-emerald-700">{registrationFee} USDC</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700">Your Address</span>
                  <span className="font-mono text-sm text-emerald-600 truncate max-w-[200px]">
                    {address}
                  </span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700">Status</span>
                  <span className={`font-semibold ${isRegistered ? 'text-green-600' : 'text-yellow-600'}`}>
                    {isRegistered ? 'Registered' : 'Not Registered'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700">Latest Submit</span>
                  <span className="font-semibold text-emerald-700">
                    {latestSubmitTime ? new Date((Number(latestSubmitTime) < 1e12 ? Number(latestSubmitTime) * 1000 : Number(latestSubmitTime))).toLocaleString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-emerald-700">Deposit Amount</span>
                  <span className="font-semibold text-emerald-700">
                    {depositAmount ? ethers.formatUnits(depositAmount, 18) : '0'}
                  </span>
                </div>
              </div>
              
              {!isRegistered ? (
                <button
                  onClick={handleRegister}
                  className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Register as Provider ({registrationFee} USDC)
                </button>
              ) : (
                <div className="mt-6 space-y-4">
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-semibold transition-colors"
                  >
                    Request Refund
                  </button>
                  <p className="text-sm text-emerald-600 text-center">
                    You are currently registered as a provider
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
              <h3 className="text-lg font-semibold text-emerald-700 mb-4">
                Provider Benefits
              </h3>
              <ul className="space-y-3">
                {[
                  'Earn oracle fees for providing data',
                  'Participate in multiple markets simultaneously',
                  'Build reputation as a reliable data provider',
                  'Receive rewards for accurate data submissions',
                  'Early access to new arbitration markets',
                ].map((benefit, index) => (
                  <li key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
              <h3 className="text-lg font-semibold text-emerald-700 mb-4">
                Provider Responsibilities
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="font-medium text-amber-800 mb-2">Data Accuracy</div>
                  <p className="text-sm text-amber-700">
                    Providers must submit accurate data from verified sources. Inaccurate submissions may result in penalties.
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="font-medium text-blue-800 mb-2">Timeliness</div>
                  <p className="text-sm text-blue-700">
                    Votes must be submitted before market expiry. Late submissions are not accepted.
                  </p>
                </div>
                
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="font-medium text-purple-800 mb-2">Security</div>
                  <p className="text-sm text-purple-700">
                    Keep your provider credentials secure. Do not share your private keys or signing authority.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
              <h3 className="text-lg font-semibold text-emerald-700 mb-4">
                Refund Policy
              </h3>
              <div className="space-y-3 text-emerald-700">
                <p>
                  The registration fee is refundable if you choose to stop being a provider.
                </p>
                <p>
                  Refunds can only be processed if 7 days' worth of data is provided.
                </p>
                <p className="text-sm text-emerald-600">
                  Note: Any pending arbitration participation must be completed before refund processing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 退款确认模态框 */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full fade-in">
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-red-700">Request Refund</h3>
                  <p className="text-red-600">Confirm provider registration refund</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700">
                  Are you sure you want to request a refund? This will:
                </p>
                <ul className="mt-2 space-y-1 text-red-600 text-sm">
                  <li>• Remove your provider status</li>
                  <li>• Refund {registrationFee} USDC to your wallet</li>
                  <li>• Prevent participation in future markets</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="px-4 py-2 text-emerald-600 hover:text-emerald-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefund}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Confirm Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterProviderPage;
