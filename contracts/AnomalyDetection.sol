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

    function approximateCheckDataGas(string memory machineID, int256 data) external view returns (uint256 estimatedGas, bool willBeAnomaly) {
        // Determine branch
        willBeAnomaly = (data < minThreshold || data > maxThreshold);

        // Heuristic components (rough constants; NOT exact):
        // - Base transaction intrinsic & calldata not included here.
        // - Event emission (DataReceived or AnomalyDetected): ~375 + topic/data costs.
        // - SSTORE for pushing new string pointer + string data storage (very variable).
        // We model string storage cost loosely by its byte length.
        uint256 len = bytes(machineID).length;

        // Base cost common to both (function entry, memory allocation, event base)
        uint256 base = 12_000;

        if (willBeAnomaly) {
            // Additional costs for:
            // - Dynamic array length update (SSTORE new value) ~20k if slot first time, else ~5k
            // - Writing string data (depends on length; very rough scaling)
            // - Second event topics (same as normal)
            // Heuristic: 25k + 300 * len
            estimatedGas = base + 25_000 + (300 * len);
        } else {
            // Normal path: only event emission (no array write)
            // Heuristic: base + 3k + 60 * len
            estimatedGas = base + 3_000 + (60 * len);
        }
    }
}