const mongoose = require("mongoose");

let transactionSchema = new mongoose.Schema({
  buyer: Object,
  seller: Object,
  amount: Number,
  productID: mongoose.Types.ObjectId,
  date: Date,
});

let transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel;
