import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { useClient, useConnectorClient, useChainId, useAccount } from 'wagmi';
import { BrowserProvider, JsonRpcSigner, FallbackProvider, JsonRpcProvider } from 'ethers';
import addressesMap from '../config/addresses.json';

const Ctx = createContext({ provider: undefined, signer: undefined, chainId: undefined, addresses: {} });

function clientToProvider(client) {
  if (!client) return undefined;
  const { chain, transport } = client;
  const network = { chainId: chain.id, name: chain.name, ensAddress: chain.contracts?.ensRegistry?.address };
  const mantleEnv = (typeof process !== 'undefined' && process?.env?.REACT_APP_MANTLE_RPC_URL) || '';
  const arbEnv = (typeof process !== 'undefined' && process?.env?.REACT_APP_ARB_RPC_URL) || '';
  if (Number(chain.id) === 5003 && mantleEnv && mantleEnv.trim()) {
    return new JsonRpcProvider(mantleEnv.trim(), network);
  }
  if (Number(chain.id) === 421614 && arbEnv && arbEnv.trim()) {
    return new JsonRpcProvider(arbEnv.trim(), network);
  }
  if (transport?.type === 'fallback') {
    const providers = (transport.transports || []).map(({ value }) => new JsonRpcProvider(value?.url, network));
    if (providers.length === 1) return providers[0];
    return new FallbackProvider(providers);
  }
  return new JsonRpcProvider(transport?.url, network);
}

function clientToSigner(client) {
  if (!client) return undefined;
  const { account, chain, transport } = client;
  const network = { chainId: chain.id, name: chain.name, ensAddress: chain.contracts?.ensRegistry?.address };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

export function EthersProvider({ children }) {
  const publicClient = useClient();
  const { data: walletClient } = useConnectorClient();
  const wagmiChainId = useChainId();
  const { address } = useAccount();

  const provider = useMemo(() => clientToProvider(publicClient), [publicClient]);
  const signer = useMemo(() => clientToSigner(walletClient), [walletClient]);
  const chainId = useMemo(() => {
    const id = publicClient?.chain?.id ?? wagmiChainId;
    return Number.isFinite(Number(id)) ? Number(id) : undefined;
  }, [publicClient, wagmiChainId]);
  const addresses = useMemo(() => {
    const key = String(chainId || '');
    return addressesMap?.[key] || {};
  }, [chainId]);

  const value = useMemo(() => ({ provider, signer, chainId, addresses }), [provider, signer, chainId, addresses]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEthers() {
  return useContext(Ctx);
}
export function EthersAutoReload() {
  const chainId = useChainId();
  const { address } = useAccount();
  const prev = useRef({ initialized: false, chainId: undefined, address: undefined });
  const timer = useRef(null);
  useEffect(() => {
    const currAddr = address || undefined;
    const currChain = Number.isFinite(Number(chainId)) ? Number(chainId) : undefined;
    if (!prev.current.initialized) {
      prev.current = { initialized: true, chainId: currChain, address: currAddr };
      return;
    }
    const changed =
      ((prev.current.chainId !== undefined && currChain !== undefined && prev.current.chainId !== currChain) ||
       (prev.current.address !== undefined && currAddr !== undefined && prev.current.address !== currAddr));
    if (changed) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (typeof window !== 'undefined') {
          const key = `${currChain || ''}:${currAddr || ''}`;
          const last = window.sessionStorage.getItem('autoReloadGuard');
          if (last !== key) {
            window.sessionStorage.setItem('autoReloadGuard', key);
            window.location.reload();
          }
        }
      }, 200);
    }
    prev.current = { initialized: true, chainId: currChain, address: currAddr };
    }, [chainId, address]);
  return null;
}
