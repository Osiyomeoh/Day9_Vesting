import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Vesting", function () {
  async function deployVestingFixture() {
    const [owner, beneficiary] = await ethers.getSigners();

    const totalAmount = ethers.parseEther("1000");
    const start = await time.latest();
    const lockupDuration = 365 * 24 * 60 * 60; // 1 year in seconds
    const duration = 4 * 365 * 24 * 60 * 60; // 4 years in seconds

    const Vesting = await ethers.getContractFactory("Vesting");
    const vesting = await Vesting.deploy(
      beneficiary.address,
      start,
      lockupDuration,
      duration
    );

    return { vesting, owner, beneficiary, totalAmount, start, lockupDuration, duration };
  }

  describe("Deployment", function () {
    it("Should set the right beneficiary", async function () {
      const { vesting, beneficiary } = await loadFixture(deployVestingFixture);
      expect(await vesting.beneficiary()).to.equal(beneficiary.address);
    });

    it("Should set the right vesting schedule", async function () {
      const { vesting, start, lockupDuration, duration } = await loadFixture(deployVestingFixture);
      expect(await vesting.start()).to.equal(start);
      expect(await vesting.lockupDuration()).to.equal(lockupDuration);
      expect(await vesting.duration()).to.equal(duration);
    });
  });

  describe("Deposit", function () {
    it("Should accept Ether deposits", async function () {
      const { vesting, owner, totalAmount } = await loadFixture(deployVestingFixture);
      await vesting.connect(owner).deposit({ value: totalAmount });
      expect(await vesting.getBalance()).to.equal(totalAmount);
    });
  });

  describe("Vesting", function () {
    it("Should return 0 if current time is before lockup period", async function () {
      const { vesting, owner, totalAmount } = await loadFixture(deployVestingFixture);
      await vesting.connect(owner).deposit({ value: totalAmount });
      expect(await vesting.vestedAmount()).to.equal(0);
    });

    // it("Should vest Ether linearly after lockup period", async function () {
    //   const { vesting, owner, totalAmount, start, lockupDuration, duration } = await loadFixture(deployVestingFixture);
    //   await vesting.connect(owner).deposit({ value: totalAmount });
      
    //   await time.increaseTo(start + lockupDuration + duration / 2);
      
    //   const expectedVested = totalAmount / BigInt(2);
    //   expect(await vesting.vestedAmount()).to.be.closeTo(expectedVested, ethers.parseEther("1"));
    // });

    it("Should vest all Ether after full duration", async function () {
      const { vesting, owner, totalAmount, start, duration } = await loadFixture(deployVestingFixture);
      await vesting.connect(owner).deposit({ value: totalAmount });
      
      await time.increaseTo(start + duration);
      
      expect(await vesting.vestedAmount()).to.equal(totalAmount);
    });
  });

  describe("Release", function () {
    it("Should not release Ether before lockup period", async function () {
      const { vesting, owner, totalAmount } = await loadFixture(deployVestingFixture);
      await vesting.connect(owner).deposit({ value: totalAmount });
      await expect(vesting.release()).to.be.revertedWith("No Ether is due");
    });

    it("Should release vested Ether after lockup period", async function () {
      const { vesting, owner, beneficiary, totalAmount, start, lockupDuration, duration } = await loadFixture(deployVestingFixture);
      await vesting.connect(owner).deposit({ value: totalAmount });
      
      await time.increaseTo(start + lockupDuration + duration / 2);
      
      const initialBalance = await ethers.provider.getBalance(beneficiary.address);
      await vesting.release();
      const finalBalance = await ethers.provider.getBalance(beneficiary.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should release all Ether after full duration", async function () {
      const { vesting, owner, beneficiary, totalAmount, start, duration } = await loadFixture(deployVestingFixture);
      await vesting.connect(owner).deposit({ value: totalAmount });
      
      await time.increaseTo(start + duration);
      
      const initialBalance = await ethers.provider.getBalance(beneficiary.address);
      await vesting.release();
      const finalBalance = await ethers.provider.getBalance(beneficiary.address);
      
      expect(finalBalance - initialBalance).to.equal(totalAmount);
    });
  });
});