const FlightSuretyApp = artifacts.require("FlightSuretyApp");
const FlightSuretyData = artifacts.require("FlightSuretyData");

const Config = async function (accounts) {
  // These test addresses are useful when you need to add
  // multiple users in test scripts
  const testAddresses = [
    "0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef",
    "0x821aEa9a577a9b44299B9c15c88cf3087F3b5544",
    "0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2",
    "0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e",
    "0x2191eF87E392377ec08E7c08Eb105Ef5448eCED5",
    "0x0F4F2Ac550A1b4e2280d04c21cEa7EBD822934b5",
    "0x6330A553Fc93768F612722BB8c2eC78aC90B3bbc",
    "0x5AEDA56215b167893e80B4fE645BA6d5Bab767DE",
    "0xE44c4cf797505AF1527B11e4F4c6f95531b4Be24",
    "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
  ];

  const owner = accounts[0];
  const firstAirline = accounts[1];

  const flightSuretyData = await FlightSuretyData.new();
  const flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

  return {
    owner,
    firstAirline,
    weiMultiple: web3.utils.toBN(10).pow(web3.utils.toBN(18)).toString(),
    testAddresses,
    flightSuretyData,
    flightSuretyApp,
  };
};

module.exports = {
  Config: Config,
};
