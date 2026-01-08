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
const contractPath = path.resolve(__dirname, "../artifacts/contracts/AnomalyDetection.sol/AnomalyDetection.json");

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
  // Updated constructor arguments for adjusted thresholds
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: [
      150, // minVoltage
      200, // maxVoltage
      360, // minRotation
      520, // maxRotation
      75,  // minPressure
      110, // maxPressure
      45,  // maxVibration
    ],
  });

  console.log("Deploying contract with adjusted thresholds:", {
    minVoltage: 150,
    maxVoltage: 200,
    minRotation: 360,
    maxRotation: 520,
    minPressure: 75,
    maxPressure: 110,
    maxVibration: 45,
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