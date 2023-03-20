const RateLimiter = require("../../models/rate_limit");
const { config } = require("dotenv");
const nodemailer = require("nodemailer");

config();

const smtpTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.NODE_MAILER_EMAIL,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

module.exports = async function deleteOldDocuments() {
  const now = new Date();
  const count = await RateLimiter.countDocuments();
  let statusReport;

  try {
    if (count > 0) {
      await RateLimiter.deleteMany(
        { firstRequest: { $lte: new Date(now - 60000) } }
      );
      console.log("[CRON-JOB] Expired rate limiters removed");
      statusReport = `[CRON-JOB] Expired rate limiters removed at ${now.toLocaleString()}`;
    } else {
      console.log("[CRON-JOB] No rate limiters found");
      statusReport = `[CRON-JOB] No rate limiters found at ${now.toLocaleString()}`;
    }
  } catch (err) {
    console.error(`[CRON-JOB] ${err}`);
    statusReport = `[CRON-JOB] ${err} at ${now.toLocaleString()}`;
  }

  // Send email verification email
  const date = new Date();
  const options = { month: "long", day: "numeric", year: "numeric" };
  const formattedDate = date.toLocaleDateString("en-US", options);
  const time = now.toLocaleTimeString();
  const mailOptions = {
    from: process.env.NODE_MAILER_EMAIL,
    to: process.env.ADMIN_EMAIL_LOG,
    subject: `LOG UPDATE: ${formattedDate} ${time}`,
    text: `LOG: ${statusReport}`,
  };

  try {
    await smtpTransport.sendMail(mailOptions);
    console.log(`[MAILER  ] Emailed to ${mailOptions.to}`);
  } catch (err) {
    console.error(`[MAILER  ] ${err}`);
  } finally {
    smtpTransport.close();
  }
};
