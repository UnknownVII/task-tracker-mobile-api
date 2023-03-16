const router = require("express").Router();

const { config } = require("dotenv");
const User = require("../../models/user_model");
const verifyEmail = require("../../utils/verify-token-email");

config();

router.get(process.env.REDIRECT_URI, (req, res) => {
  return res.status(200).json({ message: "CALLBACK" });
});

router.get("/verify/:token", verifyEmail, async (req, res) => {
  const tokenValue = req.params.token.replace(/\*/g, ".");
  User.findOne(
    { "tokens.token": tokenValue, "tokens.type": "emailVerification" },
    (err, user) => {
      if (err) {
        res.status(400).send("Error finding user");
      } else if (!user) {
        res.status(400).send("User not found");
      } else {
        const tokenIndex = user.tokens.findIndex((t) => t.token === tokenValue);
        const tokenObj = user.tokens[tokenIndex];

        if (!tokenObj) {
          //SHOWS TOKEN DOES NOT EXISTS
          res.status(404).send("Token not found");
        } else if (tokenObj.used) {
          //SHOWS EMAIL ALREADY VERIFIED
          res.status(400).send("Email is already verified");
        } else if (tokenObj.expiresAt < new Date()) {
          res.status(400).send("Token expired");
        } else {
          user.emailVerified = true;
          user.tokens[tokenIndex].used = true;
          user.tokens[tokenIndex].usedFor = "emailVerification";
          user.save((err) => {
            if (err) {
              res.status(400).send("Error updating user");
            } else {
              res.send("Email verified");
            }
          });
        }
      }
    }
  );
});

module.exports = router;
