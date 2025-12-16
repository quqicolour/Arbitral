export async function GetMarketsData(aroundUIHelper, index, size) {
    try{
        const batchIndexMarketData = await aroundUIHelper.batchIndexMarketData(index, size);
        console.log("batchIndexMarketData:", batchIndexMarketData);
        return batchIndexMarketData;
    }catch(e) {
        console.log("Get market data:", e);
    }
}