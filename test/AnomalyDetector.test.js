const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('AnomalyDetector', function () {
  let AnomalyDetector, anomalyDetector;

  beforeEach(async () => {
    AnomalyDetector = await ethers.getContractFactory('AnomalyDetector');
    anomalyDetector = await AnomalyDetector.deploy();
    await anomalyDetector.deployed();
  });

  it('should detect anomalies for out-of-range values', async () => {
    const result = await anomalyDetector.submitReading(1, 200);
    const receipt = await result.wait();
    const event = receipt.events.find((e) => e.event === 'DataSubmitted');
    expect(event.args.anomaly).to.be.true;
  });

  it('should not detect anomalies for in-range values', async () => {
    const result = await anomalyDetector.submitReading(1, 50);
    const receipt = await result.wait();
    const event = receipt.events.find((e) => e.event === 'DataSubmitted');
    expect(event.args.anomaly).to.be.false;
  });
});
