import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Replace with your local blockchain provider (e.g., Hardhat or Ganache)
const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
const web3 = new Web3(provider);

// Replace with the private key of the account you want to deploy from
const PRIVATE_KEY = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

// Resolve the contract path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractPath = path.resolve(__dirname, "../artifacts/contracts/AnonmalyDetection.sol/AnomalyDetection.json");

// Read the compiled contract's ABI and bytecode
const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const { abi, bytecode } = contractJson;

async function deploy() {
  const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;

  console.log("Deploying contract from account:", account.address);

  const contract = new web3.eth.Contract(abi);

  // Pass constructor arguments here
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: [10, 100], // Replace with your desired minThreshold and maxThreshold
  });

  const gas = await deployTx.estimateGas();
  const deployedContract = await deployTx.send({
    from: account.address,
    gas,
  });

  console.log("Contract deployed at address:", deployedContract.options.address);
}

deploy().catch((error) => {
  console.error("Error deploying contract:", error);
});