async function RegistProvider(echoOptimisticOracle) {
  try {
    const registProvider = await echoOptimisticOracle.registProvider();
    const registProviderTx = await registProvider.wait();
    console.log("registProvider:", registProviderTx.hash);
  } catch (e) {
    console.log("registProvider fail:", e);
  }
}

async function Exit(echoOptimisticOracle) {
  try {
    const exit = await echoOptimisticOracle.exit();
    const exitTx = await exit.wait();
    console.log("exit:", exitTx.hash);
  } catch (e) {
    console.log("exit fail:", e);
  }
}

async function DisruptRandom(echoOptimisticOracle, id) {
  try {
    const disruptRandom = await echoOptimisticOracle.disruptRandom(id);
    const disruptRandomTx = await disruptRandom.wait();
    console.log("disruptRandom:", disruptRandomTx.hash);
  } catch (e) {
    console.log("disruptRandom fail:", e);
  }
}

async function SubmitData(
  echoOptimisticOracle,
  id,
  ifYes,
  randomNumber,
  dataSource
) {
  try {
    const submitData = await echoOptimisticOracle.submitData(
      id,
      ifYes,
      randomNumber,
      dataSource
    );
    const submitDataTx = await submitData.wait();
    console.log("submitData:", submitDataTx.hash);
  } catch (e) {
    console.log("submitData fail:", e);
  }
}

async function Challenge(echoOptimisticOracle, id, evidence) {
  try {
    const challenge = await echoOptimisticOracle.challenge(id, evidence);
    const challengeTx = await challenge.wait();
    console.log("challenge:", challengeTx.hash);
  } catch (e) {
    console.log("challenge fail:", e);
  }
}

async function DisputeVote(echoOptimisticOracle, id) {
  try {
    const disputeVote = await echoOptimisticOracle.disputeVote(id);
    const disputeVoteTx = await disputeVote.wait();
    console.log("disputeVote:", disputeVoteTx.hash);
  } catch (e) {
    console.log("disputeVote fail:", e);
  }
}

async function WithdrawEarn(echoOptimisticOracle, id) {
  try {
    const withdrawEarn = await echoOptimisticOracle.withdrawEarn(id);
    const withdrawEarnTx = await withdrawEarn.wait();
    console.log("withdrawEarn:", withdrawEarnTx.hash);
  } catch (e) {
    console.log("withdrawEarn fail:", e);
  }
}

async function WithdrawDispute(echoOptimisticOracle, id) {
  try {
    const withdrawDispute = await echoOptimisticOracle.withdrawDispute(id);
    const withdrawDisputeTx = await withdrawDispute.wait();
    console.log("withdrawDispute:", withdrawDisputeTx.hash);
  } catch (e) {
    console.log("withdrawDispute fail:", e);
  }
}

async function GetOracleInfo(echoOptimisticOracle, id) {
  try {
    const oracleInfo = await echoOptimisticOracle.getOracleInfo(id);
    console.log("oracleInfo:", oracleInfo);
    return oracleInfo;
  } catch (e) {
    console.log("Get oracleInfo fail:", e);
  }
}

async function GetSubmitDataInfo(echoOptimisticOracle, user, id) {
  try {
    const submitDataInfo = await echoOptimisticOracle.getSubmitDataInfo(
      user,
      id
    );
    console.log("submitDataInfo:", submitDataInfo);
    return submitDataInfo;
  } catch (e) {
    console.log("Get submitDataInfo fail:", e);
  }
}

export {
  RegistProvider,
  Exit,
  DisruptRandom,
  SubmitData,
  Challenge,
  DisputeVote,
  WithdrawEarn,
  WithdrawDispute,
  GetOracleInfo,
  GetSubmitDataInfo,
};
