// Client-side JavaScript
let web3;
let contract;
let contractAddress;
let connectedAccount;

// Contract ABI (same as app.js)
const contractABI = [
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"machineID","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"},{"indexed":false,"internalType":"string","name":"message","type":"string"}],"name":"AnomalyDetected","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"machineID","type":"string"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"DataAnchored","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"machineID","type":"string"},{"indexed":false,"internalType":"uint256","name":"anchorIndex","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"leaf","type":"bytes32"},{"indexed":false,"internalType":"bool","name":"verified","type":"bool"}],"name":"ProofVerified","type":"event"},
  {"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"machineAddresses","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"","type":"string"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"machineLedger","outputs":[{"internalType":"uint256","name":"timestamp","type":"uint256"},{"internalType":"bytes32","name":"merkleRoot","type":"bytes32"},{"internalType":"bool","name":"hasAnomaly","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"_machineID","type":"string"},{"internalType":"address","name":"_machineAddress","type":"address"}],"name":"registerMachine","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"_machineID","type":"string"},{"internalType":"bytes32","name":"_merkleRoot","type":"bytes32"},{"internalType":"bool","name":"_hasAnomaly","type":"bool"}],"name":"storeProof","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"string","name":"_machineID","type":"string"},{"internalType":"bytes32","name":"dataHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"verifySignature","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"_machineID","type":"string"},{"internalType":"uint256","name":"_anchorIndex","type":"uint256"},{"internalType":"bytes32","name":"_leaf","type":"bytes32"},{"internalType":"bytes32[]","name":"_proof","type":"bytes32[]"},{"internalType":"uint8[]","name":"_positions","type":"uint8[]"}],"name":"verifyMerkleProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"_machineID","type":"string"},{"internalType":"uint256","name":"_anchorIndex","type":"uint256"},{"internalType":"bytes32","name":"_leaf","type":"bytes32"},{"internalType":"bytes32[]","name":"_proof","type":"bytes32[]"},{"internalType":"uint8[]","name":"_positions","type":"uint8[]"}],"name":"validateInsuranceClaim","outputs":[{"internalType":"bool","name":"verified","type":"bool"},{"internalType":"bool","name":"hasAnomaly","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"machineID","type":"string"},{"indexed":false,"internalType":"uint256","name":"anchorIndex","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"leaf","type":"bytes32"},{"indexed":false,"internalType":"bool","name":"verified","type":"bool"},{"indexed":false,"internalType":"bool","name":"hasAnomaly","type":"bool"}],"name":"ClaimValidated","type":"event"}
];

// Chart instances
let voltageChartInstance;
let rotationChartInstance;
let pressureChartInstance;
let vibrationChartInstance;

// Chart instances for comparison (second date)
let voltageChart2Instance;
let rotationChart2Instance;
let pressureChart2Instance;
let vibrationChart2Instance;

// Connect to MetaMask
async function connectToMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      connectedAccount = accounts[0];
      web3 = new Web3(window.ethereum);
      
      const balance = await web3.eth.getBalance(connectedAccount);
      const balanceInEth = web3.utils.fromWei(balance, 'ether');
      document.getElementById('walletAddress').textContent = `Wallet: ${connectedAccount} (${parseFloat(balanceInEth).toFixed(2)} ETH)`;
      
      console.log('MetaMask connected:', connectedAccount);
      
      window.ethereum.on('accountsChanged', async (accounts) => {
        if (accounts.length > 0) {
          connectedAccount = accounts[0];
          const balance = await web3.eth.getBalance(connectedAccount);
          const balanceInEth = web3.utils.fromWei(balance, 'ether');
          document.getElementById('walletAddress').textContent = `Wallet: ${connectedAccount} (${parseFloat(balanceInEth).toFixed(2)} ETH)`;
        } else {
          connectedAccount = null;
          document.getElementById('walletAddress').textContent = 'Wallet: Not connected';
        }
      });

      contract = new web3.eth.Contract(contractABI, contractAddress);
      console.log('✅ Contract initialized');
    } catch (error) {
      console.error('MetaMask connection error:', error);
    }
  } else {
    alert('MetaMask is not installed. Please install MetaMask.');
  }
}

// Fetch transaction details
async function fetchTransactionDetails(machineID) {
    try {
        const response = await fetch('../transaction_log.json');
        const data = await response.json();
        const transaction = data.find(tx => tx.machineID === machineID);

        if (!transaction) {
            console.error(`No transaction found for Machine ID: ${machineID}`);
            return;
        }

        document.getElementById('txHash').textContent = transaction.transactionHash;
        document.getElementById('gasUsed').textContent = transaction.gasUsed;
        document.getElementById('fromAccount').textContent = transaction.from;
        document.getElementById('toAccount').textContent = transaction.to;
        document.getElementById('txTimestamp').textContent = new Date(transaction.timestamp * 1000).toLocaleString();
    } catch (error) {
        console.error('Error fetching transaction details:', error);
    }
}

// Validate claim (client pays gas)
async function validateInsuranceClaim() {
    const machineID = document.getElementById('claimMachineID').value.trim();
    const anomalyIndex = parseInt(document.getElementById('claimAnomalyIndex').value) || 0;

    if (!machineID) {
        alert('Please enter a Machine ID');
        return;
    }

    if (!contract) {
        alert('Please connect MetaMask first');
        return;
    }

    console.log('========================================');
    console.log('🚀 Starting Claim Validation');
    console.log('========================================');
    console.log('Contract Address:', contractAddress);
    console.log('Connected Account:', connectedAccount);

    try {
        const response = await fetch('../anomaly_proofs.json');
        const anomalyProofs = await response.json();
        
        const machineProofs = anomalyProofs.find(p => p.machineID === machineID);
        
        if (!machineProofs || machineProofs.anomalies.length === 0) {
            alert(`No anomalies found for Machine ${machineID}`);
            return;
        }

        const anomaly = machineProofs.anomalies[anomalyIndex];
        
        if (!anomaly) {
            alert(`Anomaly index ${anomalyIndex} not found`);
            return;
        }

        // Prepare proof data first
        const proofHashes = anomaly.proof.map(p => p.data);
        const proofPositions = anomaly.proof.map(p => p.position === 'left' ? 0 : 1);

        console.log('Validating claim for anomaly:', anomaly);
        console.log('Machine ID:', machineID);
        console.log('Anomaly Index:', anomalyIndex);
        console.log('Leaf:', anomaly.leaf);
        console.log('Proof hashes:', proofHashes);
        console.log('Proof positions:', proofPositions);

        // Find the correct anchor index by matching the Merkle root
        let anchorIndex = -1;
        let storedAnchor = null;
        
        console.log('🔍 Searching for matching Merkle root on blockchain...');
        console.log('   Expected Merkle Root from JSON:', machineProofs.merkleRoot);
        
        try {
            // Try anchor indices 0-10 (most recent uploads)
            for (let i = 0; i < 10; i++) {
                try {
                    const anchor = await contract.methods.machineLedger(machineID, i).call();
                    console.log(`   Checking anchor index ${i}: ${anchor.merkleRoot}`);
                    
                    if (anchor.merkleRoot === machineProofs.merkleRoot) {
                        anchorIndex = i;
                        storedAnchor = anchor;
                        console.log(`✅ Found matching Merkle root at anchor index ${i}!`);
                        break;
                    }
                } catch (e) {
                    // No more anchors, stop searching
                    console.log(`   No anchor at index ${i}, stopping search.`);
                    break;
                }
            }
            
            if (anchorIndex === -1) {
                console.error('❌ MISMATCH: Could not find matching Merkle root on blockchain!');
                console.error('   The data in anomaly_proofs.json does not match any blockchain record.');
                alert('Error: Contract and data mismatch!\n\nThe smart contract data does not match anomaly_proofs.json.\n\nPlease run: node scripts/process.js');
                return;
            }
            
            console.log('📦 Using blockchain anchor:');
            console.log('  Anchor Index:', anchorIndex);
            console.log('  Timestamp:', storedAnchor.timestamp);
            console.log('  Merkle Root:', storedAnchor.merkleRoot);
            console.log('  Has Anomaly:', storedAnchor.hasAnomaly);
            
        } catch (error) {
            console.error('❌ Error reading stored data:', error);
            alert('Error: Cannot read data from blockchain. Machine might not be registered.\n\nPlease run: node scripts/process.js');
            return;
        }

        if (!connectedAccount) {
            alert('No account connected');
            return;
        }

        console.log('Submitting validation transaction (you will pay gas fees)...');

        const tx = await contract.methods.validateInsuranceClaim(
            machineID,
            anchorIndex,
            anomaly.leaf,
            proofHashes,
            proofPositions
        ).send({ from: connectedAccount, value: '0', gas: 300000 });

        console.log('✅ Validation transaction complete!');
        console.log('Transaction hash:', tx.transactionHash);
        console.log('Block number:', tx.blockNumber);
        console.log('Gas used:', tx.gasUsed);
        console.log('Events:', tx.events);
        
        if (tx.events.ClaimValidated) {
            console.log('✅ ClaimValidated event emitted:');
            console.log('  Machine ID:', tx.events.ClaimValidated.returnValues.machineID);
            console.log('  Anchor Index:', tx.events.ClaimValidated.returnValues.anchorIndex);
            console.log('  Verified:', tx.events.ClaimValidated.returnValues.verified);
            console.log('  Has Anomaly:', tx.events.ClaimValidated.returnValues.hasAnomaly);
            
            // Now test if we can retrieve this event from the blockchain
            console.log('\n🔍 Testing if event can be retrieved from blockchain...');
            try {
                const events = await contract.getPastEvents('ClaimValidated', {
                    fromBlock: tx.blockNumber,
                    toBlock: tx.blockNumber
                });
                console.log('✅ Successfully retrieved event from blockchain!');
                console.log('Events found:', events.length);
                console.log('Event details:', events);
                
                if (events.length === 0) {
                    console.error('❌ WARNING: Event was emitted but cannot be retrieved!');
                } else {
                    console.log('✅ CONFIRMATION: Insurance portal will be able to see this claim!');
                }
            } catch (error) {
                console.error('❌ Error retrieving event:', error);
            }
        } else {
            console.warn('⚠️ No ClaimValidated event found in transaction!');
        }
        
        displayClaimResult(tx, anomaly, machineID);

    } catch (error) {
        console.error('Error validating claim:', error);
        
        if (error.code === 4001) {
            alert('⚠️ Transaction cancelled by user');
        } else {
            alert(`Error: ${error.message}`);
        }
    }
}

// Display claim result
function displayClaimResult(tx, anomaly, machineID) {
    const resultDiv = document.getElementById('claimResult');
    resultDiv.style.display = 'block';

    const validated = tx.events.ClaimValidated?.returnValues;

    const phase1Div = document.getElementById('phase1Result');
    const phase1Details = document.getElementById('phase1Details');
    
    if (validated && validated.verified) {
        phase1Div.innerHTML = '✅ PASSED';
        phase1Div.style.color = '#10b981';
        phase1Details.innerHTML = 'Merkle proof verified - Data integrity confirmed';
    } else {
        phase1Div.innerHTML = '❌ FAILED';
        phase1Div.style.color = '#ef4444';
        phase1Details.innerHTML = 'Merkle proof invalid';
    }

    const phase2Div = document.getElementById('phase2Result');
    const phase2Details = document.getElementById('phase2Details');
    
    // Check which sensors are anomalous from the actual data
    const anomalyDetails = checkAnomaly(anomaly.data);
    const hasActualAnomaly = anomalyDetails.hasAnyAnomaly();
    
    console.log('Client Validation - Anomaly Data:', anomaly.data);
    console.log('Client Validation - Anomaly Details:', anomalyDetails);
    console.log('Client Validation - Has Actual Anomaly:', hasActualAnomaly);
    console.log('Client Validation - Contract Has Anomaly:', validated?.hasAnomaly);
    
    // Use contract validation result but show details from actual data
    if (validated && (validated.hasAnomaly || hasActualAnomaly)) {
        phase2Div.innerHTML = '✅ DETECTED';
        phase2Div.style.color = '#10b981';
        
        let detailsHTML = `<strong>Anomaly detected off-chain</strong><br>Timestamp: ${anomaly.datetime}<br><br>`;
        detailsHTML += '<div style="background: #fef2f2; padding: 10px; border-radius: 6px; border-left: 3px solid #ef4444; margin-top: 8px;">';
        detailsHTML += '<strong style="color: #991b1b;">⚠️ Threshold Violations:</strong><br>';
        
        if (anomalyDetails.voltageAnomaly) {
            detailsHTML += `• Voltage: <span style="color: #dc2626; font-weight: 600;">${anomaly.data.volt}V</span> (Normal: 155-190V)<br>`;
        }
        if (anomalyDetails.rotationAnomaly) {
            detailsHTML += `• Rotation: <span style="color: #dc2626; font-weight: 600;">${anomaly.data.rotation} RPM</span> (Normal: 350-550 RPM)<br>`;
        }
        if (anomalyDetails.pressureAnomaly) {
            detailsHTML += `• Pressure: <span style="color: #dc2626; font-weight: 600;">${anomaly.data.pressure} PSI</span> (Normal: 80-120 PSI)<br>`;
        }
        if (anomalyDetails.vibrationAnomaly) {
            detailsHTML += `• Vibration: <span style="color: #dc2626; font-weight: 600;">${anomaly.data.vibration} mm/s</span> (Max: 50 mm/s)<br>`;
        }
        detailsHTML += '</div>';
        
        phase2Details.innerHTML = detailsHTML;
    } else if (validated) {
        phase2Div.innerHTML = '✅ NONE';
        phase2Div.style.color = '#64748b';
        phase2Details.innerHTML = 'No anomaly detected - All sensors within normal thresholds';
    }

    const finalDiv = document.getElementById('finalDecision');
    
    const finalHasAnomaly = validated && (validated.hasAnomaly || hasActualAnomaly);
    
    if (validated && validated.verified && finalHasAnomaly) {
        finalDiv.innerHTML = '🎉 CLAIM APPROVED';
        finalDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        finalDiv.style.color = 'white';
        finalDiv.style.border = '2px solid #047857';
        
        // Add submission success message
        const successMsg = document.createElement('div');
        successMsg.style.cssText = `
            margin-top: 15px;
            padding: 15px;
            background: #ecfdf5;
            border: 2px solid #10b981;
            border-radius: 8px;
            text-align: center;
        `;
        successMsg.innerHTML = `
            <strong style="color: #059669; font-size: 1.1rem;">✅ Claim Submitted Successfully!</strong><br>
            <p style="margin: 10px 0 0 0; color: #047857; font-size: 0.9rem;">
                Your claim has been recorded on the blockchain at block ${tx.blockNumber}.
            </p>
            <p style="margin: 8px 0 0 0; color: #047857; font-size: 0.85rem; padding: 10px; background: #d1fae5; border-radius: 6px; margin-top: 10px;">
                <strong>📬 Next Steps:</strong><br>
                1. The insurance company can now see your claim<br>
                2. Go to the <strong>Insurance Portal</strong><br>
                3. Click <strong>"Load Pending Claims"</strong> to see your claim<br>
                4. Transaction hash: <code style="font-size: 0.75rem; background: white; padding: 2px 4px; border-radius: 3px;">${tx.transactionHash.substring(0, 20)}...</code>
            </p>
        `;
        if (!finalDiv.nextElementSibling || !finalDiv.nextElementSibling.classList.contains('success-msg')) {
            finalDiv.parentNode.insertBefore(successMsg, finalDiv.nextSibling);
            successMsg.classList.add('success-msg');
        }
    } else {
        finalDiv.innerHTML = '❌ CLAIM REJECTED';
        finalDiv.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        finalDiv.style.color = 'white';
        finalDiv.style.border = '2px solid #b91c1c';
    }

    document.getElementById('claimMachineIDDisplay').textContent = machineID;
    document.getElementById('claimDateTime').textContent = anomaly.datetime;
    document.getElementById('claimTxHash').textContent = tx.transactionHash;
    document.getElementById('claimGasUsed').textContent = tx.gasUsed.toLocaleString();

    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Check which sensors have anomalies
function checkAnomaly(data) {
    const volt = parseFloat(data.volt);
    const rotation = parseFloat(data.rotation);
    const pressure = parseFloat(data.pressure);
    const vibration = parseFloat(data.vibration);

    return {
        voltageAnomaly: volt < 155.0 || volt > 190.0,
        rotationAnomaly: rotation > 550.0 || rotation < 350.0,
        pressureAnomaly: pressure > 120.0 || pressure < 80.0,
        vibrationAnomaly: vibration > 50.0,
        hasAnyAnomaly: function() {
            return this.voltageAnomaly || this.rotationAnomaly || this.pressureAnomaly || this.vibrationAnomaly;
        }
    };
}

// Fetch off-chain data
async function fetchOffChainData(machineID) {
    try {
        const response = await fetch('../database_analyzed.json');
        const data = await response.json();
        return data.filter(record => record.machineID === machineID);
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

// Render graphs
function renderTimeSeriesGraph(data, dateLabel = '', isComparison = false) {
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
        
        // Show comparison containers
        document.getElementById('voltageGraph2Container').style.display = 'block';
        document.getElementById('rotationGraph2Container').style.display = 'block';
        document.getElementById('pressureGraph2Container').style.display = 'block';
        document.getElementById('vibrationGraph2Container').style.display = 'block';
    } else {
        if (voltageChartInstance) voltageChartInstance.destroy();
        if (rotationChartInstance) rotationChartInstance.destroy();
        if (pressureChartInstance) pressureChartInstance.destroy();
        if (vibrationChartInstance) vibrationChartInstance.destroy();
    }

    const labels = data.map(record => record.datetime.split(' ')[1]);
    const date = dateLabel || data[0]?.datetime.split(' ')[0];

    const voltages = data.map(record => parseFloat(record.volt));
    const rotations = data.map(record => parseFloat(record.rotate));
    const pressures = data.map(record => parseFloat(record.pressure));
    const vibrations = data.map(record => parseFloat(record.vibration));

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

    const commonOptions = {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: { x: { title: { display: true, text: `Time (${date})` } } }
    };

    const voltageChart = new Chart(document.getElementById(canvasIds.voltage).getContext('2d'), {
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
                pointBackgroundColor: voltageAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(255, 99, 132, 1)')
            }]
        },
        options: { ...commonOptions, scales: { ...commonOptions.scales, y: { title: { display: true, text: 'Voltage (V)' }, beginAtZero: false } } }
    });

    const rotationChart = new Chart(document.getElementById(canvasIds.rotation).getContext('2d'), {
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
                pointBackgroundColor: rotationAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(54, 162, 235, 1)')
            }]
        },
        options: { ...commonOptions, scales: { ...commonOptions.scales, y: { title: { display: true, text: 'Rotation (RPM)' }, beginAtZero: false } } }
    });

    const pressureChart = new Chart(document.getElementById(canvasIds.pressure).getContext('2d'), {
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
                pointBackgroundColor: pressureAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(75, 192, 192, 1)')
            }]
        },
        options: { ...commonOptions, scales: { ...commonOptions.scales, y: { title: { display: true, text: 'Pressure (PSI)' }, beginAtZero: false } } }
    });

    const vibrationChart = new Chart(document.getElementById(canvasIds.vibration).getContext('2d'), {
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
                pointBackgroundColor: vibrationAnomalies.map((isAnomaly) => isAnomaly ? 'rgba(255, 0, 0, 1)' : 'rgba(153, 102, 255, 1)')
            }]
        },
        options: { ...commonOptions, scales: { ...commonOptions.scales, y: { title: { display: true, text: 'Vibration (mm/s)' }, beginAtZero: false } } }
    });

    // Store chart instances
    if (isComparison) {
        voltageChart2Instance = voltageChart;
        rotationChart2Instance = rotationChart;
        pressureChart2Instance = pressureChart;
        vibrationChart2Instance = vibrationChart;
    } else {
        voltageChartInstance = voltageChart;
        rotationChartInstance = rotationChart;
        pressureChartInstance = pressureChart;
        vibrationChartInstance = vibrationChart;
    }
}

// Filter data by date
async function filterDataByDate() {
    const selectedDate = document.getElementById('dateSelector').value;
    if (!selectedDate) {
        alert('Please select a date');
        return;
    }

    try {
        const machineID = document.getElementById('machineID').value.trim();
        const data = await fetchOffChainData(machineID);
        const filteredData = data.filter(record => record.datetime.startsWith(selectedDate));
        renderTimeSeriesGraph(filteredData, selectedDate);
    } catch (error) {
        console.error('Error filtering data:', error);
        alert('Failed to filter data');
    }
}

// Load contract address
async function loadContractAddress() {
  try {
    const response = await fetch('../contract-address.json');
    const deploymentInfo = await response.json();
    contractAddress = deploymentInfo.contractAddress;
    console.log(`📄 Contract loaded: ${contractAddress}`);
  } catch (error) {
    console.error('Error loading contract address:', error);
  }
}

// Initialize
async function init() {
  await loadContractAddress();
  
  document.getElementById('connectMetaMask').addEventListener('click', connectToMetaMask);
  document.getElementById('checkDataBtn').addEventListener('click', async () => {
    const machineID = document.getElementById('machineID').value.trim();
    if (!machineID) {
        alert('Please enter a Machine ID');
        return;
    }
    await fetchTransactionDetails(machineID);
    const offChainData = await fetchOffChainData(machineID);
    document.getElementById('result').textContent = `Found ${offChainData.length} records for Machine ${machineID}`;
  });

  document.getElementById('validateClaimBtn').addEventListener('click', validateInsuranceClaim);
  document.getElementById('filterDateBtn').addEventListener('click', filterDataByDate);

  // Comparison Mode Toggle
  document.getElementById('compareMode').addEventListener('change', function() {
    const comparisonDateSection = document.getElementById('comparisonDateSection');
    if (this.checked) {
      comparisonDateSection.style.display = 'block';
    } else {
      comparisonDateSection.style.display = 'none';
      // Hide comparison charts
      document.getElementById('voltageGraph2Container').style.display = 'none';
      document.getElementById('rotationGraph2Container').style.display = 'none';
      document.getElementById('pressureGraph2Container').style.display = 'none';
      document.getElementById('vibrationGraph2Container').style.display = 'none';
      // Destroy comparison chart instances
      if (voltageChart2Instance) voltageChart2Instance.destroy();
      if (rotationChart2Instance) rotationChart2Instance.destroy();
      if (pressureChart2Instance) pressureChart2Instance.destroy();
      if (vibrationChart2Instance) vibrationChart2Instance.destroy();
    }
  });

  // Compare Button
  document.getElementById('compareBtn').addEventListener('click', async () => {
    const selectedDate2 = document.getElementById('dateSelector2').value;
    if (!selectedDate2) {
      alert('Please select a second date to compare');
      return;
    }

    try {
      const machineID = document.getElementById('machineID').value.trim();
      if (!machineID) {
        alert('Please enter a Machine ID first');
        return;
      }
      
      const data = await fetchOffChainData(machineID);
      const filteredData = data.filter(record => record.datetime.startsWith(selectedDate2));
      
      if (filteredData.length === 0) {
        alert('No data found for the selected date');
        return;
      }
      
      renderTimeSeriesGraph(filteredData, selectedDate2, true);
    } catch (error) {
      console.error('Error comparing data:', error);
      alert('Failed to load comparison data');
    }
  });
}

init();
console.log("Client portal loaded");
