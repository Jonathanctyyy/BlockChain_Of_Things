// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PredictiveMaintenance {
    
    struct Anchor {
        uint256 timestamp;
        bytes32 merkleRoot;
        bool hasAnomaly; // New Field: Was there a problem in this batch?
    }

    mapping(string => Anchor[]) public machineLedger;

    // EVENTS
    event DataAnchored(string indexed machineID, uint256 timestamp);
    
    // CRITICAL EVENT: This is what makes it "Predictive Maintenance"
    // Maintenance bots can listen for this event to auto-schedule repairs.
    event AnomalyDetected(string indexed machineID, uint256 timestamp, string message);

    function storeProof(string memory _machineID, bytes32 _merkleRoot, bool _hasAnomaly) public {
        
        Anchor memory newAnchor = Anchor({
            timestamp: block.timestamp,
            merkleRoot: _merkleRoot,
            hasAnomaly: _hasAnomaly
        });

        machineLedger[_machineID].push(newAnchor);

        if (_hasAnomaly) {
            // Trigger the alarm on the blockchain
            emit AnomalyDetected(_machineID, block.timestamp, "CRITICAL: Sensor anomaly found in batch. Check off-chain data.");
        } else {
            emit DataAnchored(_machineID, block.timestamp);
        }
    }
}