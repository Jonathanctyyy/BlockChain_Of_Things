import { expect } from "chai";
import { ethers } from "hardhat";

describe("Greeter", function () {
  let greeter: any;

  beforeEach(async function () {
    const Greeter = await ethers.getContractFactory("Greeter");
    greeter = await Greeter.deploy("Hello, world!");
    await greeter.deployed();
  });

  it("should return the initial greeting", async function () {
    expect(await greeter.greet()).to.equal("Hello, world!");
  });

  it("should update the greeting", async function () {
    await greeter.setGreeting("Hola, mundo!");
    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});