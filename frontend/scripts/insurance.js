// Insurance company portal JavaScript
let web3;
let contract;
let contractAddress;
let connectedAccount;
let pendingClaims = []; // Store pending claims
let selectedClaim = null; // Track currently selected claim for payout

// Contract ABI (same as client portal)
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
      console.log('Contract address:', contractAddress);
      console.log('Connected account:', connectedAccount);
      
      // Check if we're on the right network
      const networkId = await web3.eth.net.getId();
      const chainId = await web3.eth.getChainId();
      console.log('Network ID:', networkId);
      console.log('Chain ID:', chainId);
      console.log('Available contract methods:', Object.keys(contract.methods));
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

// Review claim (read-only, no gas)
async function reviewClaim() {
    const machineID = document.getElementById('reviewMachineID').value.trim();
    const anomalyIndex = parseInt(document.getElementById('reviewAnomalyIndex').value) || 0;

    if (!machineID) {
        alert('Please enter a Machine ID');
        return;
    }

    if (!contract) {
        alert('Please connect MetaMask first');
        return;
    }

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

        console.log('Reviewing claim for anomaly:', anomaly);

        const proofHashes = anomaly.proof.map(p => p.data);
        const proofPositions = anomaly.proof.map(p => p.position === 'left' ? 0 : 1);

        // Find the correct anchor index by matching the Merkle root
        let anchorIndex = -1;
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
                console.error('❌ Could not find matching Merkle root on blockchain!');
                alert('Error: Could not find matching data on blockchain.\n\nPlease run: node scripts/process.js');
                return;
            }
        } catch (error) {
            console.error('Error searching for anchor:', error);
            alert(`Error: ${error.message}`);
            return;
        }

        // Call contract without sending transaction (read-only)
        const result = await contract.methods.verifyMerkleProof(
            machineID,
            anchorIndex,
            anomaly.leaf,
            proofHashes,
            proofPositions
        ).call();

        console.log('Review result:', result);
        displayReviewResult(result, anomaly, machineID, machineProofs);

    } catch (error) {
        console.error('Error reviewing claim:', error);
        alert(`Error: ${error.message}`);
    }
}

// Display review result
function displayReviewResult(verified, anomaly, machineID, machineProofs) {
    const resultDiv = document.getElementById('reviewResult');
    resultDiv.style.display = 'block';

    const phase1Div = document.getElementById('reviewPhase1Result');
    const phase1Details = document.getElementById('reviewPhase1Details');
    
    if (verified) {
        phase1Div.innerHTML = '✅ VERIFIED';
        phase1Div.style.color = '#10b981';
        phase1Details.innerHTML = 'Merkle proof verified - Data integrity confirmed';
    } else {
        phase1Div.innerHTML = '❌ INVALID';
        phase1Div.style.color = '#ef4444';
        phase1Details.innerHTML = 'Merkle proof invalid';
    }

    const phase2Div = document.getElementById('reviewPhase2Result');
    const phase2Details = document.getElementById('reviewPhase2Details');
    
    // Check which sensors are anomalous from the actual data
    const anomalyDetails = checkAnomaly(anomaly.data);
    const hasAnomaly = anomalyDetails.hasAnyAnomaly();
    
    console.log('Insurance Review - Anomaly Data:', anomaly.data);
    console.log('Insurance Review - Anomaly Details:', anomalyDetails);
    console.log('Insurance Review - Has Anomaly:', hasAnomaly);
    
    if (hasAnomaly) {
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
    } else {
        phase2Div.innerHTML = '✅ NONE';
        phase2Div.style.color = '#64748b';
        phase2Details.innerHTML = 'No anomaly detected - All sensors within normal thresholds';
    }

    const finalDiv = document.getElementById('reviewDecision');
    
    if (verified && hasAnomaly) {
        finalDiv.innerHTML = '✅ CLAIM APPROVED';
        finalDiv.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        finalDiv.style.color = 'white';
        finalDiv.style.border = '2px solid #047857';
    } else {
        finalDiv.innerHTML = '❌ CLAIM REJECTED';
        finalDiv.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        finalDiv.style.color = 'white';
        finalDiv.style.border = '2px solid #b91c1c';
    }

    document.getElementById('reviewMachineIDDisplay').textContent = machineID;
    document.getElementById('reviewDateTime').textContent = anomaly.datetime;

    // Display sensor readings
    document.getElementById('reviewVoltage').textContent = anomaly.data.volt;
    document.getElementById('reviewRotation').textContent = anomaly.data.rotation;
    document.getElementById('reviewPressure').textContent = anomaly.data.pressure;
    document.getElementById('reviewVibration').textContent = anomaly.data.vibration;

    // Show payout section if claim is approved
    if (verified && hasAnomaly) {
        document.getElementById('payoutSection').style.display = 'block';
    } else {
        document.getElementById('payoutSection').style.display = 'none';
    }

    resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Load pending claims from blockchain events
async function loadPendingClaims() {
    if (!contract) {
        alert('Please connect MetaMask first');
        return;
    }

    try {
        document.getElementById('loadPendingClaimsBtn').textContent = 'Loading...';
        document.getElementById('loadPendingClaimsBtn').disabled = true;

        console.log('Loading pending claims...');
        console.log('Contract address:', contractAddress);

        // Get the current block number
        const currentBlock = await web3.eth.getBlockNumber();
        console.log('Current block:', currentBlock);
        console.log('Querying events from block 0 to', currentBlock);

        // Show loading message to user
        const listDiv = document.getElementById('pendingClaimsList');
        listDiv.style.display = 'block';
        document.getElementById('claimsContainer').innerHTML = '<div style="text-align: center; padding: 20px; color: #3b82f6;">⏳ Scanning blockchain for claims...</div>';
        document.getElementById('claimsContainer').style.display = 'block';

        // Get ClaimValidated events from the contract
        console.log('Calling getPastEvents...');
        const events = await contract.getPastEvents('ClaimValidated', {
            fromBlock: 0,
            toBlock: 'latest'
        });

        console.log('Found ClaimValidated events:', events);
        console.log('Total events:', events.length);

        if (events.length === 0) {
            console.warn('⚠️ No ClaimValidated events found on the blockchain');
            console.log('Possible reasons:');
            console.log('1. No claims have been submitted yet');
            console.log('2. You might be on the wrong network');
            console.log('3. Contract might have been redeployed (events are lost on redeploy)');
            
            const msg = `
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    <strong>⚠️ No Claims Found</strong><br><br>
                    Possible reasons:<br>
                    1. No claims have been submitted from the client portal yet<br>
                    2. You might be connected to the wrong network in MetaMask<br>
                    3. Contract was redeployed (events are lost on redeploy)<br><br>
                    <strong>To submit a claim:</strong><br>
                    1. Open <a href="client.html" target="_blank" style="color: #2563eb; text-decoration: underline;">Client Portal</a><br>
                    2. Connect your wallet<br>
                    3. Enter a Machine ID (e.g., "1")<br>
                    4. Submit and validate a claim<br>
                    5. Come back here and reload pending claims
                </div>
            `;
            
            document.getElementById('pendingClaimsList').style.display = 'block';
            document.getElementById('claimsContainer').innerHTML = msg;
            document.getElementById('claimsContainer').style.display = 'block';
            document.getElementById('noClaimsMessage').style.display = 'none';
            return;
        }

        console.log('📋 Processing', events.length, 'events...');

        // Load anomaly proofs data
        const response = await fetch('../anomaly_proofs.json');
        const anomalyProofs = await response.json();

        // Process events into pending claims
        pendingClaims = [];
        
        for (const event of events) {
            const machineID = event.returnValues.machineID;
            const anchorIndex = parseInt(event.returnValues.anchorIndex);
            const verified = event.returnValues.verified;
            const hasAnomaly = event.returnValues.hasAnomaly;
            const blockNumber = event.blockNumber;
            const transactionHash = event.transactionHash;

            console.log(`Processing event: Machine ${machineID}, Index ${anchorIndex}, Verified: ${verified}, HasAnomaly: ${hasAnomaly}`);

            // Get transaction details to find submitter
            const tx = await web3.eth.getTransaction(transactionHash);
            const submitter = tx.from;

            // Get block timestamp
            const block = await web3.eth.getBlock(blockNumber);
            const timestamp = new Date(block.timestamp * 1000);

            console.log('Submitter:', submitter);
            console.log('Timestamp:', timestamp);

            // Get the anomaly data
            const machineProofs = anomalyProofs.find(p => p.machineID === machineID);
            
            if (!machineProofs) {
                console.warn(`No proofs found for machine ${machineID}`);
                continue;
            }

            const anomaly = machineProofs.anomalies[anchorIndex];

            if (!anomaly) {
                console.warn(`No anomaly at index ${anchorIndex} for machine ${machineID}`);
                continue;
            }

            // Only include verified claims with anomalies
            if (verified && hasAnomaly) {
                pendingClaims.push({
                    machineID,
                    anchorIndex,
                    submitter,
                    anomaly,
                    transactionHash,
                    blockNumber,
                    timestamp: timestamp.toISOString()
                });
                console.log('✅ Added pending claim:', { machineID, anchorIndex, submitter });
            } else {
                console.log(`❌ Skipped claim - Machine ${machineID}, Index ${anchorIndex} (verified: ${verified}, hasAnomaly: ${hasAnomaly})`);
            }
        }

        console.log('========================================');
        console.log('📊 SUMMARY:');
        console.log(`Total events found: ${events.length}`);
        console.log(`Pending claims added: ${pendingClaims.length}`);
        console.log('========================================');

        if (pendingClaims.length === 0) {
            const msg = `
                <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                    <strong>⚠️ No Valid Claims Found</strong><br><br>
                    Found ${events.length} claim event(s), but none were valid pending claims.<br><br>
                    <strong>Claims must meet these criteria:</strong><br>
                    • Data integrity verified (Merkle proof valid)<br>
                    • Anomaly detected in sensor data<br><br>
                    Check the browser console (F12) for detailed event information.
                </div>
            `;
            document.getElementById('pendingClaimsList').style.display = 'block';
            document.getElementById('claimsContainer').innerHTML = msg;
            document.getElementById('claimsContainer').style.display = 'block';
            document.getElementById('noClaimsMessage').style.display = 'none';
            return;
        }

        displayPendingClaims();

    } catch (error) {
        console.error('Error loading pending claims:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        alert('Error loading pending claims: ' + error.message);
    } finally {
        document.getElementById('loadPendingClaimsBtn').textContent = 'Load Pending Claims';
        document.getElementById('loadPendingClaimsBtn').disabled = false;
    }
}

// Display pending claims
function displayPendingClaims() {
    const listDiv = document.getElementById('pendingClaimsList');
    const container = document.getElementById('claimsContainer');
    const noClaimsMsg = document.getElementById('noClaimsMessage');

    listDiv.style.display = 'block';

    console.log('📊 Displaying pending claims...');
    console.log('Total pending claims before filtering:', pendingClaims.length);

    // Filter out paid claims
    const paidClaims = JSON.parse(localStorage.getItem('paidClaims') || '[]');
    console.log('Paid claims in localStorage:', paidClaims.length);
    console.log('Paid claims data:', paidClaims);
    
    // Create a set of paid claim IDs for efficient lookup
    const paidClaimIds = new Set(paidClaims.map(claim => claim.claimId));
    
    const unpaidClaims = pendingClaims.filter(claim => {
        const claimId = `${claim.machineID}-${claim.anchorIndex}-${claim.submitter.toLowerCase()}`;
        const isPaid = paidClaimIds.has(claimId);
        if (isPaid) {
            console.log(`❌ Claim ${claimId} marked as paid, filtering out`);
        } else {
            console.log(`✅ Claim ${claimId} is unpaid, keeping`);
        }
        return !isPaid;
    });

    console.log('Unpaid claims after filtering:', unpaidClaims.length);

    if (unpaidClaims.length === 0) {
        container.style.display = 'none';
        noClaimsMsg.style.display = 'block';
        
        if (pendingClaims.length > 0) {
            noClaimsMsg.innerHTML = `
                All ${pendingClaims.length} claims have been processed ✅<br>
                <button onclick="localStorage.removeItem('paidClaims'); location.reload();" 
                    style="margin-top: 10px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Clear Paid Claims Cache
                </button>
            `;
        } else {
            noClaimsMsg.textContent = 'No pending claims found';
        }
        return;
    }

    container.style.display = 'grid';
    noClaimsMsg.style.display = 'none';
    container.innerHTML = '';

    unpaidClaims.forEach((claim, index) => {
        const anomalyCheck = checkAnomaly(claim.anomaly.data);
        
        const claimCard = document.createElement('div');
        claimCard.style.cssText = `
            padding: 15px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            background: linear-gradient(135deg, #fef3c7 0%, #fef9e3 100%);
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        claimCard.onmouseover = () => {
            claimCard.style.borderColor = '#f59e0b';
            claimCard.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
        };
        
        claimCard.onmouseout = () => {
            claimCard.style.borderColor = '#e5e7eb';
            claimCard.style.boxShadow = 'none';
        };

        claimCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                    <span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">PENDING</span>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-secondary);">${claim.anomaly.datetime}</span>
            </div>
            <div style="font-size: 0.9rem; margin-bottom: 8px;">
                <strong style="font-size: 1rem;">Machine ${claim.machineID}</strong> - Anomaly #${claim.anchorIndex}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">
                <strong>Submitted by:</strong> ${claim.submitter.substring(0, 10)}...${claim.submitter.substring(claim.submitter.length - 8)}
            </div>
            <div style="font-size: 0.8rem; color: #dc2626; margin-bottom: 5px;">
                <strong>⚠️ Issues Detected:</strong>
            </div>
            <div style="font-size: 0.8rem; margin-left: 10px;">
                ${anomalyCheck.voltageAnomaly ? `• Voltage: ${claim.anomaly.data.volt}V<br>` : ''}
                ${anomalyCheck.rotationAnomaly ? `• Rotation: ${claim.anomaly.data.rotation} RPM<br>` : ''}
                ${anomalyCheck.pressureAnomaly ? `• Pressure: ${claim.anomaly.data.pressure} PSI<br>` : ''}
                ${anomalyCheck.vibrationAnomaly ? `• Vibration: ${claim.anomaly.data.vibration} mm/s<br>` : ''}
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #fde68a;">
                <button style="width: 100%; padding: 8px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                    Review & Process Claim
                </button>
            </div>
        `;

        claimCard.onclick = () => selectClaimForReview(claim);
        container.appendChild(claimCard);
    });
}

// Select a claim for review
function selectClaimForReview(claim) {
    // Store the selected claim
    selectedClaim = claim;
    
    // Scroll to review section
    document.getElementById('reviewSection').scrollIntoView({ behavior: 'smooth' });

    // Auto-fill the review form
    document.getElementById('reviewMachineID').value = claim.machineID;
    document.getElementById('reviewAnomalyIndex').value = claim.anchorIndex;

    // Auto-fill payout form with submitter address
    document.getElementById('beneficiaryAddress').value = claim.submitter;
    
    // Suggest a payout amount (you can adjust this logic)
    document.getElementById('payoutAmount').value = '0.1'; // Default payout amount

    // Show payout section
    document.getElementById('payoutSection').style.display = 'block';
    document.getElementById('payoutSection').scrollIntoView({ behavior: 'smooth' });

    // Highlight the selected claim
    console.log('Selected claim:', claim);
    alert(`Claim selected for review:\n\nMachine: ${claim.machineID}\nSubmitter: ${claim.submitter}\n\nClick "Review Claim" to verify the data, then process payout.`);
}

// Process payout (insurance company sends ETH)
async function processClaimPayout() {
    const beneficiaryAddress = document.getElementById('beneficiaryAddress').value.trim();
    const payoutAmount = document.getElementById('payoutAmount').value.trim();

    if (!beneficiaryAddress || !payoutAmount) {
        alert('Please enter beneficiary address and payout amount');
        return;
    }

    if (!web3.utils.isAddress(beneficiaryAddress)) {
        alert('Invalid Ethereum address');
        return;
    }

    if (!connectedAccount) {
        alert('Please connect MetaMask first');
        return;
    }

    try {
        const amountInWei = web3.utils.toWei(payoutAmount, 'ether');
        
        console.log(`Processing payout: ${payoutAmount} ETH to ${beneficiaryAddress}`);

        const tx = await web3.eth.sendTransaction({
            from: connectedAccount,
            to: beneficiaryAddress,
            value: amountInWei,
            gas: 21000
        });

        console.log('Payout complete:', tx);
        displayPayoutResult(tx, beneficiaryAddress, payoutAmount);

    } catch (error) {
        console.error('Error processing payout:', error);
        
        if (error.code === 4001) {
            alert('⚠️ Transaction cancelled by user');
        } else {
            alert(`Error: ${error.message}`);
        }
    }
}

// Display payout result
function displayPayoutResult(tx, beneficiaryAddress, payoutAmount) {
    const payoutDetails = document.getElementById('payoutDetails');
    payoutDetails.style.display = 'block';
    
    document.getElementById('payoutStatus').innerHTML = '<span style="color: #10b981; font-weight: 600;">✅ SUCCESS</span>';
    document.getElementById('payoutBeneficiary').textContent = beneficiaryAddress;
    document.getElementById('payoutAmountDisplay').textContent = payoutAmount;
    document.getElementById('payoutTxHash').textContent = tx.transactionHash;
    document.getElementById('payoutGasUsed').textContent = tx.gasUsed.toLocaleString();
    
    // Mark claim as paid in local storage
    const paidClaims = JSON.parse(localStorage.getItem('paidClaims') || '[]');
    
    // Create a unique identifier for this claim
    const claimId = selectedClaim ? 
        `${selectedClaim.machineID}-${selectedClaim.anchorIndex}-${selectedClaim.submitter.toLowerCase()}` :
        `unknown-${beneficiaryAddress.toLowerCase()}`;
    
    const paidClaimRecord = {
        claimId: claimId,
        machineID: selectedClaim?.machineID || 'unknown',
        anchorIndex: selectedClaim?.anchorIndex || 0,
        submitter: selectedClaim?.submitter || beneficiaryAddress,
        beneficiary: beneficiaryAddress,
        txHash: tx.transactionHash,
        timestamp: Date.now(),
        payoutAmount: payoutAmount
    };
    
    console.log('💾 Storing paid claim:', paidClaimRecord);
    paidClaims.push(paidClaimRecord);
    localStorage.setItem('paidClaims', JSON.stringify(paidClaims));
    
    // Clear selected claim
    selectedClaim = null;
    
    // Show success message
    alert(`✅ Payout Successful!\n\nAmount: ${payoutAmount} ETH\nTo: ${beneficiaryAddress}\nTx: ${tx.transactionHash}\n\nThe claim has been marked as paid and will be removed from pending claims.`);
    
    // Reload pending claims to remove the paid one
    setTimeout(() => {
        loadPendingClaims();
    }, 1000);
    
    payoutDetails.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

// Render graphs
function renderTimeSeriesGraph(data, dateLabel = '') {
    if (voltageChartInstance) voltageChartInstance.destroy();
    if (rotationChartInstance) rotationChartInstance.destroy();
    if (pressureChartInstance) pressureChartInstance.destroy();
    if (vibrationChartInstance) vibrationChartInstance.destroy();

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

    voltageChartInstance = new Chart(document.getElementById('voltageGraph').getContext('2d'), {
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

    rotationChartInstance = new Chart(document.getElementById('rotationGraph').getContext('2d'), {
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

    pressureChartInstance = new Chart(document.getElementById('pressureGraph').getContext('2d'), {
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

    vibrationChartInstance = new Chart(document.getElementById('vibrationGraph').getContext('2d'), {
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
  document.getElementById('loadPendingClaimsBtn').addEventListener('click', loadPendingClaims);
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

  document.getElementById('reviewClaimBtn').addEventListener('click', reviewClaim);
  document.getElementById('processPayoutBtn').addEventListener('click', processClaimPayout);
  document.getElementById('filterDateBtn').addEventListener('click', filterDataByDate);
}

init();
console.log("Insurance portal loaded");
