const mongoose = require("mongoose");

let userWestSchema = new mongoose.Schema({
  username: String,
  email: { type: String, unique: true },
  password: String,
  purchased: { type: Array, default: [] },
  inventory: { type: Array, default: [] },
  balance: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  location: String,
});

let userModel = mongoose.model("userWest", userWestSchema);

module.exports = userModel;
