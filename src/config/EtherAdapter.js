import { useMemo } from "react";
import { BrowserProvider, JsonRpcSigner } from 'ethers'; 
import { useConnectorClient } from 'wagmi';

/**
 * 将 viem/wagmi Client 对象转换为 ethers.js Signer 对象。
 * @param {import('viem').Client<import('viem').Transport, import('viem').Chain, import('viem').Account>} client 
 * @returns {import('ethers').JsonRpcSigner}
 */
export function ClientToSigner(client) {
    const { account, chain, transport } = client
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    }
    // 注意：BrowserProvider 在 ethers v6 中可能需要处理 transport 的兼容性
    const provider = new BrowserProvider(transport, network)
    const signer = new JsonRpcSigner(provider, account.address)
    return signer
  }
  
  /** * Hook 用于将 viem Wallet Client 转换为 ethers.js Signer。 
   * @param {{ chainId?: number }} [options]
   * @returns {import('ethers').JsonRpcSigner | undefined}
   */
  export function UseEthersSigner(options = {}) {
    const { chainId } = options;
    const { data: client } = useConnectorClient({ chainId });
    return useMemo(() => {
      return client ? ClientToSigner(client) : undefined;
    }, [client]);
  }