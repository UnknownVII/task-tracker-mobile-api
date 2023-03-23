const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const express = require("express");
const handlebars = require("nodemailer-express-handlebars");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const nodemailer = require("nodemailer");
const path = require("path");
const User = require("../../models/user_model");
const axios = require("axios");
const generateVerificationCode = require("../../utils/generate-6-digit");
const generateId = require("../../utils/generate-email-id");

const {
  getAccessToken,
} = require("../../utils/token-authentication/oauth-access-token");
const {
  registerValidation,
  loginValidation,
} = require("../../utils/joi-schema-validation/validate");
const verify = require("../../utils/token-authentication/verify-token");
const router = express.Router();
const MAX_LOGIN_ATTEMPTS = 5;
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
const ipaddr = require("ipaddr.js");

//REGISTER
router.post("/register", async (req, res) => {
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
    phoneNumber: req.body.phoneNumber,
    password: hashPassword,
  });

  try {
    const savedUser = await user.save();
    res.status(200).json({ message: "Account Created Successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/send-email-verification/:id", async (req, res) => {
  try {
    accessToken = await getAccessToken();
    console.log(`[OAUTH2.0] Access token Retrieved`);
  } catch (err) {
    console.log(`[OAUTH2.0] ${err}`);
    return res
      .status(400)
      .json({ error: `Cannot retrieve Access token: ${err}` });
  }

  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailVerificationVerified = user.verifications.find(
      (verification) => verification.type === "emailVerification"
    );

    if (emailVerificationVerified) {
      if (emailVerificationVerified.verified) {
        return res.status(400).json({ message: "Email already verified" });
      }
    }

    const emailVerificationToken = user.tokens.find(
      (token) => token.type === "emailVerification"
    );

    if (emailVerificationToken) {
      if (emailVerificationToken.used) {
        return res.status(400).json({ message: "Email already verified" });
      }
      if (emailVerificationToken.expiresAt > Date.now()) {
        return res.status(400).json({ message: "Check your email" });
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
    const verifiedIndex = user.verifications.findIndex(
      (t) => t.type === "emailVerification"
    );

    if (verifiedIndex !== -1) {
      // verified already exists, update it
      user.verifications[verifiedIndex].verificationSentDate = new Date();
    } else {
      // verified does not exist, add it
      user.verifications.push({
        type: "emailVerification",
        verificationSentDate: new Date(),
      });
    }

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

    const verificationURL = `${
      global.isLocal ? process.env.LOCAL_URL : process.env.CLOUD_URL
    }/api/verify/${convertedHash}`;

    // Send email verification email
    const mailOptions = {
      from: `Task Tracker <${process.env.NODE_MAILER_EMAIL}>`,
      to: user.email,
      subject: "Verify your email",
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
        url: verificationURL,
        emailId: generateId(24),
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
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/send-sms-verification/:id", async (req, res) => {
  const verificationCode = generateVerificationCode();
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    try {
      const userNum = await User.findOne({ phone_number: user.phoneNumber });

      if (!userNum) {
        return res.status(404).send("User's phone number not found");
      }

      user.tokens.push({
        type: "smsVerification",
        token: verificationCode,
        expiresAt: moment().add(5, "minutes").toDate(),
      });

      const options = {
        method: "POST",
        url: process.env.RAPID_API_URL,
        params: {
          phoneNumber: user.phoneNumber,
          verifyCode: verificationCode,
          appName: "Task Tracker",
        },
        headers: {
          "X-RapidAPI-Key": process.env.RAPID_API_KEY,
          "X-RapidAPI-Host": process.env.RAPID_API_HOST,
        },
      };
      axios
        .request(options)
        .then(async function (response) {
          console.log(response.data);
          await user.save();
          res.status(200).send("Verification code sent successfully");
        })
        .catch(function (error) {
          console.error(error);
        });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error sending verification code");
    }
  } catch (err) {
    console.error(`[SMS     ] ${err}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

//LOGIN USER WITH API KEY and HMAC
router.post("/login", async (req, res) => {
  //VALIDATION OF DATA
  const { error } = loginValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  //CHECK IF EMAIL EXISTS
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).json({ error: "Email does not exist!" });

  if (user.isLocked) {
    return res.status(400).json({
      message: "Account has some issues please check your email",
    });
  }

  const ipv6 = req.ip.toString();
  let ipv4;

  if (ipv6 === "::1") {
    ipv4 = "0000:0000:0000:0000:0000:0000:0000:0001";
  } else {
    ipv4 = ipaddr.process(ipv6).toString();
  }

  const index = user.lastLoginIPGeoLocations.findIndex(
    (obj) => obj.ip === ipv4
  );

  //CHECK IF PASSWORD IS CORRECT
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.isLocked = true;
    }
    await user.save();
    if (user.loginAttempts == MAX_LOGIN_ATTEMPTS) {
      
      try {
        accessToken = await getAccessToken();
        console.log(`[OAUTH2.0] Access token Retrieved`);
      } catch (err) {
        console.log(`[OAUTH2.0] ${err}`);
        return res
          .status(400)
          .json({ error: `Cannot retrieve Access token: ${err}` });
      }

      axios
        .get(
          `https://api.ip2location.io/?key=${process.env.IP2_API_KEY}&ip=${ipv4}`
        )
        .then(async (response) => {
          const mailOptions = {
            from: `Task Tracker <${process.env.NODE_MAILER_EMAIL}>`,
            to: user.email,
            subject: "Account Lockout Notification",
            template: "account",
            attachments: [
              {
                filename: "app-ico-image.png",
                path: "./emails/images/app-ico-image.png",
                cid: "imageURL",
              },
            ],
            context: {
              name: user.name,
              countryName: response.data.country_name,
              cityName: response.data.city_name,
              ip: response.data.ip,
              isProxy: response.data.is_proxy,
              zipCode: response.data.zip_code,
              emailId: generateId(24),
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
            } else {
              console.log("[MAILER  ] Emailed to ", response.accepted);
            }
            smtpTransport.close();
          });
        })
        .catch((error) => {
          console.error(error);
        });
      return res.status(400).json({
        error:
          "Account locked due to many failed login attempts. Check email to resolve issue",
      });
    } else {
      return res.status(400).json({ error: "Email/Password is wrong!" });
    }
  } else {
    user.loginAttempts = 0;
    user.lastLogin = Date.now();
    axios
      .get(
        `https://api.ip2location.io/?key=${process.env.IP2_API_KEY}&ip=${ipv4}`
      )
      .then(async (response) => {
        if (index !== -1) {
          user.lastLoginIPGeoLocations[index].date = new Date();
        } else {
          user.lastLoginIPGeoLocations.push({
            cityName: response.data.city_name,
            countryCode: response.data.country_code,
            countryName: response.data.country_name,
            ip: response.data.ip,
            isProxy: response.data.is_proxy,
            latitude: response.data.latitude,
            longitude: response.data.longitude,
            zipCode: response.data.zip_code,
          });
        }
      })
      .catch((error) => {
        console.error(error);
      });
    await user.save();
  }

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

  user.save((err) => {
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
      return res.status(404).json({ message: "User not found" });
    }
    const userAccessToken = user.tokens.find(
      (token) => token.type === "userAccessToken"
    );
    if (!userAccessToken) {
      return res.json({ message: "User access token not found", valid: false });
    }
    try {
      const decoded = jwt.verify(
        userAccessToken.token,
        process.env.TOKEN_SECRET
      );
      if (decoded._id !== userId) {
        return res.json({
          message: "User access token is invalid",
          valid: false,
        });
      }
      if (new Date(decoded.exp * 1000) < new Date()) {
        userAccessToken.used = true;
        user.save((err) => {
          if (err) {
            return res.status(500).json({ error: "Internal server error" });
          } else {
            return res.json({
              message: "User access token has expired",
              valid: false,
            });
          }
        });
      }
      res.json({ message: "User access token is still valid", valid: true });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        userAccessToken.used = true;
        user.save((err) => {
          if (err) {
            return res.status(500).json({ error: "Internal server error" });
          } else {
            return res.status(401).json({ error: "Access token has expired" });
          }
        });
      } else {
        return res.json({
          error: err.message,
          valid: false,
        });
      }
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
