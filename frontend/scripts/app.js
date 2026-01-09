import Web3 from 'web3';

let web3;
let contract;

// Replace with your deployed contract address and ABI
const contractAddress = "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f"; // Replace with your contract address
const contractABI = [
  {
    "inputs": [],
    "name": "getAnomalyMachineIDs",
    "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }],
    "stateMutability": "view",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "getMerkleRoot",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function",
  },
];

// Connect to MetaMask
async function connectToMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      document.getElementById('walletAddress').textContent = `Wallet Address: ${account}`;
      web3 = new Web3(window.ethereum);
      console.log('MetaMask connected:', account);

      // Initialize the contract
      contract = new web3.eth.Contract(contractABI, contractAddress);
      console.log('Contract initialized:', contract);
    } catch (error) {
      console.error('User rejected MetaMask connection:', error);
    }
  } else {
    alert('MetaMask is not installed. Please install MetaMask and try again.');
  }
}

// Fetch Blockchain Data
async function fetchBlockchainData() {
  if (contract) {
    try {
      // Fetch Merkle Root
      const merkleRoot = await contract.methods.getMerkleRoot().call();
      console.log('Merkle Root:', merkleRoot);

      // Display Merkle Root
      const blockchainContainer = document.getElementById('blockchain');
      blockchainContainer.textContent = `Merkle Root: ${merkleRoot}`;
    } catch (error) {
      console.error('Error fetching blockchain data:', error);
    }
  }
}

// Display Transaction Hash
function displayTransactionHash(txHash) {
  const transactionHashElement = document.getElementById('transactionHash');
  transactionHashElement.textContent = `Transaction Hash: ${txHash}`;
}

// Example: Simulate a transaction and display the hash
async function simulateTransaction() {
  try {
    // Simulate a transaction (replace with actual transaction logic)
    const txHash = "0x76c960a2be12f3087fd9f1cd77c9b3624a64eb69c3b2b5e7496e73b2c1685e21";
    console.log('Transaction successful! Hash:', txHash);

    // Display the transaction hash on the frontend
    displayTransactionHash(txHash);
  } catch (error) {
    console.error('Error simulating transaction:', error);
  }
}

// Initialize the app
async function init() {
  document.getElementById('connectMetaMask').addEventListener('click', connectToMetaMask);
  document.getElementById('checkDataBtn').addEventListener('click', simulateTransaction);

  // Fetch blockchain data on load
  fetchBlockchainData();
}

init();