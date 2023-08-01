const hre = require("hardhat");
const ethers = hre.ethers;

const deploy = async () => {
  const dppFactory = await ethers.getContractFactory("DocumentaryPassToken");
  const dpp = await dppFactory.attach(
    "0x221174a1521720D35d5AEA0E7907bb88eb391D28"
  );
  // await dpp.waitForDeployment();
  console.log("DocumentaryPassToken:", dpp.target);

  const gateFactory = await ethers.getContractFactory("Gate");
  const gate = await gateFactory.attach(
    "0x73a1520558247d745BF2e66eeCf5E1D8be4451c7"
  );
  // await gate.waitForDeployment();
  console.log("Gate:", gate.target);

  return { dpp, gate };
};

let tx;
async function main() {
  const { dpp, gate } = await deploy();

  console.log(
    "\n" + "=".repeat(25) + "Chapter #1 Started" + "=".repeat(25) + "\n"
  );

  const documentaryPassChapter = {
    price: ethers.parseEther("0.1"),
    chapterId: 1,
    maxSupply: 2000, // TODO: 5000 // 500 ETH // Shibuya
    maxPerWallet: 2000,
  };
  tx = await dpp.setDocumentaryPass(
    documentaryPassChapter.price,
    documentaryPassChapter.chapterId,
    documentaryPassChapter.maxSupply,
    documentaryPassChapter.maxPerWallet
  );
  await tx.wait();
  console.log("[DocumentaryPassToken] #setDocumentaryPass");

  console.log(
    "\n" + "=".repeat(25) + "(Stake & Voting)" + "=".repeat(25) + "\n"
  );

  tx = await dpp.setApprovalForAll(gate.target, true);
  await tx.wait();
  console.log("[DocumentaryPassToken] #setApprovalForAll");

  tx = await gate.setChapters([1]);
  tx.wait();
  console.log("[Gate] #setChapters");

  tx = await gate.setChapterOptions(1, [1, 2, 3]);
  await tx.wait();
  console.log("[Gate] #setChapterOptions");

  tx = await gate.setDocumentaryPassToken(dpp.target);
  await tx.wait();
  console.log("[Gate] #setDocumentaryPassToken");

  tx = await gate.setVotingEnabledForChapter(1, true);
  await tx.wait();
  console.log("[Gate] #setVotingEnabledForChapter");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
