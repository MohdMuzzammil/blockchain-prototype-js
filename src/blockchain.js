const sha256 = require("sha256");
const currentNodeUrl = process.argv[3];
const uuid = require("uuid").v1;

function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];
  this.currentNodeUrl = currentNodeUrl;
  this.networkNodes = [];
  // Adding genesis block
  this.createNewBlock(0, "0", "0");
}

Blockchain.prototype.createNewBlock = function (
  nonce,
  previousBlockHash,
  hash
) {
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce: nonce,
    hash: hash,
    previousBlockHash: previousBlockHash,
  };
  this.pendingTransactions = [];
  this.chain.push(newBlock);
  return newBlock;
};

Blockchain.prototype.getLastBlock = function () {
  return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = function (
  amount,
  sender,
  recipient
) {
  const newTransaction = {
    amount,
    sender,
    recipient,
    transactionId: uuid().split("-").join(""),
  };
  return newTransaction;
};

Blockchain.prototype.addTransactionToPendingTransactions = function (
  transactionObj
) {
  this.pendingTransactions.push(transactionObj);
  // Index of block in which this transaction will be added to.
  return this.getLastBlock().index + 1;
};

Blockchain.prototype.hashBlock = function (
  previousBlockHash,
  currentBlockData,
  nonce
) {
  // Stringify might loose its order and data generated might be different when called repeatedly.
  // This could happen in case of object data
  const data =
    previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData);
  const hash = sha256(data);
  return hash;
};

Blockchain.prototype.proofOfWork = function (
  previousBlockHash,
  currentBlockData
) {
  /**
   * Try out different nonce value and call hashBlock method until a
   * hash stating with four 0's is found. Keeping data and previosBlockHash constant,
   * this becomes a trial and error method to find a nonce which satisfies the
   * requirement. Result of proof of work is the nonce value.
   */
  let nonce = 0;
  let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  while (hash.substring(0, 4) !== "0000") {
    nonce++;
    hash = this.hashBlock(previousBlockHash, currentBlockData, nonce);
  }
  return nonce;
};

Blockchain.prototype.chainIsValid = function (blockchain) {
  let validChain = true;
  var correctGenesis = true;
  for (var i = 1; i < blockchain.length; i++) {
    const currentBlock = blockchain[i];
    const previousBlock = blockchain[i - 1];
    const blockHash = this.hashBlock(
      previousBlock.hash,
      {
        transactions: currentBlock.transactions,
        index: currentBlock.index,
      },
      currentBlock.nonce
    );
    if (
      blockHash.substring(0, 4) !== "0000" ||
      currentBlock.previousBlockHash !== previousBlock.hash
    ) {
      validChain = false;
    }
    const genesisBlock = blockchain[0];
    correctGenesis =
      genesisBlock.nonce === 0 &&
      genesisBlock.previousBlock === 0 &&
      genesisBlock.hash === 0 &&
      genesisBlock.transactions.length === 0;
  }
  return validChain && correctGenesis;
};

module.exports = Blockchain;
