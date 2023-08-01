const hre = require("hardhat");
const ethers = hre.ethers;

const getAccounts = async (accounts) => {
  const creator = "0xc108F2710D17B80989CD1a4320137932D1CFEeFc";
  const owner = accounts[0];
  const buyer = accounts[1];
  console.log(
    `
owner: ${owner.address}
creator: ${creator}
buyer: ${buyer.address}\n`
  );

  return { owner, creator, buyer };
};

const deploy = async () => {
  const dppFactory = await ethers.getContractFactory("DocumentaryPassToken");
  const dpp = await dppFactory.deploy("http://localhost:3000");
  console.log("DocumentaryPassToken:", dpp.target);

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

  const { creator, owner, buyer } = await getAccounts(accounts);
  const { dpp, gate } = await deploy();

  console.log(
    "\n" + "=".repeat(25) + "Chapter #1 Started" + "=".repeat(25) + "\n"
  );

  await dpp.connect(owner).setCreator(creator);
  console.log("[DocumentaryPassToken] #setCreator");

  const documentaryPassChapter = {
    price: ethers.parseEther("0.1"),
    chapterId: 1,
    maxSupply: 20, // TODO: 5000 // 500 ETH // Shibuya
    maxPerWallet: 1,
  };
  await dpp
    .connect(owner)
    .setDocumentaryPass(
      documentaryPassChapter.price,
      documentaryPassChapter.chapterId,
      documentaryPassChapter.maxSupply,
      documentaryPassChapter.maxPerWallet
    );
  console.log("[DocumentaryPassToken] #setDocumentaryPass");

  const buyAmount = 1;

  before = {
    buyer: await ethers.provider.getBalance(buyer),
    buyer1155: await dpp.balanceOf(buyer.address, 1),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp
    .connect(buyer)
    .mintDocumentaryPass(documentaryPassChapter.chapterId, buyAmount, {
      value: documentaryPassChapter.price,
    });
  console.log("[DocumentaryPassToken] #mintDocumentaryPass ✅");
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
      .mintDocumentaryPass(documentaryPassChapter.chapterId, buyAmount, {
        value: documentaryPassChapter.price,
      });
  }

  before = {
    creator: await ethers.provider.getBalance(creator),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp.connect(owner).withdraw();
  console.log("[DocumentaryPassToken] #withdraw ✅");
  console.log(
    `
    \tcreator: ${before.creator.toString()} ➡️ ${(
      await ethers.provider.getBalance(creator)
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

  await gate.connect(owner).setDocumentaryPassToken(dpp.target);
  console.log("[Gate] #setDocumentaryPassToken");

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
  await gate.connect(buyer).stakeDocumentaryPassAndVote(1, 1, 1);
  console.log(`[Gate] #stakeDocumentaryPass ✅`);
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
    await gate.connect(accounts[i]).stakeDocumentaryPassAndVote(1, 1, 1);
  }

  console.log("\n" + "=".repeat(25) + "(Unstake)" + "=".repeat(25) + "\n");

  await gate.connect(owner).setVotingEnabledForChapter(1, false);
  console.log("[Gate] #setVotingEnabledForChapter");

  before = {
    buyer1155: await dpp.balanceOf(buyer.address, 1),
    gate1155: await dpp.balanceOf(gate.target, 1),
  };
  await gate.connect(buyer).unstakeDocumentaryPass(1, 1);
  console.log(`[Gate] #unstakeDocumentaryPass ✅`);
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

  console.log(
    "\n" + "=".repeat(25) + "Chapter #2 Started" + "=".repeat(25) + "\n"
  );

  const documentaryPassChapter2 = {
    price: ethers.parseEther("0.1"),
    chapterId: 2,
    maxSupply: 20,
    maxPerWallet: 1,
  };
  await dpp
    .connect(owner)
    .setDocumentaryPass(
      documentaryPassChapter2.price,
      documentaryPassChapter2.chapterId,
      documentaryPassChapter2.maxSupply,
      documentaryPassChapter2.maxPerWallet
    );
  console.log("[DocumentaryPassToken] #setDocumentaryPass(#2)");

  await gate.connect(owner).setChapters([1, 2]);
  console.log("[Gate] #setChapters");

  await gate.connect(owner).setChapterOptions(2, [1, 2, 3]);
  console.log("[Gate] #setChapterOptions(2)");

  before = {
    buyer: await ethers.provider.getBalance(buyer),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp
    .connect(buyer)
    .mintDocumentaryPass(documentaryPassChapter2.chapterId, buyAmount, {
      value: documentaryPassChapter2.price,
    });
  console.log("[DocumentaryPassToken] #mintDocumentaryPass ✅");
  console.log(
    `
    \tbuyer: ${before.buyer.toString()} ➡️ ${(
      await ethers.provider.getBalance(buyer)
    ).toString()} (wei)
    \tdpp  : ${before.dpp.toString()} ➡️ ${(
      await ethers.provider.getBalance(dpp.target)
    ).toString()} (wei)
    `
  );

  console.log("\n" + "=".repeat(25) + "(Funding)" + "=".repeat(25) + "\n");

  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].address === buyer.address) continue;
    await dpp
      .connect(accounts[i])
      .mintDocumentaryPass(documentaryPassChapter2.chapterId, buyAmount, {
        value: documentaryPassChapter2.price,
      });
  }

  before = {
    creator: await ethers.provider.getBalance(creator),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp.connect(owner).withdraw();
  console.log("[DocumentaryPassToken] #withdraw ✅");
  console.log(
    `
    \tcreator: ${before.creator.toString()} ➡️ ${(
      await ethers.provider.getBalance(creator)
    ).toString()} (wei)
    \tdpp  : ${before.dpp.toString()} ➡️ ${(
      await ethers.provider.getBalance(dpp.target)
    ).toString()} (wei)
    `
  );

  console.log(
    "\n" + "=".repeat(25) + "(Stake & Voting)" + "=".repeat(25) + "\n"
  );

  await gate.connect(owner).setVotingEnabledForChapter(2, true);
  console.log("[Gate] #setVotingEnabledForChapter");

  before = {
    buyer: await token.balanceOf(buyer.address),
    gate: await token.balanceOf(gate.target),
    buyer1155: await dpp.balanceOf(buyer.address, 2),
    gate1155: await dpp.balanceOf(gate.target, 2),
  };
  await dpp.connect(buyer).setApprovalForAll(gate.target, true);
  await gate.connect(buyer).stakeDocumentaryPassAndVote(2, 1, 1);
  console.log(`[Gate] #stakeDocumentaryPassAndVote ✅`);
  console.log(
    `
    \tbuyer: ${before.buyer.toString()} ➡️ ${(
      await token.balanceOf(buyer.address)
    ).toString()} (erc20)
    \tgate : ${before.gate.toString()} ➡️ ${(
      await token.balanceOf(gate.target)
    ).toString()} (erc20)
    \tbuyer: ${before.buyer1155.toString()} ➡️ ${(
      await dpp.balanceOf(buyer.address, 2)
    ).toString()} (erc1155)
    \tgate : ${before.gate1155.toString()} ➡️ ${(
      await dpp.balanceOf(gate.target, 2)
    ).toString()} (erc1155)
    `
  );

  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].address === buyer.address) continue;
    await dpp.connect(accounts[i]).setApprovalForAll(gate.target, true);
    await gate.connect(accounts[i]).stakeDocumentaryPassAndVote(2, 1, 1);
  }

  console.log("\n" + "=".repeat(25) + "(Voting done)" + "=".repeat(25) + "\n");

  await gate.connect(owner).setVotingEnabledForChapter(2, false);
  console.log("[Gate] #setVotingEnabledForChapter");

  before = {
    buyer1155: await dpp.balanceOf(buyer.address, 2),
    gate1155: await dpp.balanceOf(gate.target, 2),
  };
  await gate.connect(buyer).unstakeDocumentaryPass(2, 1);
  console.log(`[Gate] #unstakeDocumentaryPass(${accounts.length}) ✅`);
  console.log(
    `
    \tbuyer: ${before.buyer1155.toString()} ➡️ ${(
      await dpp.balanceOf(buyer.address, 2)
    ).toString()} (erc1155)
    \tgate : ${before.gate1155.toString()} ➡️ ${(
      await dpp.balanceOf(gate.target, 2)
    ).toString()} (erc1155)
    `
  );

  console.log("\n" + "=".repeat(25) + "(Unstake)" + "=".repeat(25) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
