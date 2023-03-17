const RateLimiter = require("../../models/rate_limit");
const { config } = require("dotenv");

const { getAccessToken } = require("../../utils/oauth-access-token");
let accessToken;

config();

const nodemailer = require("nodemailer");
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

module.exports = async function deleteOldDocuments() {
  accessToken = getAccessToken();
  const date = new Date();
  const options = { month: "long", day: "numeric", year: "numeric" };
  const formattedDate = date.toLocaleDateString("en-US", options);
  let statusReport;

  try {
    const now = new Date();
    const count = await RateLimiter.countDocuments();
    if (count > 0) {
      RateLimiter.deleteMany(
        { firstRequest: { $lte: new Date(now - 60000) } },
        (err) => {
          if (err) {
            console.error(`[CRON-JOB] ${err}`);
            statusReport = `[CRON-JOB] ${err}`;
          } else {
            console.log("[CRON-JOB] Expired rate limiters removed");
            statusReport = `[CRON-JOB] Expired rate limiters removed`;
          }
        }
      );
    } else {
      console.log("[CRON-JOB] No rate limiters found");
      statusReport = `[CRON-JOB] No rate limiters found`;
    }
  } catch (err) {
    console.error(`[CRON-JOB] ${err}`);
    statusReport = `[CRON-JOB] ${err}`;
  }

  // Send email verification email
  const mailOptions = {
    from: process.env.NODE_MAILER_EMAIL,
    to: process.env.ADMIN_EMAIL_LOG,
    subject: `LOG UPDATE: ${formattedDate}`,
    text: `LOG: ${statusReport}`,
  };

  try {
    smtpTransport.sendMail(mailOptions, async (error, response) => {
      if (error) {
        console.log(`${error}`);
      } else {
        console.log(`[MAILER  ] Emailed to ${response.accepted}`);
      }
      smtpTransport.close();
    });
  } catch (err) {
    console.error(`[MAILER  ] ${err}`);
  }
};
