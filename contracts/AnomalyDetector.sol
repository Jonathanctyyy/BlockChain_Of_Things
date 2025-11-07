// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract AnomalyDetector {
    event DataSubmitted(uint256 sensorId, int256 value, bool anomaly);

    function submitReading(uint256 sensorId, int256 value) public returns (bool) {
        bool anomaly = value < -100 || value > 100; // Simple anomaly detection logic
        emit DataSubmitted(sensorId, value, anomaly);
        return anomaly;
    }
}
