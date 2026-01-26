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
}