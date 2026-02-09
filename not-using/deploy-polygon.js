import Web3 from "web3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Polygon network selection
const NETWORK = process.env.POLYGON_NETWORK || "polygonAmoy"; // Options: polygon, polygonAmoy, polygonMumbai

const NETWORK_CONFIGS = {
  polygon: {
    rpc: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    chainId: 137,
    name: "Polygon Mainnet",
    explorer: "https://polygonscan.com"
  },
  polygonAmoy: {
    rpc: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
    chainId: 80002,
    name: "Polygon Amoy Testnet",
    explorer: "https://amoy.polygonscan.com"
  },
  polygonMumbai: {
    rpc: process.env.POLYGON_MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
    chainId: 80001,
    name: "Polygon Mumbai Testnet",
    explorer: "https://mumbai.polygonscan.com"
  }
};

const config = NETWORK_CONFIGS[NETWORK];
if (!config) {
  throw new Error(`Invalid network: ${NETWORK}. Choose: polygon, polygonAmoy, or polygonMumbai`);
}

// Initialize Web3 with Polygon network
const provider = new Web3.providers.HttpProvider(config.rpc);
const web3 = new Web3(provider);

// Get private key from environment
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;
if (!PRIVATE_KEY) {
  throw new Error("POLYGON_PRIVATE_KEY not set in .env file!");
}

// Resolve the contract path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const contractPath = path.resolve(__dirname, "../artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json");

// Read the compiled contract's ABI and bytecode
const contractJson = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const { abi, bytecode } = contractJson;

async function deploy() {
  console.log('='.repeat(80));
  console.log(`🚀 DEPLOYING TO ${config.name.toUpperCase()}`);
  console.log('='.repeat(80));
  
  const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);
  web3.eth.defaultAccount = account.address;

  console.log(`📍 Network: ${config.name} (Chain ID: ${config.chainId})`);
  console.log(`🔗 RPC: ${config.rpc}`);
  console.log(`👤 Deploying from: ${account.address}`);

  // Check balance
  const balance = await web3.eth.getBalance(account.address);
  const balanceMATIC = web3.utils.fromWei(balance, 'ether');
  console.log(`💰 Balance: ${balanceMATIC} MATIC`);

  if (parseFloat(balanceMATIC) < 0.01) {
    console.log('\n⚠️  WARNING: Low balance!');
    if (NETWORK !== 'polygon') {
      console.log(`Get test MATIC from: https://faucet.polygon.technology/`);
    }
    console.log('');
  }

  const contract = new web3.eth.Contract(abi);

  // Deploy contract
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: [],
  });

  console.log("\n⏳ Estimating gas...");
  const gas = await deployTx.estimateGas();
  const gasPrice = await web3.eth.getGasPrice();
  const estimatedCost = (BigInt(gas) * BigInt(gasPrice)) / BigInt(10**18);

  console.log(`⛽ Estimated Gas: ${gas}`);
  console.log(`💸 Gas Price: ${web3.utils.fromWei(gasPrice, 'gwei')} Gwei`);
  console.log(`💰 Estimated Cost: ~${estimatedCost.toString().slice(0, 6)} MATIC`);

  console.log("\n🔨 Deploying PredictiveMaintenance contract...");
  const deployedContract = await deployTx.send({
    from: account.address,
    gas: Math.floor(gas * 1.2), // Add 20% buffer
    gasPrice: gasPrice
  });

  const contractAddress = deployedContract.options.address;
  
  console.log('\n' + '='.repeat(80));
  console.log("✅ CONTRACT DEPLOYED SUCCESSFULLY!");
  console.log('='.repeat(80));
  console.log(`📍 Address: ${contractAddress}`);
  console.log(`🔍 Explorer: ${config.explorer}/address/${contractAddress}`);
  console.log('='.repeat(80));

  // Save deployment info
  const deploymentInfo = {
    contractAddress: contractAddress,
    network: config.name,
    chainId: config.chainId,
    deployer: account.address,
    deployedAt: new Date().toISOString(),
    explorerUrl: `${config.explorer}/address/${contractAddress}`,
    transactionHash: deployedContract._requestManager.provider.lastTransactionHash
  };

  // Update contract-address.json
  fs.writeFileSync(
    path.resolve(__dirname, "../contract-address.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("📄 Deployment info saved to contract-address.json");
  
  // Save network-specific deployment info
  const networkDeploymentPath = path.resolve(__dirname, `../deployment-${NETWORK}.json`);
  fs.writeFileSync(
    networkDeploymentPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`📄 Network-specific info saved to deployment-${NETWORK}.json`);

  console.log('\n📝 NEXT STEPS:');
  console.log('1. Update your scripts to use the new contract address');
  console.log('2. Update frontend to connect to Polygon network');
  console.log('3. Verify contract on PolygonScan (optional):');
  console.log(`   npx hardhat verify --network ${NETWORK} ${contractAddress}`);
}

deploy().catch((error) => {
  console.error("\n❌ Error deploying contract:", error);
  process.exit(1);
});
