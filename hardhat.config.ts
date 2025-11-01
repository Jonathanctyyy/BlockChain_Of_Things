import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import * as dotenv from "dotenv";
dotenv.config();

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    localhost: {},
    goerli: {
      url: ALCHEMY_API_KEY ? `https://eth-goerli.g.alchemy.com/v2/${ALCHEMY_API_KEY}` : "",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  }
};
export default config;
