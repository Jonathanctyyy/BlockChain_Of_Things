// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AnomalyDetection {
    // Define thresholds for anomaly detection
    int256 public minThreshold;
    int256 public maxThreshold;

    // Event to log anomalies
    event AnomalyDetected(address indexed sender, string machineID, int256 value);

    // Event to log normal data
    event DataReceived(address indexed sender, string machineID, int256 value);

    // List to store machine IDs with anomalies
    string[] public anomalyMachineIDs;

    // Constructor to initialize thresholds
    constructor(int256 _minThreshold, int256 _maxThreshold) {
        require(_minThreshold < _maxThreshold, "Invalid thresholds");
        minThreshold = _minThreshold;
        maxThreshold = _maxThreshold;
    }

    // Function to check IoT data
    function checkData(string memory machineID, int256 data) public {
        if (data < minThreshold || data > maxThreshold) {
            anomalyMachineIDs.push(machineID);
            emit AnomalyDetected(msg.sender, machineID, data);
        } else {
            emit DataReceived(msg.sender, machineID, data);
        }
    }

    // Function to update thresholds (only owner can call this in a real-world scenario)
    function updateThresholds(int256 _minThreshold, int256 _maxThreshold) public {
        require(_minThreshold < _maxThreshold, "Invalid thresholds");
        minThreshold = _minThreshold;
        maxThreshold = _maxThreshold;
    }

    // Function to get the list of anomaly machine IDs
    function getAnomalyMachineIDs() public view returns (string[] memory) {
        return anomalyMachineIDs;
    }
}