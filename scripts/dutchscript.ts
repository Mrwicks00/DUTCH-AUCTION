const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("🚀 Starting Dutch Auction deployment and interaction script...\n");

    // Get signer
    const [deployer, buyer] = await ethers.getSigners();
    console.log("📌 Deploying with account:", deployer.address);

    // Deploy DutchToken
    console.log("\n🪙 Deploying DutchToken...");
    const initialSupply = ethers.parseEther("100"); // 100 tokens
    const DutchToken = await ethers.getContractFactory("DutchToken");
    const dutchToken = await DutchToken.deploy(initialSupply);
    await dutchToken.waitForDeployment();
    const dutchTokenAddress = await dutchToken.getAddress();
    console.log("✅ DutchToken deployed to:", dutchTokenAddress);

    // Check deployer balance
    console.log("💰 Deployer token balance:", ethers.formatEther(await dutchToken.balanceOf(deployer.address)));

    // Deploy ReverseDutchAuction
    console.log("\n📉 Deploying ReverseDutchAuction...");
    const tokensForSale = ethers.parseEther("10"); // 10 tokens for sale
    const initialPrice = ethers.parseEther("0.01"); // 0.01 ETH
    const duration = 3600; // 1 hour
    const priceDecreaseRate = ethers.parseEther("0.000001"); // Smaller decrease rate

    const ReverseDutchAuction = await ethers.getContractFactory("ReverseDutchAuction");
    const auction = await ReverseDutchAuction.deploy(
      dutchTokenAddress,
      initialPrice,
      duration,
      priceDecreaseRate,
      tokensForSale
    );
    await auction.waitForDeployment();
    const auctionAddress = await auction.getAddress();
    console.log("✅ ReverseDutchAuction deployed to:", auctionAddress);

    // Transfer tokens to auction contract
    console.log("\n📦 Transferring tokens to auction contract...");
    const transferTx = await dutchToken.transfer(auctionAddress, tokensForSale);
    await transferTx.wait();
    console.log("✅ Transferred", ethers.formatEther(tokensForSale), "tokens to auction contract");

    // Check auction contract balance
    console.log("🏦 Auction contract token balance:", ethers.formatEther(await dutchToken.balanceOf(auctionAddress)));

    // Get current price
    console.log("\n💵 Checking auction price...");
    const currentPrice = await auction.getCurrentPrice();
    console.log("🔹 Current price:", ethers.formatEther(currentPrice), "ETH");

    // Simulate waiting for price decrease
    async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    console.log("\n⏳ Waiting 10 seconds to simulate price drop...");
    await delay(10000); // Simulating waiting 10 seconds

    // Get new price after waiting
    const newPrice = await auction.getCurrentPrice();
    console.log("🔻 New price after 10s:", ethers.formatEther(newPrice), "ETH");

    // Buy using a different account (buyer)
    console.log("\n🛒 Buyer attempting to purchase...");
    const buyTx = await auction.connect(buyer).buy({ value: newPrice });
    await buyTx.wait();
    console.log("✅ Purchase successful!");

    // Check buyer's token balance
    console.log("🎉 Buyer token balance:", ethers.formatEther(await dutchToken.balanceOf(buyer.address)));

    // Check if auction ended
    console.log("\n🔚 Checking auction status...");
    const auctionEnded = await auction.auctionEnded();
    console.log("🚦 Auction ended:", auctionEnded);

    console.log("\n✅ Script completed successfully!");
    console.log("\n📜 Contract Addresses:");
    console.log("DutchToken:", dutchTokenAddress);
    console.log("ReverseDutchAuction:", auctionAddress);

  } catch (error) {
    console.error("\n❌ Error in script execution:");
    console.error(error);
    process.exit(1);
  }
}

// Run script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
