// yarn hardhat mint --network localhost
task("mint", "Mints producer passes for the given chapter", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  const dppFactory = await hre.ethers.getContractFactory(
    "DocumentaryProducerPass"
  );
  const dpp = await dppFactory.attach(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const tx = await dpp.connect(accounts[0]).mintProducerPass(1, 1, {
    value: ethers.parseEther("0.1"),
  });
  console.log(`#mintProducerPass(${tx.hash})`);
});

// yarn hardhat vote --network localhost
task("vote", "Vote", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  const gateFactory = await ethers.getContractFactory("Gate");
  const gate = await gateFactory.attach(
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  );

  const tx = await gate.connect(accounts[0]).stakeProducerPassAndVote(1, 1, 1);
  console.log(tx.hash);
});

// yarn hardhat mint-all-producer-pass --network localhost
task(
  "mint-all-producer-pass",
  "Mints producer passes for the given chapter",
  async (_, hre) => {
    const accounts = await hre.ethers.getSigners();
    const buyer = accounts[1];

    const dppFactory = await hre.ethers.getContractFactory(
      "DocumentaryProducerPass"
    );
    const dpp = await dppFactory.attach(
      "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    );

    for (let i = 0; i < accounts.length; i++) {
      if (buyer === accounts[i].address) continue;

      const tx = await dpp.connect(accounts[i]).mintProducerPass(1, 1, {
        value: ethers.parseEther("0.1"),
      });
      console.log(`#mintProducerPass(${tx.hash}) - ${i}`);
    }
  }
);

// yarn hardhat vote-all --network localhost
task("vote-all", "Vote", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();
  const buyer = accounts[1];

  const dppFactory = await hre.ethers.getContractFactory(
    "DocumentaryProducerPass"
  );
  const dpp = await dppFactory.attach(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const gateFactory = await ethers.getContractFactory("Gate");
  const gate = await gateFactory.attach(
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  );

  for (let i = 0; i < accounts.length; i++) {
    if (buyer === accounts[i].address) continue;

    await dpp.connect(accounts[i]).setApprovalForAll(gate.target, true);

    const tx = await gate
      .connect(accounts[i])
      .stakeProducerPassAndVote(1, 1, 1);
    console.log(`#stakeProducerPassAndVote(${tx.hash}) - ${i}`);
  }
});

// yarn hardhat approve --network localhost
task("approve", "Set approval for all", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  const dppFactory = await hre.ethers.getContractFactory(
    "DocumentaryProducerPass"
  );
  const dpp = await dppFactory.attach(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const tx = await dpp.setApprovalForAll(
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    true
  );
  console.log(tx.hash);
});
