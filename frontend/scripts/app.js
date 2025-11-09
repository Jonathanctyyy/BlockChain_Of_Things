const web3 = new Web3(window.ethereum); // Use MetaMask's provider

// Replace with your deployed contract address and ABI
const contractAddress = "0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D"; // Replace with your contract address
const contractABI = [
  {
    "inputs": [],
    "name": "getAnomalyMachineIDs",
    "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }],
    "stateMutability": "view",
    "type": "function",
  },
];

let contract;

// Initialize the contract
async function initContract() {
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const account = accounts[0];
  console.log("Connected account:", account);

  contract = new web3.eth.Contract(contractABI, contractAddress);
  console.log("Contract initialized:", contract);
}

// Check if the machine has any anomalies
async function checkMachine() {
  const machineID = document.getElementById("machineID").value;

  if (!machineID) {
    document.getElementById("result").textContent = "Please enter a valid Machine ID.";
    return;
  }

  try {
    const anomalies = await contract.methods.getAnomalyMachineIDs().call();
    console.log("Anomalies:", anomalies);

    if (anomalies.includes(machineID)) {
      document.getElementById("result").textContent = "Not OK: Anomaly detected for this machine.";
    } else {
      document.getElementById("result").textContent = "OK: No problems detected.";
    }
  } catch (error) {
    console.error("Error checking machine:", error);
    document.getElementById("result").textContent = "Error checking machine. Check the console for details.";
  }
}

// Initialize the app
async function init() {
  if (window.ethereum) {
    try {
      await initContract();

      // Attach event listener to the "Check Machine" button
      document.getElementById("checkDataBtn").addEventListener("click", checkMachine);
    } catch (error) {
      console.error("Error initializing app:", error);
    }
  } else {
    console.error("MetaMask is not installed!");
  }
}

// Run the app
init();