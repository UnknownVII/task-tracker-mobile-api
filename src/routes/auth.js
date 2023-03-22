const router = require("express").Router();

const { config } = require("dotenv");
const User = require("../../models/user_model");
const verifyEmailwithHtml = require("../../utils/rendered/verify-token-email-with-html");

config();

router.get(process.env.REDIRECT_URI, (req, res) => {
  return res.status(200).json({ message: `${req.query.code}` });
  //CREATAE A METHOD TO GETTOKENS and STORE IT to the user's db
});

router.get("/verify/:token", verifyEmailwithHtml, async (req, res) => {
  const tokenValue = req.params.token.replace(/\*/g, ".");

  User.findOne(
    { "tokens.token": tokenValue, "tokens.type": "emailVerification" },
    (err, user) => {
      if (err) {
        res.render("main", {
          pageTitle: "Error",
          appTitle: "Task Tracker",
          cardTitle: "Email Verification",
          cardContent: "Error finding user",
          contentState: "error",
        });
      } else if (!user) {
        res.render("main", {
          pageTitle: "Error",
          appTitle: "Task Tracker",
          cardTitle: "Email Verification",
          cardContent: "User not found",
          contentState: "error",
        });
      } else {
        const tokenIndex = user.tokens.findIndex((t) => t.token === tokenValue);
        const tokenObj = user.tokens[tokenIndex];

        if (!tokenObj) {
          res.render("main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Token not found",
            contentState: "error",
          });
        } else if (tokenObj.used) {
          res.render("main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Email is already verified",
            contentState: "error",
          });
        } else if (tokenObj.expiresAt < new Date()) {
          res.render("main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Token expired",
            contentState: "error",
          });
        } else {
          user.emailVerified = true;
          user.tokens[tokenIndex].used = true;
          user.tokens[tokenIndex].usedFor = "emailVerification";
          user.save((err) => {
            if (err) {
              res.render("main", {
                pageTitle: "Error",
                appTitle: "Task Tracker",
                cardTitle: "Email Verification",
                cardContent: "Error updating user",
                contentState: "error",
              });
            } else {
              res.render("main", {
                pageTitle: "Success",
                appTitle: "Task Tracker",
                cardTitle: "Email Verification",
                cardContent: "Your email has been successfully verified.",
                contentState: "success",
              });
            }
          });
        }
      }
    }
  );
});

module.exports = router;
