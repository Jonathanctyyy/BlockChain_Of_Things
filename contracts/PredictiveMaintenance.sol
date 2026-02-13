// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PredictiveMaintenance {
    
    struct Anchor {
        uint256 timestamp;
        bytes32 merkleRoot;
        bool hasAnomaly; // New Field: Was there a problem in this batch?
    }

    mapping(string => Anchor[]) public machineLedger;

    // Mapping to store machine addresses
    mapping(string => address) public machineAddresses;

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

    // Function to register a machine's address
    function registerMachine(string memory _machineID, address _machineAddress) public {
        machineAddresses[_machineID] = _machineAddress;
    }

    // Function to verify the machine's signature
    function verifySignature(
        string memory _machineID,
        bytes32 dataHash,
        bytes memory signature
    ) public view returns (bool) {
        // Recover the signer's address from the signature
        address signer = recoverSigner(dataHash, signature);

        // Check if the recovered address matches the registered machine address
        return signer == machineAddresses[_machineID];
    }

    // Internal function to recover the signer's address
    function recoverSigner(bytes32 dataHash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Split the signature into r, s, and v variables
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // Return the recovered address
        return ecrecover(dataHash, v, r, s);
    }

    // ====================================
    // MERKLE PROOF VERIFICATION
    // ====================================
    // Verify that a specific sensor reading is part of the dataset
    // represented by the stored Merkle root. This provides O(log n)
    // verification without needing to store all data on-chain.
    //
    // Parameters:
    // - _machineID: Machine identifier
    // - _anchorIndex: Index of the anchor (record batch) to verify against
    // - _leaf: Hash of the specific sensor reading to verify
    // - _proof: Array of sibling hashes forming the Merkle path
    // - _positions: Array indicating left (0) or right (1) position of each proof element
    //
    // Returns: true if the leaf is part of the tree, false otherwise
    // ====================================
    function verifyMerkleProof(
        string memory _machineID,
        uint256 _anchorIndex,
        bytes32 _leaf,
        bytes32[] memory _proof,
        uint8[] memory _positions
    ) public view returns (bool) {
        require(_proof.length == _positions.length, "Proof and positions length mismatch");
        
        // Get the stored Merkle root for this machine and anchor
        bytes32 storedRoot = machineLedger[_machineID][_anchorIndex].merkleRoot;
        
        // Compute the root from the leaf and proof
        bytes32 computedHash = _leaf;
        
        for (uint256 i = 0; i < _proof.length; i++) {
            bytes32 proofElement = _proof[i];
            
            // Hash pairs in the correct order based on position
            if (_positions[i] == 0) {
                // Proof element is on the left
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            } else {
                // Proof element is on the right
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            }
        }
        
        // Compare computed root with stored root
        return computedHash == storedRoot;
    }

    // Event emitted when a proof is successfully verified
    event ProofVerified(
        string indexed machineID,
        uint256 anchorIndex,
        bytes32 leaf,
        bool verified
    );

    // Wrapper function that emits an event after verification
    function verifyAndLog(
        string memory _machineID,
        uint256 _anchorIndex,
        bytes32 _leaf,
        bytes32[] memory _proof,
        uint8[] memory _positions
    ) public returns (bool) {
        bool verified = verifyMerkleProof(_machineID, _anchorIndex, _leaf, _proof, _positions);
        emit ProofVerified(_machineID, _anchorIndex, _leaf, verified);
        return verified;
    }

    // ====================================
    // INSURANCE CLAIM VALIDATION 
    // (DOUBLE CONFIRMATION SYSTEM)
    // ====================================
    // Phase 1: Verify Merkle proof (data integrity)
    // Phase 2: Check if values exceed policy thresholds (business logic)
    // Both must pass for a valid insurance claim
    // ====================================

    // Insurance policy thresholds
    struct PolicyThresholds {
        uint256 voltageMin;      // Minimum voltage (below triggers claim)
        uint256 voltageMax;      // Maximum voltage (above triggers claim)
        uint256 vibrationMax;    // Maximum vibration threshold
        uint256 pressureMin;     // Minimum pressure threshold
        uint256 pressureMax;     // Maximum pressure threshold
        uint256 rotationMin;     // Minimum rotation threshold
        uint256 rotationMax;     // Maximum rotation threshold
        bool enabled;            // Whether policy is active
    }

    // Store policy thresholds per machine
    mapping(string => PolicyThresholds) public insurancePolicies;

    // Events for insurance claims
    event PolicySet(string indexed machineID, address indexed setter);
    event ClaimValidated(
        string indexed machineID, 
        uint256 anchorIndex,
        bytes32 leaf,
        bool proofValid,
        bool policyMet,
        string reason
    );
    event ClaimApproved(string indexed machineID, uint256 timestamp, string claimType);
    event ClaimRejected(string indexed machineID, uint256 timestamp, string reason);

    // Set insurance policy thresholds for a machine
    function setInsurancePolicy(
        string memory _machineID,
        uint256 _voltageMin,
        uint256 _voltageMax,
        uint256 _vibrationMax,
        uint256 _pressureMin,
        uint256 _pressureMax,
        uint256 _rotationMin,
        uint256 _rotationMax
    ) public {
        insurancePolicies[_machineID] = PolicyThresholds({
            voltageMin: _voltageMin,
            voltageMax: _voltageMax,
            vibrationMax: _vibrationMax,
            pressureMin: _pressureMin,
            pressureMax: _pressureMax,
            rotationMin: _rotationMin,
            rotationMax: _rotationMax,
            enabled: true
        });
        emit PolicySet(_machineID, msg.sender);
    }

    // Disable insurance policy for a machine
    function disablePolicy(string memory _machineID) public {
        insurancePolicies[_machineID].enabled = false;
    }

    // DOUBLE CONFIRMATION: Verify proof AND check policy thresholds
    // Returns: (proofValid, policyMet, claimType)
    function validateInsuranceClaim(
        string memory _machineID,
        uint256 _anchorIndex,
        bytes32 _leaf,
        bytes32[] memory _proof,
        uint8[] memory _positions,
        uint256 voltage,      // in V * 10 (e.g., 1523 = 152.3V)
        uint256 vibration,    // in mm/s * 10
        uint256 pressure,     // in PSI * 10
        uint256 rotation      // in RPM
    ) public returns (bool proofValid, bool policyMet, string memory claimType) {
        // CHECK 1 (INTEGRITY): Verify Merkle proof
        proofValid = verifyMerkleProof(_machineID, _anchorIndex, _leaf, _proof, _positions);
        
        if (!proofValid) {
            emit ClaimRejected(_machineID, block.timestamp, "Merkle proof verification failed - data integrity compromised");
            return (false, false, "INTEGRITY_FAILED");
        }

        // CHECK 2 (POLICY): Verify against insurance thresholds
        PolicyThresholds memory policy = insurancePolicies[_machineID];
        
        if (!policy.enabled) {
            emit ClaimRejected(_machineID, block.timestamp, "No active insurance policy for this machine");
            return (true, false, "NO_POLICY");
        }

        // Check which threshold was exceeded
        string memory violation = "";
        bool thresholdExceeded = false;

        if (voltage < policy.voltageMin) {
            violation = "VOLTAGE_LOW";
            thresholdExceeded = true;
        } else if (voltage > policy.voltageMax) {
            violation = "VOLTAGE_HIGH";
            thresholdExceeded = true;
        } else if (vibration > policy.vibrationMax) {
            violation = "VIBRATION_HIGH";
            thresholdExceeded = true;
        } else if (pressure < policy.pressureMin) {
            violation = "PRESSURE_LOW";
            thresholdExceeded = true;
        } else if (pressure > policy.pressureMax) {
            violation = "PRESSURE_HIGH";
            thresholdExceeded = true;
        } else if (rotation < policy.rotationMin) {
            violation = "ROTATION_LOW";
            thresholdExceeded = true;
        } else if (rotation > policy.rotationMax) {
            violation = "ROTATION_HIGH";
            thresholdExceeded = true;
        }

        policyMet = thresholdExceeded;

        if (policyMet) {
            emit ClaimApproved(_machineID, block.timestamp, violation);
            emit ClaimValidated(_machineID, _anchorIndex, _leaf, true, true, violation);
        } else {
            emit ClaimRejected(_machineID, block.timestamp, "Readings within acceptable range - no policy violation");
            emit ClaimValidated(_machineID, _anchorIndex, _leaf, true, false, "NO_VIOLATION");
        }

        return (proofValid, policyMet, violation);
    }

    // View function to check if a reading would trigger a claim (no transaction needed)
    function checkClaimEligibility(
        string memory _machineID,
        uint256 voltage,
        uint256 vibration,
        uint256 pressure,
        uint256 rotation
    ) public view returns (bool eligible, string memory reason) {
        PolicyThresholds memory policy = insurancePolicies[_machineID];
        
        if (!policy.enabled) {
            return (false, "NO_POLICY");
        }

        if (voltage < policy.voltageMin) return (true, "VOLTAGE_LOW");
        if (voltage > policy.voltageMax) return (true, "VOLTAGE_HIGH");
        if (vibration > policy.vibrationMax) return (true, "VIBRATION_HIGH");
        if (pressure < policy.pressureMin) return (true, "PRESSURE_LOW");
        if (pressure > policy.pressureMax) return (true, "PRESSURE_HIGH");
        if (rotation < policy.rotationMin) return (true, "ROTATION_LOW");
        if (rotation > policy.rotationMax) return (true, "ROTATION_HIGH");

        return (false, "NO_VIOLATION");
    }
}