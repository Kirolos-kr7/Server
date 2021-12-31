const mongoose = require("mongoose");

let productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
});

let productModel = mongoose.model("product", productSchema);

module.exports = productModel;
