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
    maxPerWallet: 2000,
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

  console.log(
    "\n" + "=".repeat(25) + "(Stake & Voting)" + "=".repeat(25) + "\n"
  );

  await dpp.connect(owner).setApprovalForAll(gate.target, true);

  await gate.connect(owner).setChapters([1]);
  console.log("[Gate] #setChapters");

  await gate.connect(owner).setChapterOptions(1, [1, 2]);
  console.log("[Gate] #setChapterOptions");

  await gate.connect(owner).setDocumentaryProducerPass(dpp.target);
  console.log("[Gate] #setDocumentaryProducerPass");

  await gate.connect(owner).setVotingEnabledForChapter(1, true);
  console.log("[Gate] #setVotingEnabledForChapter");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
