const router = require("express").Router();

const { config } = require("dotenv");
const User = require("../../models/user_model");
const verifyEmail = require("../../utils/verify-token-email");

config();

router.get(process.env.REDIRECT_URI, (req, res) => {
  return res.status(200).json({ message: "CALLBACK" });
});

router.get("/verify/:token", async (req, res) => {
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
          buttonText: "Back",
          backButtonLink: "/",
        });
      } else if (!user) {
        res.render("main", {
          pageTitle: "Error",
          appTitle: "Task Tracker",
          cardTitle: "Email Verification",
          cardContent: "User not found",
          buttonText: "Back",
          backButtonLink: "/",
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
            buttonText: "Back",
            backButtonLink: "/",
          });
        } else if (tokenObj.used) {
          res.render("main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Email is already verified",
            buttonText: "Back",
            backButtonLink: "/",
          });
        } else if (tokenObj.expiresAt < new Date()) {
          res.render("main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Token expired",
            buttonText: "Resend verification email",
            backButtonLink: "/resend",
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
                buttonText: "Back",
                backButtonLink: "/",
              });
            } else {
              res.render("success", {
                pageTitle: "Success",
                appTitle: "Task Tracker",
                cardTitle: "Email Verification",
                cardContent: "Your email has been successfully verified.",
                buttonText: "Continue",
                backButtonLink: "/",
              });
            }
          });
        }
      }
    }
  );
});

module.exports = router;
