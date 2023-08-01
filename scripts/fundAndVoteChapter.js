const hre = require("hardhat");
const ethers = hre.ethers;

const getAccounts = async (accounts) => {
  const director = "0xc108F2710D17B80989CD1a4320137932D1CFEeFc";
  const owner = accounts[0];
  const buyer = accounts[1];
  console.log(
    `
owner: ${owner.address}
director: ${director}
buyer: ${buyer.address}\n`
  );

  return { owner, director, buyer };
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

  const { director, owner, buyer } = await getAccounts(accounts);
  const { dpp, gate } = await deploy();

  console.log(
    "\n" + "=".repeat(25) + "Chapter #1 Started" + "=".repeat(25) + "\n"
  );

  await dpp.connect(owner).setDirector(director);
  console.log("[DocumentaryProducerPass] #setDirector");

  const producerPassChapter = {
    price: ethers.parseEther("0.1"),
    chapterId: 1,
    maxSupply: 20, // TODO: 5000 // 500 ETH // Shibuya
    maxPerWallet: 1,
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
    director: await ethers.provider.getBalance(director),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp.connect(owner).withdraw();
  console.log("[DocumentaryProducerPass] #withdraw ✅");
  console.log(
    `
    \tdirector: ${before.director.toString()} ➡️ ${(
      await ethers.provider.getBalance(director)
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
  await gate.connect(buyer).stakeProducerPassAndVote(1, 1, 1);
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
    await gate.connect(accounts[i]).stakeProducerPassAndVote(1, 1, 1);
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

  console.log(
    "\n" + "=".repeat(25) + "Chapter #2 Started" + "=".repeat(25) + "\n"
  );

  const producerPassChapter2 = {
    price: ethers.parseEther("0.1"),
    chapterId: 2,
    maxSupply: 20,
    maxPerWallet: 1,
  };
  await dpp
    .connect(owner)
    .setProducerPass(
      producerPassChapter2.price,
      producerPassChapter2.chapterId,
      producerPassChapter2.maxSupply,
      producerPassChapter2.maxPerWallet
    );
  console.log("[DocumentaryProducerPass] #setProducerPass(#2)");

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
    .mintProducerPass(producerPassChapter2.chapterId, buyAmount, {
      value: producerPassChapter2.price,
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
    `
  );

  console.log("\n" + "=".repeat(25) + "(Funding)" + "=".repeat(25) + "\n");

  for (let i = 0; i < accounts.length; i++) {
    if (accounts[i].address === buyer.address) continue;
    await dpp
      .connect(accounts[i])
      .mintProducerPass(producerPassChapter2.chapterId, buyAmount, {
        value: producerPassChapter2.price,
      });
  }

  before = {
    director: await ethers.provider.getBalance(director),
    dpp: await ethers.provider.getBalance(dpp.target),
  };
  await dpp.connect(owner).withdraw();
  console.log("[DocumentaryProducerPass] #withdraw ✅");
  console.log(
    `
    \tdirector: ${before.director.toString()} ➡️ ${(
      await ethers.provider.getBalance(director)
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
  await gate.connect(buyer).stakeProducerPassAndVote(2, 1, 1);
  console.log(`[Gate] #stakeProducerPassAndVote ✅`);
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
    await gate.connect(accounts[i]).stakeProducerPassAndVote(2, 1, 1);
  }

  console.log("\n" + "=".repeat(25) + "(Voting done)" + "=".repeat(25) + "\n");

  await gate.connect(owner).setVotingEnabledForChapter(2, false);
  console.log("[Gate] #setVotingEnabledForChapter");

  before = {
    buyer1155: await dpp.balanceOf(buyer.address, 2),
    gate1155: await dpp.balanceOf(gate.target, 2),
  };
  await gate.connect(buyer).unstakeProducerPass(2, 1);
  console.log(`[Gate] #unstakeProducerPass(${accounts.length}) ✅`);
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
