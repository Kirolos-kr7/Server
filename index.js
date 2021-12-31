const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const productsRouter = require("./routes/products");
const auth = require("./routes/auth");
const cors = require("cors");

// Initialize App
let app = express();

app.use(express.json({ extended: false }));
app.use(cors());
dotenv.config();

mongoose.connect(
  process.env.MONGODB_CONNENTION_STRING,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  (err) => {
    if (err) return console.log(err);
  }
);

app.use("/api", productsRouter);
app.use("/api", auth);

app.get("/", (req, res) => {
  res.send("Running 🏃‍♂️💨");
});

app.listen(process.env.PORT || 8080, () => {
  console.log(`LISTENING ON PORT ${process.env.PORT || 8080} 🔥`);
});
