const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Blockchain = require("./src/blockchain");
const uuid = require("uuid").v1;

// Address of current node
const nodeAddress = uuid().split("-").join("");

const blockchain = new Blockchain();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res, next) => {
  res.json("OK");
});

app.get("/blockchain", (req, res) => {
  res.send(blockchain);
});

app.post("/transaction", (req, res) => {
  const index = blockchain.createNewTransaction(
    req.body.amount,
    req.body.sender,
    req.body.recipient
  );
  res.json({ note: "Transaction will be added in " + index });
});

app.get("/mine", (req, res) => {
  const lastBlock = blockchain.getLastBlock();
  const previousBlockHash = lastBlock["hash"];
  const currentBlockData = {
    transactions: blockchain.pendingTransactions,
    index: lastBlock["index"] + 1,
  };
  const nonce = blockchain.proofOfWork(previousBlockHash, currentBlockData);
  const hash = blockchain.hashBlock(previousBlockHash, currentBlockData, nonce);

  // Mining reward
  blockchain.createNewTransaction(12.5, "00", nodeAddress);

  const newBlock = blockchain.createNewBlock(nonce, previousBlockHash, hash);
  res.json({ note: "Block mined successfully", block: newBlock });
});

app.listen(3000, () => {
  console.log("Listening on 3000");
});
