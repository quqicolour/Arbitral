export async function GetMarketsData(aroundUIHelper, index, size) {
    const batchIndexMarketData = await aroundUIHelper.batchIndexMarketData(index, size);
    console.log("batchIndexMarketData:", batchIndexMarketData);
    return batchIndexMarketData;
}
