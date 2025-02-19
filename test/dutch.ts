const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReverseDutchAuction", function () {
  let DutchToken, dutchToken, Auction, auction, owner, buyer, otherBuyer;
  const initialSupply = ethers.parseEther("10000");
  const initialPrice = ethers.parseEther("10");
  const duration = 100;
  const priceDecreaseRate = ethers.parseEther("0.1");
  const tokensForSale = ethers.parseEther("100");

  beforeEach(async function () {
    [owner, buyer, otherBuyer] = await ethers.getSigners();

    DutchToken = await ethers.getContractFactory("DutchToken");
    dutchToken = await DutchToken.deploy(initialSupply);
    await dutchToken.waitForDeployment();

    Auction = await ethers.getContractFactory("ReverseDutchAuction");
    auction = await Auction.deploy(
      dutchToken.target,
      initialPrice,
      duration,
      priceDecreaseRate,
      tokensForSale
    );
    await auction.waitForDeployment();

    await dutchToken.transfer(auction.target, tokensForSale);
  });

  it("Should decrease price over time", async function () {
    const initialAuctionPrice = await auction.getCurrentPrice();
    await ethers.provider.send("evm_increaseTime", [50]); // Move time forward
    await ethers.provider.send("evm_mine"); // Mine a new block
    const newPrice = await auction.getCurrentPrice();
    expect(newPrice).to.be.below(initialAuctionPrice);
  });

  it("Should allow only one buyer to purchase", async function () {
    await auction.connect(buyer).buy({ value: initialPrice });
    await expect(
      auction.connect(otherBuyer).buy({ value: initialPrice })
    ).to.be.revertedWith("Auction has ended");
  });

  it("Should swap funds and tokens correctly", async function () {
    const buyerBalanceBefore = await dutchToken.balanceOf(buyer.address);
    await auction.connect(buyer).buy({ value: initialPrice });
    const buyerBalanceAfter = await dutchToken.balanceOf(buyer.address);
    
    expect(buyerBalanceAfter).to.equal(buyerBalanceBefore + tokensForSale);
  });
  

  it("Should handle no buyer before auction ends", async function () {
    await ethers.provider.send("evm_increaseTime", [duration]);
    await ethers.provider.send("evm_mine");
    expect(await auction.getCurrentPrice()).to.equal(0);
  });
});
