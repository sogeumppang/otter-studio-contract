require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  networks: {
    localhost: {
      chainId: 31337,
    },
    ganache: {
      url: "HTTP://127.0.0.1:7545",
      // accounts: [myPrivateKey],
    },
    cronosTestnet: {
      url: "https://evm-t3.cronos.org/",
      chainId: 338,
      // accounts: [myPrivateKey],
      gasPrice: 5000000000000,
    },
    cronos: {
      url: "https://evm.cronos.org/",
      chainId: 25,
      // accounts: [myPrivateKey],
      gasPrice: 5000000000000,
    },
  },
  etherscan: {
    apiKey: {
      // mainnet: <string>process.env["ETHERSCAN_API_KEY"],
      // cronosTestnet: <string>process.env["CRONOSCAN_TESTNET_API_KEY"],
      // cronos: <string>process.env["CRONOSCAN_API_KEY"],
    },
    customChains: [
      {
        network: "cronosTestnet",
        chainId: 338,
        urls: {
          apiURL: "https://cronos.org/explorer/testnet3/api",
          browserURL: "https://cronos.org/explorer/testnet3",
        },
      },
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://api.cronoscan.com/api",
          browserURL: "https://cronoscan.com",
        },
      },
    ],
  },
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  // gasReporter: {
  //   currency: "USD",
  //   gasPrice: 5000, // In GWei
  //   coinmarketcap: <string>process.env["COINMARKETCAP_API"],
  // },
};
