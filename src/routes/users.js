const bcrypt = require("bcryptjs");
const config = require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const handlebars = require("nodemailer-express-handlebars");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const nodemailer = require("nodemailer");
const path = require("path");
const User = require("../../models/user_model");
const { getAccessToken } = require("../../utils/oauth-access-token");
const { registerValidation, loginValidation } = require("../../utils/validate");
const verify = require("../../utils/verify-token");

const router = express.Router();

let accessToken;

const smtpTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.NODE_MAILER_EMAIL,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
    accessToken: accessToken,
  },
});

//REGISTER
router.post("/register", async (req, res) => {
  accessToken = getAccessToken();
  //VALIDATION OF DATA
  const { error } = registerValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  //CHECK IF USER ALREADY EXIST
  const nameExist = await User.findOne({
    name: req.body.name,
  });

  if (nameExist)
    return res.status(400).json({ error: "Username Already Taken" });
  const emailExist = await User.findOne({
    email: req.body.email,
  });

  if (emailExist)
    return res.status(400).json({ error: "Email Already Exists" });

  //HASH PASSWORDS
  const saltRounds = 10;
  const salt = bcrypt.genSaltSync(saltRounds, "aA1!");
  const hashPassword = await bcrypt.hash(req.body.password, salt);

  //CREATE NEW USER
  const user = new User({
    name: req.body.name,
    email: req.body.email,
    password: hashPassword,
    verificationEmailSentDate: null,
  });

  try {
    const savedUser = await user.save();
    res.status(200).json({ message: "Account Created Successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/send-email-verification/:id", async (req, res) => {
  const isHttps = req.headers["x-forwarded-proto"] === "https";
  const secret = process.env.API_SECRET;
  const timestamps = Date.now();
  const data = `${timestamps}/${isHttps ? "https" : req.protocol}://${req.get(
    "host"
  )}${req.originalUrl}`;
  const hmac = crypto.createHmac("sha256", secret).update(data).digest("hex");
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).send("User not found");
    }

    const emailVerificationToken = user.tokens.find(
      (token) => token.type === "emailVerification"
    );

    if (emailVerificationToken) {
      if (emailVerificationToken.used) {
        return res.status(400).send("Email already verified");
      }
      if (emailVerificationToken.expiresAt > Date.now()) {
        return res.status(400).send("Check your email");
      }
    }

    const emailToken = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
      expiresIn: "5m",
    });
    const convertedHash = emailToken.toString().replace(/\./g, "*");

    const expiresAt = Date.now() + 300000; // Expires in 5 minutes
    const tokenIndex = user.tokens.findIndex(
      (t) => t.type === "emailVerification"
    );

    if (tokenIndex !== -1) {
      // Token already exists, update it
      user.tokens[tokenIndex].token = emailToken;
      user.tokens[tokenIndex].expiresAt = expiresAt;
    } else {
      // Token does not exist, add it
      user.tokens.push({
        type: "emailVerification",
        token: emailToken,
        expiresAt: expiresAt,
      });
    }

    user.verificationEmailSentDate = new Date(); // update verificationEmailSentDate

    // Send email verification email
    const mailOptions = {
      from: process.env.NODE_MAILER_EMAIL,
      to: user.email,
      subject: "Verify Your Email Address for Task Tracker Application",
      template: "main",
      attachments: [
        {
          filename: "app-ico-image.png",
          path: "./emails/images/app-ico-image.png",
          cid: "imageURL",
        },
      ],
      context: {
        name: user.name,
        hash: convertedHash,
        hmac: hmac,
        apiKey: process.env.API_KEY,
        timestamp: timestamps,
      },
    };
    smtpTransport.use(
      "compile",
      handlebars({
        viewEngine: { defaultLayout: false },
        viewPath: path.join(process.cwd(), "emails"),
        extName: ".handlebars",
      })
    );
    smtpTransport.sendMail(mailOptions, async (error, response) => {
      if (error) {
        console.log(`[MAILER  ] ${error}`);
        return res
          .status(400)
          .json({ error: "Failed to send verification email" });
      } else {
        console.log("[MAILER  ] Emailed to ", response.accepted);
        await user.save();
        res.status(200).json({ message: "Verification email sent" });
      }
      smtpTransport.close();
    });
  } catch (err) {
    console.error(`[MAILER  ] ${err}`);
    res.status(500).send("Internal server error");
  }
});

//LOGIN USER WITH UNIQUE TOKEN
router.post("/login", async (req, res) => {
  //VALIDATION OF DATA
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  //CHECK IF EMAIL EXISTS
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).json({ error: "Email does not exist!" });

  //CHECK IF PASSWORD IS CORRECT
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass)
    return res.status(400).json({ error: "Email/Password is wrong!" });

  //CREATE AND ASSIGN TOKENS
  const accessToken = jwt.sign({ _id: user._id }, process.env.TOKEN_SECRET, {
    expiresIn: "7d",
  });
  const userAccessToken = user.tokens.find(
    (token) => token.type === "userAccessToken"
  );

  if (!userAccessToken) {
    // create a new token if one doesn't exist
    user.tokens.push({
      type: "userAccessToken",
      token: accessToken,
      expiresAt: moment().add(7, "days").toDate(),
    });
  } else {
    // update the existing token if it exists
    userAccessToken.token = accessToken;
    userAccessToken.used = false;
    userAccessToken.expiresAt = moment().add(7, "days").toDate(); // update the expiration time
  }

  await user.save((err) => {
    if (err) {
      res.status(500).send({ error: "Internal server error" });
    } else {
      res.status(200).json({
        "auth-token": accessToken,
        message: "Logged in successfully",
        name: user.name,
        _id: user._id,
      });
    }
  });
});

//GET USER:ID PROFILE
router.get("/get/:id", verify, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("tasks");

    if (!user) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const { name, email, date } = user;
    const taskCount = user.tasks.length;

    return res.status(200).json({
      user_data: {
        name,
        email,
        date,
        taskCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

//CHECK USER:ID ACCESSTOKEN
router.get("/:userId/check-token", async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId).exec();
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    const userAccessToken = user.tokens.find(
      (token) => token.type === "userAccessToken"
    );
    if (!userAccessToken) {
      return res.send({ message: "User access token not found", valid: false });
    }
    try {
      const decoded = jwt.verify(
        userAccessToken.token,
        process.env.TOKEN_SECRET
      );
      if (decoded._id !== userId) {
        return res.send({
          message: "User access token is invalid",
          valid: false,
        });
      }
      if (new Date(decoded.exp * 1000) < new Date()) {
        userAccessToken.used = true;
        user.save((err) => {
          if (err) {
            return res.status(500).send({ error: "Internal server error" });
          } else {
            return res.send({
              message: "User access token has expired",
              valid: false,
            });
          }
        });
      }
      res.send({ message: "User access token is still valid", valid: true });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        userAccessToken.used = true;
        user.save((err) => {
          if (err) {
            return res.status(500).send({ error: "Internal server error" });
          } else {
            return res.status(401).json({ error: "Access token has expired" });
          }
        });
      } else {
        return res.send({
          error: err.message,
          valid: false,
        });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Internal server error" });
  }
});

module.exports = router;
