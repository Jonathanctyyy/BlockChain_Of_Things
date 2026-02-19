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
    // ====================================
    // Anomaly detection happens OFF-CHAIN in process.js
    // Smart contract only verifies data integrity via Merkle proof
    // and confirms that anomalies were detected off-chain
    // ====================================

    // Events for insurance claims
    event ClaimValidated(
        string machineID,  // Removed 'indexed' to get actual string value instead of hash
        uint256 anchorIndex,
        bytes32 leaf,
        bool verified,
        bool hasAnomaly
    );

    // Simplified claim validation: Only verify proof + check hasAnomaly flag
    // All anomaly detection logic happens off-chain (in process.js)
    function validateInsuranceClaim(
        string memory _machineID,
        uint256 _anchorIndex,
        bytes32 _leaf,
        bytes32[] memory _proof,
        uint8[] memory _positions
    ) public returns (bool verified, bool hasAnomaly) {
        // Verify Merkle proof (data integrity check)
        verified = verifyMerkleProof(_machineID, _anchorIndex, _leaf, _proof, _positions);
        
        if (!verified) {
            emit ClaimValidated(_machineID, _anchorIndex, _leaf, false, false);
            return (false, false);
        }

        // Get the hasAnomaly flag that was set off-chain
        hasAnomaly = machineLedger[_machineID][_anchorIndex].hasAnomaly;
        
        emit ClaimValidated(_machineID, _anchorIndex, _leaf, true, hasAnomaly);
        return (verified, hasAnomaly);
    }
}