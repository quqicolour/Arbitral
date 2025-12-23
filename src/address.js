import addresses from "./config/addresses.json";
const resolveChainId = () => {
  const envId = Number(process.env.REACT_APP_CHAIN_ID);
  if (envId) return String(envId);
  const w = typeof window !== "undefined" ? window : undefined;
  const hex = w && w.ethereum && w.ethereum.chainId;
  if (hex) {
    try {
      return String(parseInt(hex, 16));
    } catch { }
  }
  return "421614";
};
const current = addresses[resolveChainId()] || addresses["421614"];
const USDCAddress = current.USDC;
const AroundPoolFactoryAddress = current.AroundPoolFactory;
const AroundMarketAddress = current.AroundMarket;
const EchoOptimisticOracleAddress = current.EchoOptimisticOracle;
const AroundUIHelperAddress = current.AroundUIHelper;

export {
  USDCAddress,
  AroundPoolFactoryAddress,
  AroundMarketAddress,
  EchoOptimisticOracleAddress,
  AroundUIHelperAddress,
};
