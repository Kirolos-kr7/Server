const { Types } = require("mongoose");
const productModel = require("../models/product");
const userEastModel = require("../models/userEast");
const userWestModel = require("../models/userWest");
const validateUser = require("../middlewares/validateUser");
const Joi = require("joi");
const transactionModel = require("../models/Transaction");
const router = require("express").Router();

router.put("/product", validateUser, async (req, res) => {
  try {
    let _id = res.locals.id;
    let location = res.locals.location;
    let { name, price, description } = req.body;

    const error = await validateProduct(req.body);
    if (error)
      return res.json({
        status: 400,
        err: error.details[0].message.toUpperCase(),
      });

    const product = new productModel({
      name,
      price,
      description: description || "",
    });

    if (location === "East") {
      await userEastModel.updateOne({ _id }, { $push: { inventory: product } });
    } else if (location === "West") {
      await userWestModel.updateOne({ _id }, { $push: { inventory: product } });
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    res.json({ status: 200, message: "PRODUCT SUCCESSFULLY ADDED" });
  } catch (err) {
    res.json({ status: 400, message: "COULDN'T ADD PRODUCT" });
  }
});

router.delete("/product/:id", validateUser, async (req, res) => {
  try {
    let result;
    let _id = res.locals.id;
    let location = res.locals.location;
    let productID = req.params.id;

    if (location === "East") {
      result = await userEastModel.updateOne(
        { _id },
        { $pull: { inventory: { _id: Types.ObjectId(productID) } } }
      );
    } else if (location === "West") {
      result = await userWestModel.updateOne(
        { _id },
        { $pull: { inventory: { _id: Types.ObjectId(productID) } } }
      );
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    if (result.modifiedCount > 0) {
      res.json({ status: 200, message: "PRODUCT SUCCESSFULLY REMOVED" });
    } else {
      res.json({ status: 200, message: "PRODUCT NOT FOUND" });
    }
  } catch (err) {
    res.json({ status: 400, message: "COULDN'T REMOVE PRODUCT" });
  }
});

router.patch("/product/:id", validateUser, async (req, res) => {
  try {
    let _id = res.locals.id;
    let location = res.locals.location;
    let productID = req.params.id;
    let { name, price, description } = req.body;
    let result;

    const error = await validateProduct(req.body);
    if (error)
      return res.json({
        status: 400,
        err: error.details[0].message.toUpperCase(),
      });

    if (location === "East") {
      result = await userEastModel.findOne({ _id });
    } else if (location === "West") {
      result = await userWestModel.findOne({ _id });
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    result.inventory.forEach((prod) => {
      if (prod._id.toString() === productID) {
        prod.name = name ? name : prod.name;
        prod.price = price ? price : prod.price;
        prod.description = description ? description : prod.description;
      }
    });

    let response;

    if (location === "East") {
      response = await userEastModel.updateOne(
        { _id },
        { inventory: result.inventory }
      );
    } else if (location === "West") {
      response = await userWestModel.updateOne(
        { _id },
        { inventory: result.inventory }
      );
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    if (response.modifiedCount > 0) {
      res.json({ status: 200, message: "PRODUCT SUCCESSFULLY UPDTATED" });
    } else res.json({ status: 400, message: "COULDN'T UPDTATE PRODUCT" });
  } catch (err) {
    res.json({ status: 400, message: "COULDN'T UPDTATE PRODUCT" });
  }
});

router.post("/purchase-product", validateUser, async (req, res) => {
  try {
    let buyerID = res.locals.id;
    let location = res.locals.location;
    let sellerID = req.body.sellerID;
    let productID = req.body.productID;
    let buyer, seller;

    if (buyerID === sellerID)
      return res.json({
        status: 200,
        message: "YOU CANNOT SELL PRODUCT TO YOURSELF",
      });

    if (location === "East") {
      buyer = await userEastModel.findOne({ _id: buyerID });
      seller = await userEastModel.findOne({ _id: sellerID });
    } else if (location === "West") {
      buyer = await userWestModel.findOne({ _id: buyerID });
      seller = await userWestModel.findOne({ _id: sellerID });
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    let product = seller.inventory.find((prod) => {
      if (prod._id.toString() == productID) {
        return prod;
      }
    });

    if (buyer.balance < product.price)
      return res.json({ status: 200, message: "INSUFFICENT BALANCE" });

    if (location === "East") {
      await userEastModel.updateOne(
        { _id: buyerID },
        {
          balance: buyer.balance - product.price,
          $push: { purchased: product },
        }
      );

      await userEastModel.updateOne(
        { _id: sellerID },
        {
          balance: seller.balance + product.price,
          earnings: seller.earnings + product.price,
        }
      );
    } else if (location === "West") {
      await userWestModel.updateOne(
        { _id: buyerID },
        {
          balance: buyer.balance - product.price,
          $push: { purchased: product },
        }
      );

      await userWestModel.updateOne(
        { _id: sellerID },
        {
          balance: seller.balance + product.price,
          earnings: seller.earnings + product.price,
        }
      );
    } else return res.json({ status: 400, message: "INCORRECT LOCATION" });

    let transaction = new transactionModel({
      buyer: { _id: buyer._id, username: buyer.username, email: buyer.email },
      seller: {
        _id: seller._id,
        username: seller.username,
        email: seller.email,
      },
      amount: product.price,
      productID: product._id,
      date: new Date(),
    });

    await transaction.save();

    res.json({
      status: 200,
      message: "PRODUCT SUCCESSFULLY PURCHASED",
      transactionID: transaction._id,
    });
  } catch (err) {
    res.json({ status: 400, message: "COULDN'T PURCHASE PRODUCT" });
  }
});

router.get("/transactions", validateUser, async (req, res) => {
  try {
    let result = await transactionModel.find({}).limit(5);

    res.json({ result });
  } catch (err) {
    res.json({ status: 400, message: "COULDN'T FIND PRODUCT" });
  }
});

const productSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required(),
  description: Joi.string(),
});

const validateProduct = async (data) => {
  let error = null;

  await productSchema
    .validateAsync({
      name: data.name,
      price: data.price,
      description: data.description,
    })
    .then(() => {})
    .catch((err) => (error = err));

  return error;
};

module.exports = router;
