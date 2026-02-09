import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
const web3 = new Web3(provider);

const PRIVATE_KEY = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractPath = path.resolve(__dirname, "../artifacts/contracts/PredictiveMaintenanceMultiRecord.sol/PredictiveMaintenanceMultiRecord.json");

const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const { abi, bytecode } = contractJson;

async function deploy() {
  const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;

  console.log("Deploying PredictiveMaintenanceMultiRecord contract from account:", account.address);

  const contract = new web3.eth.Contract(abi);

  const deployTx = contract.deploy({
    data: bytecode,
    arguments: [],
  });

  console.log("Deploying PredictiveMaintenanceMultiRecord contract...");
  const gas = await deployTx.estimateGas();
  console.log(`Estimated deployment gas: ${gas.toLocaleString()}`);

  const deployedContract = await deployTx.send({
    from: account.address,
    gas,
  });

  console.log("Contract deployed at address:", deployedContract.options.address);
  
  const deploymentInfo = {
    contractAddress: deployedContract.options.address,
    contractName: "PredictiveMaintenanceMultiRecord",
    deployedAt: new Date().toISOString(),
    deployer: account.address,
    deploymentGas: gas.toString()
  };
  
  fs.writeFileSync(
    path.resolve(__dirname, "../contract-address-multirecord.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Contract address saved to contract-address-multirecord.json");
}

deploy().catch((error) => {
  console.error("Error deploying contract:", error);
});
