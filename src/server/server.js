const FlightSuretyApp = require("../../build/contracts/FlightSuretyApp.json");
const Config = require("./config.json");
const Web3 = require("web3");
const express = require("express");

(async function () {
  let config = Config["localhost"];
  let web3 = new Web3(
    new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
  );
  const accounts = await web3.eth.getAccounts();
  let flightSuretyApp = new web3.eth.Contract(
    FlightSuretyApp.abi,
    config.appAddress
  );
  console.log(config.appAddress);
  flightSuretyApp.events
    .OracleRequest()
    .on("data", (event) => {
      console.log(event);
    })
    .on("error", (error) => console.log(error));
})();

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!",
  });
});

module.exports = app;
