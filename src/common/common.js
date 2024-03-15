const jwt = require("jsonwebtoken");
const env = require("../environments/environment");

exports.generateJwtToken = (payload, expiresIn) => {
  try {
    return jwt.sign(payload, env.JWT_SECRET_KEY, { expiresIn });
  } catch (error) {
    return error;
  }
};