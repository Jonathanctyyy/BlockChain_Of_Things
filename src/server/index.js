const express = require('express');
const Web3 = require('web3');
const AnomalyDetectorABI = require('../../artifacts/contracts/AnomalyDetector.sol/AnomalyDetector.json');

const app = express();
const port = 3000;

const web3 = new Web3('http://127.0.0.1:8545');
const contractAddress = '0xYourDeployedContractAddress'; // Replace with deployed address
const AnomalyDetector = new web3.eth.Contract(AnomalyDetectorABI.abi, contractAddress);

app.use(express.json());

app.post('/ingest', async (req, res) => {
  const { sensorId, value } = req.body;

  try {
    const accounts = await web3.eth.getAccounts();
    const anomaly = await AnomalyDetector.methods.submitReading(sensorId, value).send({ from: accounts[0] });

    res.json({ message: 'Data ingested', anomaly });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to ingest data' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
