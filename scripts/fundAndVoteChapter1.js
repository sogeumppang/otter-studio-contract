const hre = require("hardhat");
const ethers = hre.ethers;

const getAccounts = async (accounts) => {
  const maker = "0xc108F2710D17B80989CD1a4320137932D1CFEeFc";
  const owner = accounts[0];
  const buyer = accounts[1];
  console.log(
    `
owner: ${owner.address}
maker: ${maker}
buyer: ${buyer.address}\n`
  );

  return { owner, maker, buyer };
};

const deploy = async () => {
  const dppFactory = await ethers.getContractFactory("DocumentaryProducerPass");
  const dpp = await dppFactory.deploy("http://localhost:3000");
  console.log("DocumentaryProducerPass:", dpp.target);

  const gateFactory = await ethers.getContractFactory("Gate");
  const gate = await gateFactory.deploy();
  console.log("Gate:", gate.target);

  return { dpp, gate };
};

const tokenContract = async (address) => {
  const tokenFactory = await ethers.getContractFactory("Token");
  return tokenFactory.attach(address);
};

let before;

async function main() {
  const accounts = await hre.ethers.getSigners();

  const { maker, owner, buyer } = await getAccounts(accounts);
  const { dpp, gate } = await deploy();

  console.log(
    "\n" + "=".repeat(25) + "Chapter #1 Started" + "=".repeat(25) + "\n"
  );

  await dpp.connect(owner).setMaker(maker);
  console.log("[DocumentaryProducerPass] #setMaker");

  const producerPassChapter = {
    price: ethers.parseEther("0.1"),
    chapterId: 1,
    maxSupply: 2000, // TODO: 5000 // 500 ETH // Shibuya
    maxPerWallet: 1000,
  };
  await dpp
    .connect(owner)
    .setProducerPass(
      producerPassChapter.price,
      producerPassChapter.chapterId,
      producerPassChapter.maxSupply,
      producerPassChapter.maxPerWallet
    );
  console.log("[DocumentaryProducerPass] #setProducerPass");

  const buyAmount = 1;

  before = {
    buyer: await ethers.provider.getBalance(buyer),
    buyer1155: await dpp.balanceOf(buyer.address, 1),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp
    .connect(buyer)
    .mintProducerPass(producerPassChapter.chapterId, buyAmount, {
      value: producerPassChapter.price,
    });
  console.log("[DocumentaryProducerPass] #mintProducerPass ✅");
  console.log(
    `
    \tbuyer: ${before.buyer.toString()} ➡️ ${(
      await ethers.provider.getBalance(buyer)
    ).toString()} (wei)
    \tdpp  : ${before.dpp.toString()} ➡️ ${(
      await ethers.provider.getBalance(dpp.target)
    ).toString()} (wei)
    \tbuyer1155: ${before.buyer1155.toString()} ➡️ ${(
      await dpp.balanceOf(buyer.address, 1)
    ).toString()} (erc1155)
    `
  );

  console.log("\n" + "=".repeat(25) + "(Funding)" + "=".repeat(25) + "\n");

  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].address === buyer.address) continue;
    await dpp
      .connect(accounts[i])
      .mintProducerPass(producerPassChapter.chapterId, buyAmount, {
        value: producerPassChapter.price,
      });
  }

  before = {
    maker: await ethers.provider.getBalance(maker),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp.connect(owner).withdraw();
  console.log("[DocumentaryProducerPass] #withdraw ✅");
  console.log(
    `
    \tmaker: ${before.maker.toString()} ➡️ ${(
      await ethers.provider.getBalance(maker)
    ).toString()} (wei)
    \tdpp  : ${before.dpp.toString()} ➡️ ${(
      await ethers.provider.getBalance(dpp.target)
    ).toString()} (wei)
    `
  );

  console.log(
    "\n" + "=".repeat(25) + "(Stake & Voting)" + "=".repeat(25) + "\n"
  );

  await gate.connect(owner).setChapters([1]);
  console.log("[Gate] #setChapters");

  await gate.connect(owner).setChapterOptions(1, [1, 2]);
  console.log("[Gate] #setChapterOptions");

  await gate.connect(owner).setDocumentaryProducerPass(dpp.target);
  console.log("[Gate] #setDocumentaryProducerPass");

  await gate.connect(owner).setVotingEnabledForChapter(1, true);
  console.log("[Gate] #setVotingEnabledForChapter");

  const documentaryToken = await gate.documentaryToken();
  const token = await tokenContract(documentaryToken);

  before = {
    buyer: await token.balanceOf(buyer.address),
    gate: await token.balanceOf(gate.target),
    buyer1155: await dpp.balanceOf(buyer.address, 1),
    gate1155: await dpp.balanceOf(gate.target, 1),
  };
  await dpp.connect(buyer).setApprovalForAll(gate.target, true);
  await gate.connect(buyer).stakeProducerPass(1, 1, 1);
  console.log(`[Gate] #stakeProducerPass ✅`);
  console.log(
    `
    \tbuyer: ${before.buyer.toString()} ➡️ ${(
      await token.balanceOf(buyer.address)
    ).toString()} (erc20)
    \tgate : ${before.gate.toString()} ➡️ ${(
      await token.balanceOf(gate.target)
    ).toString()} (erc20)
    \tbuyer: ${before.buyer1155.toString()} ➡️ ${(
      await dpp.balanceOf(buyer.address, 1)
    ).toString()} (erc1155)
    \tgate : ${before.gate1155.toString()} ➡️ ${(
      await dpp.balanceOf(gate.target, 1)
    ).toString()} (erc1155)
    `
  );

  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].address === buyer.address) continue;
    await dpp.connect(accounts[i]).setApprovalForAll(gate.target, true);
    await gate.connect(accounts[i]).stakeProducerPass(1, 1, 1);
  }

  console.log("\n" + "=".repeat(25) + "(Unstake)" + "=".repeat(25) + "\n");

  await gate.connect(owner).setVotingEnabledForChapter(1, false);
  console.log("[Gate] #setVotingEnabledForChapter");

  before = {
    buyer1155: await dpp.balanceOf(buyer.address, 1),
    gate1155: await dpp.balanceOf(gate.target, 1),
  };
  await gate.connect(buyer).unstakeProducerPass(1, 1);
  console.log(`[Gate] #unstakeProducerPass ✅`);
  console.log(
    `
    \tbuyer: ${before.buyer1155.toString()} ➡️ ${(
      await dpp.balanceOf(buyer.address, 1)
    ).toString()} (erc1155)
    \tgate : ${before.gate1155.toString()} ➡️ ${(
      await dpp.balanceOf(gate.target, 1)
    ).toString()} (erc1155)
    `
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
