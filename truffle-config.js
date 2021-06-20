const HDWalletProvider = require("@truffle/hdwallet-provider");
const infuraKey = ""; // removed
const mnemonic = "";
const mnemonicLocal =
  "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat"; // removed

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*", // Match any network id
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          `https://rinkeby.infura.io/v3/${infuraKey}`
        ),
      network_id: 4,
    },
  },
  compilers: {
    solc: {
      version: "^0.8.0",
    },
  },
};
