// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract AnomalyDetection {
    // Define thresholds for anomaly detection
    int256 public minVoltage;
    int256 public maxVoltage;
    int256 public minRotation;
    int256 public maxRotation;
    int256 public minPressure;
    int256 public maxPressure;
    int256 public maxVibration;

    // Array to store anomalous machine IDs (added for retrieval)
    string[] private anomalyMachineIDs;

    // Event to log anomalies
    event AnomalyDetected(address indexed sender, string machineID, int256 value);

    // Event to log normal data
    event DataReceived(address indexed sender, string machineID, int256 value);

    // Constructor to initialize thresholds
    constructor(
        int256 _minVoltage,
        int256 _maxVoltage,
        int256 _minRotation,
        int256 _maxRotation,
        int256 _minPressure,
        int256 _maxPressure,
        int256 _maxVibration
    ) {
        require(_minVoltage < _maxVoltage, "Invalid voltage thresholds");
        require(_minRotation < _maxRotation, "Invalid rotation thresholds");
        require(_minPressure < _maxPressure, "Invalid pressure thresholds");
        minVoltage = _minVoltage;
        maxVoltage = _maxVoltage;
        minRotation = _minRotation;
        maxRotation = _maxRotation;
        minPressure = _minPressure;
        maxPressure = _maxPressure;
        maxVibration = _maxVibration;
    }

    // Function to check IoT data
    function checkData(
        string memory machineID,
        int256 voltage,
        int256 rotation,
        int256 pressure,
        int256 vibration
    ) public {
        bool isAnomaly =
            voltage < minVoltage ||
            voltage > maxVoltage ||
            rotation < minRotation ||
            rotation > maxRotation ||
            pressure < minPressure ||
            pressure > maxPressure ||
            vibration > maxVibration;

        if (isAnomaly) {
            anomalyMachineIDs.push(machineID); // Add to storage for later retrieval
            emit AnomalyDetected(msg.sender, machineID, voltage + rotation + pressure + vibration);
        } else {
            emit DataReceived(msg.sender, machineID, voltage + rotation + pressure + vibration);
        }
    }

    // Function to update thresholds (only owner can call this in a real-world scenario)
    function updateThresholds(
        int256 _minVoltage,
        int256 _maxVoltage,
        int256 _minRotation,
        int256 _maxRotation,
        int256 _minPressure,
        int256 _maxPressure,
        int256 _maxVibration
    ) public {
        require(_minVoltage < _maxVoltage, "Invalid voltage thresholds");
        require(_minRotation < _maxRotation, "Invalid rotation thresholds");
        require(_minPressure < _maxPressure, "Invalid pressure thresholds");
        minVoltage = _minVoltage;
        maxVoltage = _maxVoltage;
        minRotation = _minRotation;
        maxRotation = _maxRotation;
        minPressure = _minPressure;
        maxPressure = _maxPressure;
        maxVibration = _maxVibration;
    }

    // Batch processing function to handle multiple data points in a single transaction
    function checkDataBatch(
        string[] memory machineIDs,
        int256[] memory voltages,
        int256[] memory rotations,
        int256[] memory pressures,
        int256[] memory vibrations
    ) public {
        require(machineIDs.length == voltages.length, "Mismatched input lengths");
        require(rotations.length == pressures.length && pressures.length == vibrations.length, "Mismatched input lengths");
        for (uint256 i = 0; i < machineIDs.length; i++) {
            bool isAnomaly =
                voltages[i] < minVoltage ||
                voltages[i] > maxVoltage ||
                rotations[i] < minRotation ||
                rotations[i] > maxRotation ||
                pressures[i] < minPressure ||
                pressures[i] > maxPressure ||
                vibrations[i] > maxVibration;

            if (isAnomaly) {
                anomalyMachineIDs.push(machineIDs[i]); // Add to storage for later retrieval
                emit AnomalyDetected(msg.sender, machineIDs[i], voltages[i] + rotations[i] + pressures[i] + vibrations[i]);
            } else {
                emit DataReceived(msg.sender, machineIDs[i], voltages[i] + rotations[i] + pressures[i] + vibrations[i]);
            }
        }
    }

    // View function to retrieve anomalous machine IDs (added to match ABI and enable querying)
    function getAnomalyMachineIDs() public view returns (string[] memory) {
        return anomalyMachineIDs;
    }
}