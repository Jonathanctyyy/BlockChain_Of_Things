import { task } from "hardhat/config";

export default {
  solidity: "0.8.18",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
};
