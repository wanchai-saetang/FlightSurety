const FlightSuretyApp = require("../../build/contracts/FlightSuretyApp.json");
const Config = require("./config.json");
const Web3 = require("web3");
const express = require("express");

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const PROBABILITY = [
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
];

function randomStatus(minValue = 0, maxValue = PROBABILITY.length) {
  const index = Math.floor(Math.random() * (maxValue - minValue) + minValue);
  return PROBABILITY[index];
}

(async function () {
  let config = Config["localhost"];
  let web3 = new Web3(
    new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
  );

  // initial contract
  let flightSuretyApp = new web3.eth.Contract(
    FlightSuretyApp.abi,
    config.appAddress
  );
  console.log(`Contract address: ${config.appAddress}`);
  const accounts = await web3.eth.getAccounts();
  const fee = await flightSuretyApp.methods.getRegistrationFee().call();
  const oracleNumber = 20;
  for (let i = 0; i < oracleNumber; i++) {
    await flightSuretyApp.methods.registerOracle().send({
      from: accounts[i + 1],
      value: fee,
      gas: 3000000,
    });
    const result = await flightSuretyApp.methods.getMyIndexes().call({
      from: accounts[i + 1],
    });
    console.log(
      `${i + 1}.) Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`
    );
  }

  flightSuretyApp.events
    .OracleRequest()
    .on("data", async (event) => {
      for (let i = 0; i < oracleNumber; i++) {
        const oracleIndexes = await flightSuretyApp.methods
          .getMyIndexes()
          .call({
            from: accounts[i + 1],
          });

        for (let idx = 0; idx < 3; idx++) {
          const randomValue = randomStatus();
          try {
            await flightSuretyApp.methods
              .submitOracleResponse(
                oracleIndexes[idx],
                event.returnValues.airline,
                event.returnValues.flight,
                event.returnValues.timestamp,
                randomValue
              )
              .send({ from: accounts[i + 1], gas: 3000000 });
            console.log(`${oracleIndexes} : ${idx}`);
          } catch (err) {}
        }
      }
    })
    .on("error", (error) => console.log(error));

  flightSuretyApp.events.FlightStatusInfo().on("data", (event) => {
    console.log(`====> Return status: ${event.returnValues.status} <====`);
  });
})();

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

module.exports = app;
