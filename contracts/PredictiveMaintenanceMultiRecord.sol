// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title PredictiveMaintenanceMultiRecord
 * @dev ON-CHAIN anomaly detection for MULTIPLE records per machine
 * This demonstrates the SEVERE gas costs when checking many records on-chain
 */
contract PredictiveMaintenanceMultiRecord {
    struct Proof {
        uint256 timestamp;
        bytes32 merkleRoot;
        bool hasAnomaly;
    }

    struct SensorReading {
        uint256 vibration;
        uint256 volt;
        uint256 pressure;
        uint256 rotation;
    }

    // Mapping: machineID => array of proofs
    mapping(uint256 => Proof[]) public machineProofs;
    
    // Mapping: machineID => registered address
    mapping(uint256 => address) public machineAddresses;

    event ProofStored(
        uint256 indexed machineID,
        bytes32 merkleRoot,
        bool hasAnomaly,
        uint256 recordsChecked,
        uint256 timestamp
    );

    event MachineRegistered(
        uint256 indexed machineID,
        address machineAddress
    );

    event AnomalyDetectedInRecord(
        uint256 indexed machineID,
        uint256 recordIndex,
        string reason,
        uint256 timestamp
    );

    /**
     * @dev Register a machine with its address
     */
    function registerMachine(uint256 machineID, address machineAddress) public {
        require(machineAddresses[machineID] == address(0), "Machine already registered");
        machineAddresses[machineID] = machineAddress;
        emit MachineRegistered(machineID, machineAddress);
    }

    /**
     * @dev Store proof with ON-CHAIN anomaly detection for MULTIPLE records
     * This function checks EACH record on-chain - EXTREMELY EXPENSIVE!
     * @param machineID The ID of the machine
     * @param merkleRoot The Merkle root of the data
     * @param readings Array of sensor readings to check (each one costs gas!)
     */
    function storeProofWithMultiRecordCheck(
        uint256 machineID,
        bytes32 merkleRoot,
        SensorReading[] calldata readings
    ) public {
        require(machineAddresses[machineID] != address(0), "Machine not registered");
        require(readings.length > 0, "No readings provided");

        // ON-CHAIN ANOMALY DETECTION - EXPENSIVE FOR EACH RECORD!
        bool hasAnomaly = false;

        // CHECK EACH RECORD ON-CHAIN (this is where gas explodes!)
        for (uint256 i = 0; i < readings.length; i++) {
            SensorReading memory reading = readings[i];
            
            // Rule 1: High vibration
            if (reading.vibration > 50) {
                hasAnomaly = true;
                emit AnomalyDetectedInRecord(machineID, i, "High Vibration", block.timestamp);
            }
            
            // Rule 2: Abnormal voltage
            if (reading.volt < 155 || reading.volt > 190) {
                hasAnomaly = true;
                emit AnomalyDetectedInRecord(machineID, i, "Abnormal Voltage", block.timestamp);
            }
            
            // Rule 3: Abnormal pressure
            if (reading.pressure > 120 || reading.pressure < 80) {
                hasAnomaly = true;
                emit AnomalyDetectedInRecord(machineID, i, "Abnormal Pressure", block.timestamp);
            }
            
            // Rule 4: Abnormal rotation
            if (reading.rotation > 550 || reading.rotation < 350) {
                hasAnomaly = true;
                emit AnomalyDetectedInRecord(machineID, i, "Abnormal Rotation", block.timestamp);
            }
        }

        // Store the proof with computed anomaly status
        Proof memory newProof = Proof({
            timestamp: block.timestamp,
            merkleRoot: merkleRoot,
            hasAnomaly: hasAnomaly
        });

        machineProofs[machineID].push(newProof);

        emit ProofStored(machineID, merkleRoot, hasAnomaly, readings.length, block.timestamp);
    }

    /**
     * @dev Get proof count for a machine
     */
    function getProofCount(uint256 machineID) public view returns (uint256) {
        return machineProofs[machineID].length;
    }

    /**
     * @dev Get a specific proof for a machine
     */
    function getProof(uint256 machineID, uint256 index) public view returns (
        uint256 timestamp,
        bytes32 merkleRoot,
        bool hasAnomaly
    ) {
        require(index < machineProofs[machineID].length, "Index out of bounds");
        Proof memory proof = machineProofs[machineID][index];
        return (proof.timestamp, proof.merkleRoot, proof.hasAnomaly);
    }
}
