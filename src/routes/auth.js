const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { config } = require("dotenv");
const generateId = require("../../utils/generate-email-id");
const generate6DigitCode = require("../../utils/generate-6-digit");
const User = require("../../models/user_model");
const {
  emailValidation,
} = require("../../utils/joi-schema-validation/validate");
const verifyTokenRendered = require("../../utils/rendered/verify-token-email-with-html");
const sendMail = require("../../utils/compose-email");
const crypto = require("crypto");
const moment = require("moment");
config();

router.get(process.env.REDIRECT_URI, (req, res) => {
  return res.status(200).json({ message: `${req.query.code}` });
  //CREATAE A METHOD TO GETTOKENS and STORE IT to the user's db
});

//VERIFY EMAIL FLOW
router.get("/verify/:token", verifyTokenRendered, async (req, res) => {
  const tokenValue = req.params.token.replace(/\*/g, ".");

  User.findOne(
    { "tokens.token": tokenValue, "tokens.type": "emailVerification" },
    (err, user) => {
      if (err) {
        res.render("layouts/main", {
          pageTitle: "Error",
          appTitle: "Task Tracker",
          cardTitle: "Email Verification",
          cardContent: "Error finding user",
          contentState: "error",
        });
      } else if (!user) {
        res.render("layouts/main", {
          pageTitle: "Error",
          appTitle: "Task Tracker",
          cardTitle: "Email Verification",
          cardContent: "User not found",
          contentState: "error",
        });
      } else {
        const tokenIndex = user.tokens.findIndex((t) => t.token === tokenValue);
        const verificationIndex = user.verifications.findIndex(
          (t) => t.type === "emailVerification"
        );

        const tokenObj = user.tokens[tokenIndex];

        if (!tokenObj) {
          res.render("layouts/main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Token not found",
            contentState: "error",
          });
        } else if (tokenObj.token !== tokenValue) {
          res.render("layouts/main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Invalid use of token",
            contentState: "error",
          });
        } else if (tokenObj.used) {
          res.render("layouts/main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Email is already verified",
            contentState: "error",
          });
        } else if (tokenObj.expiresAt < new Date()) {
          res.render("layouts/main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Email Verification",
            cardContent: "Token expired",
            contentState: "error",
          });
        } else {
          user.verifications[verificationIndex].verified = true;
          user.verifications[verificationIndex].verifiedDate = new Date();
          user.tokens[tokenIndex].used = true;
          user.tokens[tokenIndex].usedDate = new Date();

          user.save((err) => {
            if (err) {
              res.render("layouts/main", {
                pageTitle: "Error",
                appTitle: "Task Tracker",
                cardTitle: "Email Verification",
                cardContent: "Error updating user",
                contentState: "error",
              });
            } else {
              res.render("layouts/main", {
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

//CHANGE PASSWORD FLOW
//1st step enter email rendered
router.get("/login/identify", (req, res) => {
  const verificationURL = `${
    global.isLocal ? process.env.LOCAL_URL : process.env.CLOUD_URL
  }/api/send-email-password-change`;

  return res.render("layouts/sendEmailChangePass", {
    layout: false,
    urlLink: verificationURL,
  });
});

//2nd step send email
router.post("/send-email-password-change", async (req, res) => {
  //VALIDATION OF DATA
  const { error } = emailValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  //CHECK IF EMAIL EXISTS
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).json({ error: "Email does not exist!" });

  try {
    // CHECK IF PASSWORD RESET TOKEN EXISTS AND HAS NOT BEEN USED
    const passwordResetToken = user.tokens.find(
      (token) => token.type === "passwordResetToken"
    );

    const passwordResetDigit = user.tokens.find(
      (token) => token.type === "passwordResetDigit"
    );

    if (
      (passwordResetToken &&
        passwordResetToken.expiresAt > Date.now() &&
        !passwordResetToken.used) ||
      (passwordResetDigit &&
        passwordResetDigit.expiresAt > Date.now() &&
        !passwordResetDigit.used)
    ) {
      return res
        .status(400)
        .json({ error: "Email already sent. Check your email." });
    }

    // Remove existing password reset tokens
    user.tokens = user.tokens.filter(
      (token) =>
        token.type !== "passwordResetToken" &&
        token.type !== "passwordResetDigit"
    );
    await User.updateOne(
      { _id: user._id },
      {
        $pull: {
          tokens: {
            type: { $in: ["passwordResetToken", "passwordResetDigit"] },
          },
        },
      }
    );

    const expiresAt = Date.now() + 10 * 60 * 1000;
    const passResetToken = jwt.sign(
      { _id: user._id },
      process.env.TOKEN_SECRET,
      {
        expiresIn: "10m",
      }
    );

    const tokenIndex = user.tokens.findIndex(
      (t) => t.type === "passwordResetToken"
    );

    if (tokenIndex !== -1) {
      // Token already exists, update it
      user.tokens[tokenIndex].token = passResetToken;
      user.tokens[tokenIndex].used = false;
      user.tokens[tokenIndex].expiresAt = expiresAt;
    } else {
      // Token does not exist, add it
      user.tokens.push({
        type: "passwordResetToken",
        token: passResetToken,
        expiresAt: expiresAt,
      });
    }

    const digitIndex = user.tokens.findIndex(
      (t) => t.type === "passwordResetDigit"
    );
    const newCode = generate6DigitCode();
    if (digitIndex !== -1) {
      // Token already exists, update it
      user.tokens[digitIndex].token = newCode;
      user.tokens[digitIndex].used = false;
      user.tokens[digitIndex].expiresAt = expiresAt;
    } else {
      // Token does not exist, add it
      user.tokens.push({
        type: "passwordResetDigit",
        token: newCode,
        expiresAt: expiresAt,
      });
    }

    const mailOptions = {
      from: `Task Tracker <${process.env.NODE_MAILER_EMAIL}>`,
      to: req.body.email,
      subject: "Password Reset Code",
      template: "changePasswordDigit",
      context: {
        name: user.name,
        digitCode: newCode,
        emailId: generateId(24),
      },
    };
    const emailSent = await sendMail(mailOptions);
    if (!emailSent) {
      return res
        .status(400)
        .json({ error: "Failed to send change password email" });
    }
    await user.save();
    const convertedHash = passResetToken.toString().replace(/\./g, "*");
    const redirectUrl = `${
      global.isLocal ? process.env.LOCAL_URL : process.env.CLOUD_URL
    }/api/password-change/${convertedHash}/enter-code?email=${encodeURIComponent(
      req.body.email
    )}`;
    res.status(200).json({
      redirectUrl: redirectUrl,
    });
  } catch (err) {
    console.error(`[MAILER  ] ${err}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

//3rd step render 6-digit page
router.get(
  "/password-change/:token/enter-code",
  verifyTokenRendered,
  async (req, res) => {
    const encodedEmail = req.query.email;
    const passResetToken = req.params.token;
    const email = decodeURIComponent(encodedEmail);
    const convertedHash = passResetToken.toString().replace(/\./g, "*");
    const tokenValue = req.params.token.replace(/\*/g, ".");
    const urlLink = `${
      global.isLocal ? process.env.LOCAL_URL : process.env.CLOUD_URL
    }/api/verify-code/${convertedHash}/verify?email=${encodedEmail}`;

    try {
      const user = await User.findOne({
        email,
        "tokens.token": tokenValue,
        "tokens.type": "passwordResetToken",
        "tokens.used": false,
      }).exec();

      if (!user) {
        // If the user cannot be found or the token has been used, render the error page
        return res.render("layouts/main", {
          pageTitle: "Error",
          appTitle: "Task Tracker",
          cardTitle: "Invalid Access",
          cardContent: "Access token has expired",
          contentState: "error",
        });
      }

      // Render the enter code page with the decoded email value
      res.render("passwordLayout/6Digit", { layout: false, email, urlLink });
    } catch (err) {
      // Handle any errors that occur during the database query
      console.error(err);
      res.render("layouts/main", {
        pageTitle: "Error",
        appTitle: "Task Tracker",
        cardTitle: "Server Error",
        cardContent: `An error occurred while processing your request. ${err}`,
        contentState: "error",
      });
    }
  }
);

//4th step confirm code
router.post(
  "/verify-code/:token/verify",
  verifyTokenRendered,
  async (req, res) => {
    try {
      const token = req.body.code;
      const encodedEmail = req.query.email;
      const passResetToken = req.params.token;
      const user = await User.findOne({ encodedEmail });

      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      const sixDigitToken = user.tokens.find(
        (t) =>
          t.type === "passwordResetDigit" &&
          t.token === token &&
          !t.used &&
          !moment().isAfter(t.expiresAt)
      );

      if (!sixDigitToken) {
        return res.status(400).json({ error: "Invalid or expired code token" });
      }

      const usedDate = Date.now();

      // Mark the token as used and save the user
      sixDigitToken.used = true;
      sixDigitToken.usedDate = usedDate;
      await user.save();
      const convertedHash = passResetToken.toString().replace(/\./g, "*");
      // Redirect to the change password page
      const verificationURL = `${
        global.isLocal ? process.env.LOCAL_URL : process.env.CLOUD_URL
      }/api/verify/${convertedHash}/change-password`;

      res.status(200).json({
        redirectUrl: verificationURL,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

//5th step render the change password page
router.get(
  "/verify/:token/change-password",
  verifyTokenRendered,
  async (req, res) => {
    const tokenValue = req.params.token.replace(/\*/g, ".");

    User.findOne(
      { "tokens.token": tokenValue, "tokens.type": "passwordResetToken" },
      (err, user) => {
        if (err) {
          res.render("layouts/main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Change Password",
            cardContent: "Error finding user",
            contentState: "error",
          });
        } else if (!user) {
          res.render("layouts/main", {
            pageTitle: "Error",
            appTitle: "Task Tracker",
            cardTitle: "Change Password",
            cardContent: "Invalid: missing token access",
            contentState: "error",
          });
        } else {
          const tokenIndex = user.tokens.findIndex(
            (t) => t.token === tokenValue
          );

          const tokenObj = user.tokens[tokenIndex];

          const verificationURL = `${
            global.isLocal ? process.env.LOCAL_URL : process.env.CLOUD_URL
          }/user/${user._id}/change-password/${req.params.token}`;

          //GENERATE API KEY AND HMAC
          const currentTimestamp = Date.now();
          const data = `${currentTimestamp}/${verificationURL}`;
          const apiKey = process.env.API_KEY;
          const secret = process.env.API_SECRET;

          const hmacSignature = crypto
            .createHmac("sha256", secret)
            .update(data)
            .digest("hex");

          if (!tokenObj) {
            res.render("layouts/main", {
              pageTitle: "Error",
              appTitle: "Task Tracker",
              cardTitle: "Change Password",
              cardContent: "Token not found",
              contentState: "error",
            });
          } else if (tokenObj.token !== tokenValue) {
            res.render("layouts/main", {
              pageTitle: "Error",
              appTitle: "Task Tracker",
              cardTitle: "Change Password",
              cardContent: "Invalid use of token",
              contentState: "error",
            });
          } else if (tokenObj.used) {
            res.render("layouts/main", {
              pageTitle: "Error",
              appTitle: "Task Tracker",
              cardTitle: "Change Password",
              cardContent: "Token is used",
              contentState: "error",
            });
          } else if (tokenObj.expiresAt < new Date()) {
            res.render("layouts/main", {
              pageTitle: "Error",
              appTitle: "Task Tracker",
              cardTitle: "Change Password",
              cardContent: "Token expired",
              contentState: "error",
            });
          } else {
            res.render("passwordLayout/changePasswordResponse", {
              layout: false,
              pageTitle: "Change Password",
              appTitle: "Task Tracker",
              cardTitle: "Create New Password",
              urlLink: verificationURL,
              headerApiKey: apiKey,
              headerHmac: hmacSignature,
              headerTimeStamp: currentTimestamp,
            });
          }
        }
      }
    );
  }
);

module.exports = router;
