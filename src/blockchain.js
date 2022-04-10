function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];
}

Blockchain.prototype.createNewBlock = (nonce, previousBlockHash, hash) => {
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

Blockchain.prototype.getLastBlock = () => {
  return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = (amount, sender, recipient) => {
  const newTransaction = {
    amount,
    sender,
    recipient,
  };
  this.pendingTransactions.push(newTransaction);
  // Index of block in which this transaction will be added to.
  return this.getLastBlock().index + 1;
};

module.exports = Blockchain;
