const mongoose = require("mongoose");

let userEastSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  purchased: { type: Array, default: [] },
  inventory: { type: Array, default: [] },
  balance: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  location: String,
});

let userModel = mongoose.model("userEast", userEastSchema);

module.exports = userModel;
