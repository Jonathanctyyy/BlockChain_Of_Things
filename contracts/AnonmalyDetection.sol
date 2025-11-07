// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AnomalyDetection {
    // Define thresholds for anomaly detection
    int256 public minThreshold;
    int256 public maxThreshold;

    // Event to log anomalies
    event AnomalyDetected(address indexed sender, int256 value);

    // Event to log normal data
    event DataReceived(address indexed sender, int256 value);

    // Constructor to initialize thresholds
    constructor(int256 _minThreshold, int256 _maxThreshold) {
        require(_minThreshold < _maxThreshold, "Invalid thresholds");
        minThreshold = _minThreshold;
        maxThreshold = _maxThreshold;
    }

    // Function to check IoT data
    function checkData(int256 data) public {
        if (data < minThreshold || data > maxThreshold) {
            // Emit anomaly event
            emit AnomalyDetected(msg.sender, data);
        } else {
            // Emit normal data event
            emit DataReceived(msg.sender, data);
        }
    }

    // Function to update thresholds (only owner can call this in a real-world scenario)
    function updateThresholds(int256 _minThreshold, int256 _maxThreshold) public {
        require(_minThreshold < _maxThreshold, "Invalid thresholds");
        minThreshold = _minThreshold;
        maxThreshold = _maxThreshold;
    }
}