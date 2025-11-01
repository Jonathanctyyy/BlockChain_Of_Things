import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import dotenv from "dotenv";

dotenv.config();

const { INFURA_PROJECT_ID, DEPLOYER_PRIVATE_KEY } = process.env;

export default {
  solidity: "0.8.4",
  networks: {
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${INFURA_PROJECT_ID}`,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
    },
  },
};