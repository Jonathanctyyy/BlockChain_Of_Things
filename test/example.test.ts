import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleStorage", function () {
  it("stores and retrieves a value", async function () {
    const Factory = await ethers.getContractFactory("SimpleStorage");
    const instance = await Factory.deploy();
    await instance.deployed();

    await instance.set(42);
    expect(await instance.value()).to.equal(42);
  });
});
