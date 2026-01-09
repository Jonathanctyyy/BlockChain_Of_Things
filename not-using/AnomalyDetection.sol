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

    // Struct to store anomalies with timestamps
    struct Anomaly {
        string machineID;
        uint256 timestamp;
    }

    // Array to store anomalies
    Anomaly[] private anomalies;

    // Event to log anomalies (added timestamp)
    event AnomalyDetected(address indexed sender, string machineID, uint256 timestamp, int256 value);

    // Event to log normal data
    event DataReceived(address indexed sender, string machineID, uint256 timestamp, int256 value);

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

    // Function to check IoT data (added timestamp)
    function checkData(
        string memory machineID,
        uint256 timestamp,
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
        
        int256 sumValue = voltage + rotation + pressure + vibration;
        
        if (isAnomaly) {
            anomalies.push(Anomaly(machineID, timestamp));
            emit AnomalyDetected(msg.sender, machineID, timestamp, sumValue);
        } else {
            emit DataReceived(msg.sender, machineID, timestamp, sumValue);
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

    // Batch processing function to handle multiple data points in a single transaction (added timestamps)
    function checkDataBatch(
        string[] memory machineIDs,
        uint256[] memory timestamps,
        int256[] memory voltages,
        int256[] memory rotations,
        int256[] memory pressures,
        int256[] memory vibrations
    ) public {
        require(machineIDs.length == voltages.length, "Mismatched input lengths");
        require(voltages.length == rotations.length, "Mismatched input lengths");
        require(rotations.length == pressures.length, "Mismatched input lengths");
        require(pressures.length == vibrations.length, "Mismatched input lengths");
        require(vibrations.length == timestamps.length, "Mismatched input lengths");

        for (uint256 i = 0; i < machineIDs.length; i++) {
            bool isAnomaly =
                voltages[i] < minVoltage ||
                voltages[i] > maxVoltage ||
                rotations[i] < minRotation ||
                rotations[i] > maxRotation ||
                pressures[i] < minPressure ||
                pressures[i] > maxPressure ||
                vibrations[i] > maxVibration;
            
            int256 sumValue = voltages[i] + rotations[i] + pressures[i] + vibrations[i];
            
            if (isAnomaly) {
                anomalies.push(Anomaly(machineIDs[i], timestamps[i]));
                emit AnomalyDetected(msg.sender, machineIDs[i], timestamps[i], sumValue);
            } else {
                emit DataReceived(msg.sender, machineIDs[i], timestamps[i], sumValue);
            }
        }
    }

    // Function to check if there were any anomalies for a machine during a time period
    function hasAnomalyInPeriod(
        string memory machineID,
        uint256 startTime,
        uint256 endTime
    ) public view returns (bool) {
        for (uint256 i = 0; i < anomalies.length; i++) {
            if (
                keccak256(bytes(anomalies[i].machineID)) == keccak256(bytes(machineID)) &&
                anomalies[i].timestamp >= startTime &&
                anomalies[i].timestamp <= endTime
            ) {
                return true;
            }
        }
        return false;
    }

    // View function to retrieve anomalous machine IDs (preserved from template, collects from anomalies)
    function getAnomalyMachineIDs() public view returns (string[] memory) {
        string[] memory ids = new string[](anomalies.length);
        for (uint256 i = 0; i < anomalies.length; i++) {
            ids[i] = anomalies[i].machineID;
        }
        return ids;
    }

    // Additional view function to retrieve full anomalies
    function getAnomalies() public view returns (Anomaly[] memory) {
        return anomalies;
    }
}