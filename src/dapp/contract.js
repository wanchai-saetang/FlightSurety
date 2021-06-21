import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(config.url.replace("http", "ws"));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.flightSuretyData = new this.web3.eth.Contract(
      FlightSuretyData.abi,
      config.dataAddress
    );
    this.initialize(callback);
    this.owner = null;
    // this.airlines = [];
    // this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];

      // let counter = 1;

      // while (this.airlines.length < 5) {
      //   this.airlines.push(accts[counter++]);
      // }

      // while (this.passengers.length < 5) {
      //   this.passengers.push(accts[counter++]);
      // }

      callback();
    });
  }

  getAllFlight(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .getAllFlight()
      .call({ from: self.owner }, callback);
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  buy(airline, flight, timestamp, callback) {
    let self = this;
    self.flightSuretyData.methods
      // .buy(btn.dateset.airline, btn.dateset.flight, btn.dateset.timestamp)
      .buy(airline, flight, this.web3.utils.toBN(timestamp))
      .send(
        { from: self.owner, value: this.web3.utils.toWei("1"), gas: 3000000 },
        callback
      )
      .on("error", (err, recp) => {
        alert(err);
      });
  }

  fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.airlines[0],
      flight: flight,
      timestamp: Math.floor(Date.now() / 1000),
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }

  watchFlightStatus(callback) {
    this.flightSuretyApp.events.FlightStatusInfo().on("data", (event) => {
      console.log(`====> Return status: ${event.returnValues.status} <====`);
      callback(event);
    });
  }
}
