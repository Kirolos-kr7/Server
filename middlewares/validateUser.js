const JWT = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    const token = req.header("auth-token");
    if (!token) return res.status(401).send("ACCESS DENIED");

    let isValid = JWT.verify(token, process.env.SECRET_TOKEN);
    if (!isValid) return res.status(401).send("INVALID TOKEN");

    let dcu = JWT.decode(token, process.env.SECRET_TOKEN);
    res.locals.id = dcu.user._id;
    res.locals.location = dcu.user.location;
  } catch (err) {
    return res.status(401).send("AUTH ERROR");
  }
  next();
};
