export async function GetMarketId(aroundPoolFactory){
    try{
        const marketId = await aroundPoolFactory.marketId();
        console.log("marketId:", marketId);
        return marketId;
    }catch(e) {
        console.log("Get last market id fail:", e);
    }
}