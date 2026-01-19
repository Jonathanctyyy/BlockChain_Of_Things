let web3;
let contract;

// Replace with your deployed contract address and ABI
const contractAddress = "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f"; // Replace with your contract address
const contractABI = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_machineID",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "_merkleRoot",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "_hasAnomaly",
        "type": "bool"
      }
    ],
    "name": "storeProof",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "machineLedger",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "merkleRoot",
        "type": "bytes32"
      },
      {
        "internalType": "bool",
        "name": "hasAnomaly",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "machineID",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "DataAnchored",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "machineID",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "AnomalyDetected",
    "type": "event"
  }
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

// Fetch anchors for a specific machineID from the machineLedger mapping
async function getAnchorsForMachine(machineID) {
  if (!contract) {
    throw new Error('Contract not initialized. Connect MetaMask first.');
  }

  const anchors = [];
  let index = 0;
  while (true) {
    try {
      const anchor = await contract.methods.machineLedger(machineID, index).call();
      // Check if the anchor is default/empty (timestamp 0 indicates end)
      if (parseInt(anchor.timestamp) === 0 && anchor.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000' && !anchor.hasAnomaly) {
        break;
      }
      anchors.push(anchor);
      index++;
    } catch (error) {
      // Out of bounds or other error: stop looping
      break;
    }
  }
  return anchors;
}

// Fetch and display blockchain data for the entered machine ID
async function fetchAndDisplayMachineData() {
    const machineID = document.getElementById('machineID').value.trim();
    if (!machineID) {
        alert('Please enter a Machine ID.');
        return;
    }

    if (!contract) {
        alert('Please connect MetaMask first.');
        return;
    }

    try {
        const blockchainContainer = document.getElementById('blockchain');
        const resultElement = document.getElementById('result');

        let displayText = `Blockchain Data for Machine ID: ${machineID}\n`;
        let hasAnyAnomaly = false;
        let index = 0;
        console.log('Fetching blockchain data for Machine ID:', machineID);

        while (true) {
            try {
                // Fetch data for the given machine ID and index
                const anchor = await contract.methods.machineLedger(machineID, index).call();
                console.log(`Fetched anchor at index ${index}:`, anchor);
                // Check if the anchor is default/empty (indicating no more data)
                if (parseInt(anchor.timestamp) === 0 && anchor.merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000' && !anchor.hasAnomaly) {
                    break;
                }

                const date = new Date(parseInt(anchor.timestamp) * 1000).toLocaleString();
                displayText += `Record ${index + 1}:\n`;
                displayText += `  Timestamp: ${date} (${anchor.timestamp})\n`;
                displayText += `  Merkle Root: ${anchor.merkleRoot}\n`;
                displayText += `  Anomaly Detected: ${anchor.hasAnomaly ? 'Yes ⚠️' : 'No ✅'}\n\n`;

                if (anchor.hasAnomaly) hasAnyAnomaly = true;
                index++;
            } catch (error) {
                // Stop fetching if an error occurs (e.g., out of bounds)
                break;
            }
        }

        if (index === 0) {
            blockchainContainer.textContent = `No blockchain data found for Machine ID: ${machineID}`;
            resultElement.textContent = 'No anomalies or records stored on the blockchain.';
        } else {
            blockchainContainer.textContent = displayText;
            resultElement.textContent = hasAnyAnomaly ? 'Anomaly detected in one or more records!' : 'No anomalies detected.';
        }
    } catch (error) {
        console.error('Error fetching blockchain data:', error);
        alert('Error fetching blockchain data. Check console for details.');
    }
}

// Fetch transaction details for a specific machine ID
async function fetchTransactionDetails(machineID) {
    try {
        const response = await fetch('../transaction_log.json');
        const data = await response.json();

        // Find the transaction for the given machine ID
        const transaction = data.find(tx => tx.machineID === machineID);

        if (!transaction) {
            console.error(`No transaction found for Machine ID: ${machineID}`);
            alert(`No transaction details available for Machine ID: ${machineID}`);
            return;
        }

        // Update the HTML with transaction details
        document.getElementById('txHash').textContent = transaction.transactionHash;
        document.getElementById('gasUsed').textContent = transaction.gasUsed;
        document.getElementById('fromAccount').textContent = transaction.from;
        document.getElementById('toAccount').textContent = transaction.to;
        document.getElementById('txTimestamp').textContent = new Date(transaction.timestamp * 1000).toLocaleString();
    } catch (error) {
        console.error('Error fetching transaction details:', error);
    }
}

// Initialize the app
async function init() {
  document.getElementById('connectMetaMask').addEventListener('click', connectToMetaMask);
  document.getElementById('checkDataBtn').addEventListener('click', async () => {
    const machineID = document.getElementById('machineID').value.trim();
    if (!machineID) {
        alert('Please enter a Machine ID.');
        return;
    }

    // await fetchAndDisplayMachineData();
    await fetchTransactionDetails(machineID);
  });

  // Optional: Fetch default data on load if desired, but requires a default machineID
  fetchAndDisplayMachineData();
}

init();
console.log("app.js is connected!");