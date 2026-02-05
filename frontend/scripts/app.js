let web3;
let contract;
let contractAddress; // Will be loaded from contract-address.json

const contractABI = [
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
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "machineAddresses",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
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
    "inputs": [
      {
        "internalType": "string",
        "name": "_machineID",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_machineAddress",
        "type": "address"
      }
    ],
    "name": "registerMachine",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
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
        "name": "_machineID",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "verifySignature",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
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
        document.getElementById('ipfsCID').textContent = transaction.ipfsCID || '-';
        document.getElementById('machineSignature').textContent = transaction.machineSignature || '-';
        
        // Display verification status if available
        if (transaction.signatureVerified !== undefined) {
            const verifiedElement = document.getElementById('signatureVerified');
            if (transaction.signatureVerified) {
                verifiedElement.innerHTML = '✅ Verified On-Chain';
                verifiedElement.style.color = '#10b981';
            } else {
                verifiedElement.innerHTML = '❌ Not Verified';
                verifiedElement.style.color = '#ef4444';
            }
        }
    } catch (error) {
        console.error('Error fetching transaction details:', error);
    }
}

// Fetch database_analyzed.json instead of IPFS data
async function fetchOffChainData(machineID) {
    try {
        const response = await fetch('../database_analyzed.json'); // Fetch the JSON file
        const data = await response.json();
        console.log('Fetched JSON data:', data); // Debugging log

        // Filter data for the given machine ID
        return data.filter(record => record.machineID === machineID);
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
        throw error;
    }
}

let voltageChartInstance;
let rotationChartInstance;
let pressureChartInstance;
let vibrationChartInstance;

// Chart instances for comparison (second date)
let voltageChart2Instance;
let rotationChart2Instance;
let pressureChart2Instance;
let vibrationChart2Instance;

// Render time-series graph with anomaly highlights
function renderTimeSeriesGraph(data, dateLabel = '', isComparison = false) {
    console.log('Data passed to the chart:', data, 'isComparison:', isComparison); // Debugging log

    // Determine which chart instances and canvases to use
    const canvasIds = isComparison ? 
        { voltage: 'voltageGraph2', rotation: 'rotationGraph2', pressure: 'pressureGraph2', vibration: 'vibrationGraph2' } :
        { voltage: 'voltageGraph', rotation: 'rotationGraph', pressure: 'pressureGraph', vibration: 'vibrationGraph' };
    
    // Destroy existing chart instances before creating new ones
    if (isComparison) {
        if (voltageChart2Instance) voltageChart2Instance.destroy();
        if (rotationChart2Instance) rotationChart2Instance.destroy();
        if (pressureChart2Instance) pressureChart2Instance.destroy();
        if (vibrationChart2Instance) vibrationChart2Instance.destroy();
    } else {
        if (voltageChartInstance) voltageChartInstance.destroy();
        if (rotationChartInstance) rotationChartInstance.destroy();
        if (pressureChartInstance) pressureChartInstance.destroy();
        if (vibrationChartInstance) vibrationChartInstance.destroy();
    }
    const labels = data.map(record => record.datetime.split(' ')[1]); // Extract time only for x-axis labels
    const date = dateLabel || data[0]?.datetime.split(' ')[0]; // Use provided date label or extract from data

    // Extract data for each indicator and mark anomalies
    const voltages = data.map(record => parseFloat(record.volt));
    const rotations = data.map(record => parseFloat(record.rotate));
    const pressures = data.map(record => parseFloat(record.pressure));
    const vibrations = data.map(record => parseFloat(record.vibration));

    // Check for anomalies specific to each metric
    const voltageAnomalies = data.map(record => {
        const volt = parseFloat(record.volt);
        return volt < 155.0 || volt > 190.0;
    });
    const rotationAnomalies = data.map(record => {
        const rotation = parseFloat(record.rotate);
        return rotation > 550.0 || rotation < 350.0;
    });
    const pressureAnomalies = data.map(record => {
        const pressure = parseFloat(record.pressure);
        return pressure > 120.0 || pressure < 80.0;
    });
    const vibrationAnomalies = data.map(record => parseFloat(record.vibration) > 50.0);
    
    const anomalyPoints = data.map(record => checkAnomaly(record)); // Check for anomalies (for general status)

    // Common options for all charts
    const commonOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: `Time (${date})`,
                },
            },
        },
    };

    // Voltage Chart
    const voltageCtx = document.getElementById(canvasIds.voltage).getContext('2d');
    const voltageChart = new Chart(voltageCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Voltage (V)',
                data: voltages,
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: voltageAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 99, 132, 0.8)' : 'rgba(255, 99, 132, 0.2)'),
                borderWidth: 2,
                tension: 0.4,
                pointRadius: voltageAnomalies.map((isAnomaly) => isAnomaly ? 6 : 3),
                pointBackgroundColor: voltageAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 99, 132, 1)'),
            }],
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    title: {
                        display: true,
                        text: 'Voltage (V)',
                    },
                    beginAtZero: false,
                },
            },
        },
    });
    
    if (isComparison) {
        voltageChart2Instance = voltageChart;
    } else {
        voltageChartInstance = voltageChart;
    }

    // Rotation Chart
    const rotationCtx = document.getElementById(canvasIds.rotation).getContext('2d');
    const rotationChart = new Chart(rotationCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rotation (RPM)',
                data: rotations,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: rotationAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(54, 162, 235, 0.8)' : 'rgba(54, 162, 235, 0.2)'),
                borderWidth: 2,
                tension: 0.4,
                pointRadius: rotationAnomalies.map((isAnomaly) => isAnomaly ? 6 : 3),
                pointBackgroundColor: rotationAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(54, 162, 235, 1)'),
            }],
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    title: {
                        display: true,
                        text: 'Rotation (RPM)',
                    },
                    beginAtZero: false,
                },
            },
        },
    });
    
    if (isComparison) {
        rotationChart2Instance = rotationChart;
    } else {
        rotationChartInstance = rotationChart;
    }

    // Pressure Chart
    const pressureCtx = document.getElementById(canvasIds.pressure).getContext('2d');
    const pressureChart = new Chart(pressureCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pressure (PSI)',
                data: pressures,
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: pressureAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(75, 192, 192, 0.8)' : 'rgba(75, 192, 192, 0.2)'),
                borderWidth: 2,
                tension: 0.4,
                pointRadius: pressureAnomalies.map((isAnomaly) => isAnomaly ? 6 : 3),
                pointBackgroundColor: pressureAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)'),
            }],
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    title: {
                        display: true,
                        text: 'Pressure (PSI)',
                    },
                    beginAtZero: false,
                },
            },
        },
    });
    
    if (isComparison) {
        pressureChart2Instance = pressureChart;
    } else {
        pressureChartInstance = pressureChart;
    }

    // Vibration Chart
    const vibrationCtx = document.getElementById(canvasIds.vibration).getContext('2d');
    const vibrationChart = new Chart(vibrationCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vibration (mm/s)',
                data: vibrations,
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: vibrationAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(153, 102, 255, 0.8)' : 'rgba(153, 102, 255, 0.2)'),
                borderWidth: 2,
                tension: 0.4,
                pointRadius: vibrationAnomalies.map((isAnomaly) => isAnomaly ? 6 : 3),
                pointBackgroundColor: vibrationAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(153, 102, 255, 1)'),
            }],
        },
        options: {
            ...commonOptions,
            scales: {
                ...commonOptions.scales,
                y: {
                    title: {
                        display: true,
                        text: 'Vibration (mm/s)',
                    },
                    beginAtZero: false,
                },
            },
        },
    });
    
    if (isComparison) {
        vibrationChart2Instance = vibrationChart;
    } else {
        vibrationChartInstance = vibrationChart;
    }
}

// Function to check for anomalies
function checkAnomaly(data) {
    const vibration = parseFloat(data.vibration);
    const volt = parseFloat(data.volt);
    const pressure = parseFloat(data.pressure);
    const rotation = parseFloat(data.rotate);
    
    // Rule 1: High vibration - indicates mechanical issues
    if (vibration > 50.0) {
        console.log(`[ALERT] High Vibration detected: ${vibration} at ${data.datetime}`);
        return true;
    }
    // Rule 2: Low voltage - indicates electrical issues
    if (volt < 155.0 || volt > 190.0) {
        console.log(`[ALERT] Abnormal Voltage detected: ${volt} at ${data.datetime}`);
        return true;
    }
    // Rule 3: Abnormal pressure - too high or too low
    if (pressure > 120.0 || pressure < 80.0) {
        console.log(`[ALERT] Abnormal Pressure detected: ${pressure} at ${data.datetime}`);
        return true;
    }
    // Rule 4: Abnormal rotation - too high or too low RPM
    if (rotation > 550.0 || rotation < 350.0) {
        console.log(`[ALERT] Abnormal Rotation detected: ${rotation} at ${data.datetime}`);
        return true;
    }
    return false;
}

// Filter data for the selected date and render the graph
async function filterDataByDate() {
    const selectedDate = document.getElementById('dateSelector').value; // Get the selected date
    if (!selectedDate) {
        alert('Please select a date.');
        return;
    }

    try {
        const machineID = document.getElementById('machineID').value.trim(); // Get the machine ID
        const data = await fetchOffChainData(machineID); // Fetch the data

        // Filter data for the selected date
        const filteredData = data.filter(record => record.datetime.startsWith(selectedDate));
        console.log('Filtered data for date:', selectedDate, filteredData); // Debugging log

        // Hide comparison graphs and show only main graphs
        hideComparisonGraphs();
        renderTimeSeriesGraph(filteredData, selectedDate, false); // Re-render the graph with filtered data
    } catch (error) {
        console.error('Error filtering data by date:', error);
        alert('Failed to filter data for the selected date.');
    }
}

// Compare data from two different dates
async function compareDataByDate() {
    const date1 = document.getElementById('dateSelector').value;
    const date2 = document.getElementById('dateSelector2').value;
    
    if (!date1 || !date2) {
        alert('Please select both dates for comparison.');
        return;
    }
    
    if (date1 === date2) {
        alert('Please select two different dates to compare.');
        return;
    }

    try {
        const machineID = document.getElementById('machineID').value.trim();
        if (!machineID) {
            alert('Please enter a Machine ID first.');
            return;
        }
        
        const data = await fetchOffChainData(machineID);

        // Filter data for both dates
        const filteredData1 = data.filter(record => record.datetime.startsWith(date1));
        const filteredData2 = data.filter(record => record.datetime.startsWith(date2));
        
        if (filteredData1.length === 0) {
            alert(`No data found for ${date1}`);
            return;
        }
        
        if (filteredData2.length === 0) {
            alert(`No data found for ${date2}`);
            return;
        }
        
        console.log('Comparing data:', { date1, date2, data1: filteredData1, data2: filteredData2 });

        // Show comparison graphs
        showComparisonGraphs();
        
        // Update titles to show which date is which
        document.getElementById('voltageTitle').textContent = `Voltage (V) - Comparison: ${date1} vs ${date2}`;
        document.getElementById('rotationTitle').textContent = `Rotation (RPM) - Comparison: ${date1} vs ${date2}`;
        document.getElementById('pressureTitle').textContent = `Pressure (PSI) - Comparison: ${date1} vs ${date2}`;
        document.getElementById('vibrationTitle').textContent = `Vibration (mm/s) - Comparison: ${date1} vs ${date2}`;
        
        // Render both graphs
        renderTimeSeriesGraph(filteredData1, date1, false);
        renderTimeSeriesGraph(filteredData2, date2, true);
    } catch (error) {
        console.error('Error comparing data by date:', error);
        alert('Failed to compare data for the selected dates.');
    }
}

// Show comparison graphs
function showComparisonGraphs() {
    document.getElementById('voltageGraph2Container').style.display = 'block';
    document.getElementById('rotationGraph2Container').style.display = 'block';
    document.getElementById('pressureGraph2Container').style.display = 'block';
    document.getElementById('vibrationGraph2Container').style.display = 'block';
}

// Hide comparison graphs
function hideComparisonGraphs() {
    document.getElementById('voltageGraph2Container').style.display = 'none';
    document.getElementById('rotationGraph2Container').style.display = 'none';
    document.getElementById('pressureGraph2Container').style.display = 'none';
    document.getElementById('vibrationGraph2Container').style.display = 'none';
    
    // Reset titles
    document.getElementById('voltageTitle').textContent = 'Voltage (V)';
    document.getElementById('rotationTitle').textContent = 'Rotation (RPM)';
    document.getElementById('pressureTitle').textContent = 'Pressure (PSI)';
    document.getElementById('vibrationTitle').textContent = 'Vibration (mm/s)';
}

// Add event listener for filtering data by date
document.getElementById('filterDateBtn').addEventListener('click', filterDataByDate);

// Add event listener for comparison mode toggle
document.getElementById('compareMode').addEventListener('change', function() {
    const comparisonSection = document.getElementById('comparisonDateSection');
    if (this.checked) {
        comparisonSection.style.display = 'block';
    } else {
        comparisonSection.style.display = 'none';
        hideComparisonGraphs();
    }
});

// Add event listener for compare button
document.getElementById('compareBtn').addEventListener('click', compareDataByDate);

// === DECENTRALIZED SIGNATURE VERIFICATION ===
// This function verifies the machine's signature on-chain through the smart contract
// proving data authenticity in a trustless manner
async function verifyMachineSignature(machineID, transaction) {
    const resultDiv = document.getElementById('verificationResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '🔄 Verifying signature on blockchain...';
    resultDiv.style.backgroundColor = '#f1f5f9';
    resultDiv.style.padding = '12px';
    resultDiv.style.borderRadius = '8px';
    resultDiv.style.marginTop = '15px';

    try {
        // Fetch the off-chain data to reconstruct the data hash
        const response = await fetch('../database_analyzed.json');
        const allData = await response.json();
        const machineData = allData.filter(record => record.machineID === machineID);

        // Reconstruct the data string used for signing (must match process.js)
        const machineDataString = machineData
            .map(record => `${record.datetime},${record.volt},${record.vibration},${record.status}`)
            .join('|');
        
        // Hash it the same way (Keccak256)
        const dataHash = web3.utils.soliditySha3(machineDataString);

        // Convert signature from hex string to bytes array
        const signatureHex = transaction.machineSignature;
        const signatureBytes = web3.utils.hexToBytes(signatureHex);

        // Call the smart contract's verifySignature function (on-chain verification)
        console.log('Calling smart contract verifySignature...');
        const isVerified = await contract.methods.verifySignature(
            machineID,
            dataHash,
            signatureBytes
        ).call();

        if (isVerified) {
            resultDiv.innerHTML = `
                <strong style="color: #10b981;">✅ SIGNATURE VERIFIED ON-CHAIN!</strong><br>
                <span style="font-size: 0.9rem;">
                    • Verification performed by smart contract at ${contractAddress}<br>
                    • The signature was created by the registered machine address<br>
                    • Data authenticity proven in a decentralized, trustless manner<br>
                    • No central authority needed - anyone can verify this signature
                </span>
            `;
            resultDiv.style.backgroundColor = '#d1fae5';
        } else {
            resultDiv.innerHTML = `
                <strong style="color: #ef4444;">❌ SIGNATURE VERIFICATION FAILED!</strong><br>
                <span style="font-size: 0.9rem;">
                    • The signature does not match the registered machine address<br>
                    • This data may have been tampered with or sent by an imposter<br>
                    • DO NOT TRUST this data
                </span>
            `;
            resultDiv.style.backgroundColor = '#fee2e2';
        }
    } catch (error) {
        console.error('Verification error:', error);
        resultDiv.innerHTML = `
            <strong style="color: #ef4444;">❌ Verification Error</strong><br>
            <span style="font-size: 0.9rem;">${error.message}</span>
        `;
        resultDiv.style.backgroundColor = '#fee2e2';
    }
}

// Load contract address from deployment file
async function loadContractAddress() {
  try {
    const response = await fetch('../contract-address.json');
    const deploymentInfo = await response.json();
    contractAddress = deploymentInfo.contractAddress;
    console.log(`📄 Contract address loaded: ${contractAddress}`);
    console.log(`🕒 Deployed at: ${deploymentInfo.deployedAt}`);
    console.log(`👤 Deployer: ${deploymentInfo.deployer}`);
  } catch (error) {
    console.error('❌ Error loading contract address:', error);
    alert('Could not load contract address. Please ensure contract-address.json exists and the contract is deployed.');
  }
}

// Initialize the app
async function init() {
  // Load contract address first
  await loadContractAddress();
  
  document.getElementById('connectMetaMask').addEventListener('click', connectToMetaMask);
  document.getElementById('checkDataBtn').addEventListener('click', async () => {
    const machineID = document.getElementById('machineID').value.trim();
    if (!machineID) {
        alert('Please enter a Machine ID.');
        return;
    }

    // await fetchAndDisplayMachineData();
    await fetchTransactionDetails(machineID);
    const offChainData = await fetchOffChainData(machineID);
  });

  // Optional: Fetch default data on load if desired, but requires a default machineID
  fetchAndDisplayMachineData();
}

init();
console.log("app.js is connected!");