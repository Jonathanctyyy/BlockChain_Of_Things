// SPDX-License-Identifier: MIT
pragma solidity >=0.8.28;

contract PredictiveMaintenance {
    
    struct Anchor {
        uint256 timestamp;
        bytes32 merkleRoot;
        bool hasAnomaly; 
    }

    mapping(string => Anchor[]) public machineLedger;

    // Mapping to store machine addresses
    mapping(string => address) public machineAddresses;

    // EVENTS
    event DataAnchored(string indexed machineID, uint256 timestamp);
    
    // Maintenance function
    event AnomalyDetected(string indexed machineID, uint256 timestamp, string message);

    function storeProof(string memory machineID, bytes32 merkleRoot, bool hasAnomaly) public {
        
        Anchor memory newAnchor = Anchor({
            timestamp: block.timestamp,
            merkleRoot: merkleRoot,
            hasAnomaly: hasAnomaly
        });

        machineLedger[machineID].push(newAnchor);

        if (hasAnomaly) {
            // Trigger the alarm on the blockchain
            emit AnomalyDetected(machineID, block.timestamp, "CRITICAL: Sensor anomaly found in batch. Check off-chain data.");
        } else {
            emit DataAnchored(machineID, block.timestamp);
        }
    }

    // Function to register a machine's address
    function registerMachine(string memory machineID, address machineAddress) public {
        machineAddresses[machineID] = machineAddress;
    }

    // Function to verify the machine's signature
    function verifySignature(
        string memory machineID,
        bytes32 dataHash,
        bytes memory signature
    ) public view returns (bool) {
        // Recover the signer's address from the signature
        address signer = recoverSigner(dataHash, signature);

        // Check if the recovered address matches the registered machine address
        return signer == machineAddresses[machineID];
    }

    // Internal function to recover the signer's address
    // Follows EIP-191: Ethereum Signed Message standard
    // standard method for ECDSA signature recovery
    function recoverSigner(bytes32 dataHash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // Split the signature into r, s, and v variables
        // slither-disable-next-line assembly
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // Create Ethereum Signed Message hash (EIP-191)
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash)
        );

        // Return the recovered address
        return ecrecover(ethSignedHash, v, r, s);
    }

    // MERKLE PROOF VERIFICATION
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
        string memory machineID,
        uint256 anchorIndex,
        bytes32 leaf,
        bytes32[] memory proof,
        uint8[] memory positions
    ) public view returns (bool) {
        require(proof.length == positions.length, "Proof and positions length mismatch");
        
        // Get the stored Merkle root for this machine and anchor
        bytes32 storedRoot = machineLedger[machineID][anchorIndex].merkleRoot;
        
        // Compute the root from the leaf and proof
        bytes32 computedHash = leaf;
        
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            
            // Use sorted pairs (OpenZeppelin standard) for deterministic hashing
            // This prevents position-dependent vulnerabilities
            if (computedHash <= proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
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
        string memory machineID,
        uint256 anchorIndex,
        bytes32 leaf,
        bytes32[] memory proof,
        uint8[] memory positions
    ) public returns (bool) {
        bool verified = verifyMerkleProof(machineID, anchorIndex, leaf, proof, positions);
        emit ProofVerified(machineID, anchorIndex, leaf, verified);
        return verified;
    }

    // INSURANCE CLAIM VALIDATION 
    // Anomaly detection happens OFF-CHAIN in process.js
    // Smart contract only verifies data integrity via Merkle proof
    // and confirms that anomalies were detected off-chain

    // Events for insurance claims
    event ClaimValidated(
        string machineID,  // Removed 'indexed' to get actual string value instead of hash
        uint256 anchorIndex,
        bytes32 leaf,
        bool verified,
        bool hasAnomaly
    );

    // Only verify proof + check hasAnomaly flag
    // All anomaly detection logic happens off-chain (in process.js)
    function validateInsuranceClaim(
        string memory machineID,
        uint256 anchorIndex,
        bytes32 leaf,
        bytes32[] memory proof,
        uint8[] memory positions
    ) public returns (bool verified, bool hasAnomaly) {
        // Verify Merkle proof (data integrity check)
        verified = verifyMerkleProof(machineID, anchorIndex, leaf, proof, positions);
        
        if (!verified) {
            emit ClaimValidated(machineID, anchorIndex, leaf, false, false);
            return (false, false);
        }

        // Get the hasAnomaly flag that was set off-chain
        hasAnomaly = machineLedger[machineID][anchorIndex].hasAnomaly;
        
        emit ClaimValidated(machineID, anchorIndex, leaf, true, hasAnomaly);
        return (verified, hasAnomaly);
    }
}