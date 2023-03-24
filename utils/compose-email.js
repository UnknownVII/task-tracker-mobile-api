const nodemailer = require("nodemailer");
const handlebars = require("nodemailer-express-handlebars");
const path = require("path");
const {
  getAccessToken,
} = require("../utils/token-authentication/oauth-access-token");

module.exports = async function sendMail(mailOptions) {
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

  smtpTransport.use(
    "compile",
    handlebars({
      viewEngine: { defaultLayout: false },
      viewPath: path.join(process.cwd(), "emails"),
      extName: ".handlebars",
    })
  );

  try {
    accessToken = await getAccessToken();
    console.log(`[OAUTH2.0] Access token retrieved`);
    const response = await smtpTransport.sendMail(mailOptions);
    console.log("[MAILER  ] Emailed to ", response.accepted);
    smtpTransport.close();
    return true;
  } catch (err) {
    console.log(`[MAILER  ] ${err}`);
    smtpTransport.close();
    return false;
  }
  
};
