const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const Blockchain = require("./src/blockchain");
const uuid = require("uuid").v1;
const rp = require("request-promise");

const port = process.argv[2];

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
  const newTransaction = req.body;
  const index = blockchain.addTransactionToPendingTransactions(newTransaction);
  res.json({ note: "Transaction will be added in " + index });
});

app.post("/transaction/broadcast", (req, res) => {
  const newTransaction = blockchain.createNewTransaction(
    req.body.amount,
    req.body.sender,
    req.body.recipient
  );
  blockchain.addTransactionToPendingTransactions(newTransaction);
  return Promise.all(
    blockchain.networkNodes.map((networkNodeUrl) => {
      const requestOption = {
        uri: networkNodeUrl + "/transaction",
        method: "POST",
        body: newTransaction,
        json: true,
      };
      return rp(requestOption);
    })
  ).then((data) => {
    res.json({ note: "Transaction created and broadcast sucessfully" });
  });
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

  const newBlock = blockchain.createNewBlock(nonce, previousBlockHash, hash);

  Promise.all(
    blockchain.networkNodes.map((networkNodeUrl) => {
      const requestOptions = {
        uri: networkNodeUrl + "/receive-new-block",
        method: "POST",
        body: { newBlock },
        json: true,
      };
      return rp(requestOptions);
    })
  )
    .then((data) => {
      // Mining reward
      const requestOptions = {
        uri: blockchain.currentNodeUrl + "/transaction/broadcast",
        method: "POST",
        body: {
          amount: 12.5,
          sender: "00",
          recipient: nodeAddress,
        },
        json: true,
      };
      return rp(requestOptions);
    })
    .then((data) => {
      res.json({ note: "Block mined successfully", block: newBlock });
    });
});

app.post("/receive-new-block", (req, res) => {
  const newBlock = req.body.newBlock;
  const lastBlock = blockchain.getLastBlock();
  const correctHash = lastBlock.hash === newBlock.previousBlockHash;
  const correctIndex = lastBlock.index + 1 === newBlock.index;
  if (correctHash && correctIndex) {
    blockchain.chain.push(newBlock);
    blockchain.pendingTransactions = [];
    res.json({ note: "New block accepted", newBlock });
  } else {
    res.json({ note: "Block rejected", newBlock });
  }
});

app.post("/register-and-broadcast-node", (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if (blockchain.networkNodes.indexOf(newNodeUrl) !== -1)
    blockchain.networkNodes.push(newNodeUrl);
  Promise.all(
    blockchain.networkNodes.map((networkNodeUrl) => {
      //Call /register-node
      const requestOptions = {
        uri: networkNodeUrl + "/register-node",
        method: "POST",
        body: {
          newNodeUrl: newNodeUrl,
        },
        json: true,
      };
      return rp(requestOptions);
    })
  )
    .then((data) => {
      const bulkRegisterOptions = {
        uri: newNodeUrl + "/register-node-bulk",
        method: "POST",
        body: {
          allNetworkNodes: [
            ...blockchain.networkNodes,
            blockchain.currentNodeUrl,
          ],
        },
        json: true,
      };
      return rp(bulkRegisterOptions);
    })
    .then((data) => {
      res.json({ note: "New node registered" });
    });
});

app.post("/register-node", (req, res) => {
  const newNodeUrl = req.body.newNodeUrl;
  if (
    blockchain.networkNodes.indexOf(newNodeUrl) !== -1 && // Not registered yet
    newNodeUrl !== blockchain.currentNodeUrl // Not current node
  )
    blockchain.networkNodes.push(newNodeUrl);
  res.json({ note: "New node registered" });
});

app.post("/register-node-bulk", (req, res) => {
  req.body.allNetworkNodes.forEach((networkNode) => {
    if (
      blockchain.networkNodes.indexOf(networkNode) !== -1 &&
      networkNode !== blockchain.currentNodeUrl
    ) {
      blockchain.networkNodes.push(networkNode);
    }
  });
  res.json({ note: "Bulk networks registered" });
});

app.listen(port, () => {
  console.log("Listening on ", port);
});
