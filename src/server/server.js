const FlightSuretyApp = require("../../build/contracts/FlightSuretyApp.json");
const FlightSuretyData = require("../../build/contracts/FlightSuretyData.json");
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
  STATUS_CODE_UNKNOWN,
  STATUS_CODE_LATE_WEATHER,
  STATUS_CODE_LATE_TECHNICAL,
  STATUS_CODE_LATE_OTHER,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_ON_TIME,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
  STATUS_CODE_LATE_AIRLINE,
];

function randomStatus(minValue = 0, maxValue = PROBABILITY.length) {
  const index = Math.floor(Math.random() * (maxValue - minValue) + minValue);
  return PROBABILITY[index];
}

function randomFlight() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const firstChar = characters[Math.floor(Math.random() * characters.length)];
  const secondChar = characters[Math.floor(Math.random() * characters.length)];
  const thirdChar = characters[Math.floor(Math.random() * characters.length)];
  const fourthChar = characters[Math.floor(Math.random() * characters.length)];
  const firstNumber = Math.floor(Math.random() * 10);
  const secondNumber = Math.floor(Math.random() * 10);
  return `${firstChar}${secondChar}${thirdChar}${fourthChar}${firstNumber}${secondNumber}`;
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
  let flightSuretyData = new web3.eth.Contract(
    FlightSuretyData.abi,
    config.dataAddress
  );
  console.log(`Contract address: ${config.appAddress}`);

  const accounts = await web3.eth.getAccounts();

  // register airlines
  // const balance = await web3.eth.getBalance(accounts[0]);
  // console.log(balance);
  // const airFund = await flightSuretyData.methods
  //   .getAirlineFunded(accounts[0])
  //   .call();
  // console.log(airFund);
  try {
    await flightSuretyData.methods
      .registerAirline(accounts[1])
      .send({ from: accounts[0], gas: 3000000 });
  } catch (err) {
    console.log(`this airline already exists`);
  }
  try {
    await flightSuretyData.methods
      .registerAirline(accounts[2])
      .send({ from: accounts[0], gas: 3000000 });
  } catch (err) {
    console.log(`this airline already exists`);
  }
  try {
    await flightSuretyData.methods
      .registerAirline(accounts[3])
      .send({ from: accounts[0], gas: 3000000 });
  } catch (err) {
    console.log(`this airline already exists`);
  }
  try {
    await flightSuretyData.methods
      .registerAirline(accounts[4])
      .send({ from: accounts[0], gas: 3000000 });
  } catch (err) {
    console.log(`this airline already exists`);
  }

  await flightSuretyData.methods.fund().send({
    from: accounts[1],
    value: web3.utils.toWei("10"),
    gas: 3000000,
  });
  await flightSuretyData.methods.fund().send({
    from: accounts[2],
    value: web3.utils.toWei("10"),
    gas: 3000000,
  });
  await flightSuretyData.methods.fund().send({
    from: accounts[3],
    value: web3.utils.toWei("10"),
    gas: 3000000,
  });
  await flightSuretyData.methods.fund().send({
    from: accounts[4],
    value: web3.utils.toWei("10"),
    gas: 3000000,
  });

  // register flights
  console.log("Register Flights");
  for (i = 0; i < 4; i++) {
    const airline = accounts[i + 1];
    const flight = randomFlight();
    const timestamp = new Date();
    timestamp.setDate(timestamp.getDate() + Math.floor(Math.random() * 10));
    console.log(`${airline} : ${flight} : ${timestamp}`);
    try {
      await flightSuretyApp.methods
        .registerFlight(airline, flight, Date.parse(timestamp))
        .send({ from: accounts[0], gas: 3000000 });
    } catch (err) {
      console.log(err);
    }
  }
  // const airline = accounts[1];
  // const flight = "BKKJFK";
  // const timestamp = 1624179600;
  // await config.flightSuretyApp.registerFlight(airline, flight, timestamp);

  // register oracles
  const fee = await flightSuretyApp.methods.getRegistrationFee().call();
  const oracleNumber = 40;
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

  // watch oracle request
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
            console.log(
              `Match Oracle : ${oracleIndexes}, Match Index : ${idx}`
            );
          } catch (err) {}
        }
      }
    })
    .on("error", (error) => console.log(error));

  // watch flight status submit
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
