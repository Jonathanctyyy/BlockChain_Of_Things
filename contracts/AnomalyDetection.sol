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

    // Constructor to initialize thresholds
    constructor(int256 _minThreshold, int256 _maxThreshold) {
        require(_minThreshold < _maxThreshold, "Invalid thresholds");
        minThreshold = _minThreshold;
        maxThreshold = _maxThreshold;
    }

    // Function to check IoT data
    function checkData(string memory machineID, int256 data) public {
        if (data < minThreshold || data > maxThreshold) {
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

    // Batch processing function to handle multiple data points in a single transaction
    function checkDataBatch(string[] memory machineIDs, int256[] memory data) public {
        require(machineIDs.length == data.length, "Mismatched input lengths");

        for (uint256 i = 0; i < machineIDs.length; i++) {
            if (data[i] < minThreshold || data[i] > maxThreshold) {
                emit AnomalyDetected(msg.sender, machineIDs[i], data[i]);
            } else {
                emit DataReceived(msg.sender, machineIDs[i], data[i]);
            }
        }
    }
}