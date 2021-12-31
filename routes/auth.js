const userEastModel = require("../models/userEast");
const userWestModel = require("../models/userWest");
const router = require("express").Router();
const bcrypt = require("bcrypt");
const Joi = require("joi");
const JWT = require("jsonwebtoken");
const validateUser = require("../middlewares/validateUser");
const e = require("express");

const registerSchema = Joi.object({
  username: Joi.string().required(),
  email: Joi.string().required().email().min(4).max(255),
  password: Joi.string().required().min(6).max(255),
  location: Joi.string().valid("East", "West").required(),
});

router.post("/register", async (req, res) => {
  let { username, email, password, location } = req.body;

  const error = await validate(req.body);
  if (error)
    return res.json({
      status: 400,
      err: error.details[0].message.toUpperCase(),
    });

  if (location === "East") {
    const userEastExists = await userEastModel.findOne({ email });
    if (userEastExists)
      return res.json({ status: 400, err: 'USER "EMAIL" ALREADY EXISTS' });
  } else {
    const userWestExists = await userWestModel.findOne({ email });
    if (userWestExists)
      return res.json({ status: 400, err: 'USER "EMAIL" ALREADY EXISTS' });
  }

  let hashedPassword = await bcrypt.hash(password, 10);

  let user;

  if (location === "East") {
    user = new userEastModel({
      username,
      email,
      password: hashedPassword,
      location,
    });
  } else {
    user = new userWestModel({
      username,
      email,
      password: hashedPassword,
      location,
    });
  }

  user
    .save()
    .then((result) => {
      result.password = undefined;
      result.inventory = undefined;
      result.purchased = undefined;
      result.__v = undefined;

      let token = JWT.sign({ user: result }, process.env.SECRET_TOKEN, {
        expiresIn: "1y",
      });

      res.json({
        status: 200,
        message: `USER Registered IN ${location} SUCCESSFULLY`,
        token,
        user: result,
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.post("/login", async (req, res) => {
  try {
    let { email, password, location } = req.body;

    let userExists;

    if (location === "East") {
      userExists = await userEastModel.findOne({ email });
      if (!userExists)
        return res.json({ status: 400, err: 'USER "EMAIL" IS INCORRECT' });
    } else {
      userExists = await userWestModel.findOne({ email });
      if (!userExists)
        return res.json({ status: 400, err: 'USER "EMAIL" IS INCORRECT' });
    }

    let isSamePassword = await bcrypt.compare(password, userExists.password);

    if (!isSamePassword)
      return res.json({ status: 400, err: 'USER "PASSWORD" IS INCORRECT' });

    userExists.password = undefined;
    userExists.inventory = undefined;
    userExists.purchased = undefined;
    userExists.__v = undefined;

    let token = JWT.sign({ user: userExists }, process.env.SECRET_TOKEN, {
      expiresIn: "1y",
    });

    res.status(200).json({
      message: "USER LOGGED IN SUCCESSFULLY",
      token,
      user: userExists,
    });
  } catch (err) {
    res.send(err);
  }
});

const validate = async (data) => {
  let error = null;

  await registerSchema
    .validateAsync({
      username: data.username,
      email: data.email,
      password: data.password,
      location: data.location,
    })
    .then(() => {})
    .catch((err) => (error = err));

  return error;
};

router.get("/auth", async (req, res) => {
  try {
    const token = req.header("auth-token");
    if (!token) return res.status(401).send("ACCESS DENIED");

    let isValid = JWT.verify(token, process.env.SECRET_TOKEN);
    if (!isValid) return res.json({ status: 400, err: "INVALID TOKEN" });

    let dcu = JWT.decode(token, process.env.SECRET_TOKEN);

    let user;
    if (dcu.user.location === "East") {
      user = await userEastModel.findOne({ _id: dcu.user._id }).select({
        username: 1,
        email: 1,
        balance: 1,
        earnings: 1,
        location: 1,
      });
    } else if (dcu.user.location === "West") {
      user = await userEastModel.findOne({ _id: dcu.user._id }).select({
        username: 1,
        email: 1,
        balance: 1,
        earnings: 1,
        location: 1,
      });
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    res.json({ status: 200, user });
  } catch (err) {
    res.json({ message: "AUTHENTICATION FAILED", status: 400 });
  }
});

router.get("/stores", validateUser, async (req, res) => {
  try {
    let stores;
    let _id = res.locals.id;
    let location = res.locals.location;

    if (location === "East") {
      stores = await userEastModel
        .find({ inventory: { $exists: true, $not: { $size: 0 } } })
        .select("username");
    } else if (location === "West") {
      stores = await userWestModel
        .find({ inventory: { $exists: true, $not: { $size: 0 } } })
        .select("username");
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    stores.forEach((store, i) => {
      if (store._id.toString() === _id) {
        stores.splice(i, 1);
      }
    });

    res.json({ status: 200, stores });
  } catch (err) {
    res.json({ status: 400, message: "COULD'T GET STORES" });
  }
});

router.get("/store/:id", validateUser, async (req, res) => {
  try {
    let store;
    let location = res.locals.location;
    let storeID = req.params.id;

    if (location === "East") {
      store = await userEastModel
        .find({ _id: storeID })
        .select({ username: 1, inventory: 1 });
    } else if (location === "West") {
      store = await userWestModel
        .find({ _id: storeID })
        .select({ username: 1, inventory: 1 });
    } else {
      return res.json({ status: 400, message: "INCORRECT LOCATION" });
    }

    res.json({ status: 200, store });
  } catch (err) {
    res.json({ status: 400, message: "COULD'T GET STORE" });
  }
});

router.get("/inventory", validateUser, async (req, res) => {
  try {
    let user;
    let _id = res.locals.id;
    let location = res.locals.location;

    if (location === "East") {
      user = await userEastModel.findById({ _id }).select("inventory");
    } else if (location === "West") {
      user = await userWestModel.findById({ _id }).select("inventory");
    } else {
      return res.json({ status: 400, message: "INCORRECT LOCATION" });
    }

    res.json({ status: 200, user });
  } catch (err) {
    res.json({ status: 400, message: "ERROR WHILE FETCHING PRODUCTS" });
  }
});

router.get("/purchased", validateUser, async (req, res) => {
  try {
    let user;
    let _id = res.locals.id;
    let location = res.locals.location;

    if (location === "East") {
      user = await userEastModel.findById({ _id }).select("purchased");
    } else if (location === "West") {
      user = await userWestModel.findById({ _id }).select("purchased");
    } else {
      return res.json({ status: 400, message: "INCORRECT LOCATION" });
    }

    res.json({ status: 200, user });
  } catch (err) {
    res.json({ status: 400, message: "ERROR WHILE FETCHING PRODUCTS" });
  }
});

router.post("/increase-balance", validateUser, async (req, res) => {
  try {
    let _id = res.locals.id;
    let location = res.locals.location;
    let addedBalance = req.body.amount;

    if (location === "East") {
      await userEastModel.updateOne(
        { _id },
        { $inc: { balance: addedBalance } }
      );
    } else if (location === "West") {
      await userWestModel.updateOne(
        { _id },
        { $inc: { balance: addedBalance } }
      );
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    res.json({ status: 200, message: "BALANCE SUCCESSFULLY INCREASED" });
  } catch (err) {
    res.json({ status: 400, message: "COULDN'T INCREASE BALANCE" });
  }
});

module.exports = router;
