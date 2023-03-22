const { config } = require("dotenv");
const isRunningLocally = require("../check-local-server");
const Token = require("../../models/token");
const { google } = require("googleapis");

config();

const isLocal = isRunningLocally(process.env.PORT);
let isExpired = false;

// Create a new OAuth2 client
const OAuth2Google = google.auth.OAuth2;
const oauth2Client = new OAuth2Google(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  `${
    isLocal
      ? "http://localhost:8080"
      : "https://task-tracker-mobile-api.vercel.app"
  }/api${process.env.REDIRECT_URI}`
);

// Retrieve the access token from the database
async function getAccessToken() {
  const token = await Token.findOne().sort({ updated_at: -1 });
  const refreshToken = process.env.REFRESH_TOKEN;

  if (!token) {
    console.log(`[Token   ] No Token Found`);
    await refreshAccessToken(refreshToken);
    return oauth2Client.credentials.access_token;
  }

  // Check if the token has expired
  const now = Date.now();

  if (token.expires_in < now) {
    console.log(`[Token   ] Token Expired`);
    isExpired = true;
    await refreshAccessToken(refreshToken);
    return oauth2Client.credentials.access_token;
  }

  // Return the access token
  console.log(`[Token   ] Token Found`);
  return oauth2Client.credentials.access_token;
}

// Refresh the access token and save it to the database
async function refreshAccessToken(refreshToken) {
  // If a refresh token is provided, set the OAuth2 client to use it
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  // Request a new access token
  const oauthResponse = await oauth2Client.getAccessToken();

  //Convert date
  const expiryDateInMillis = oauthResponse.res.data.expiry_date;
  const date = new Date(expiryDateInMillis);
  const isoString = date.toISOString();
  const formattedDate = isoString.replace("Z", "+00:00");
  let token;
  // Save the new token to the database
  if (isExpired == false) {
    token = new Token({
      access_token: oauthResponse.res.data.access_token,
      expires_in: formattedDate,
      updated_at: new Date(),
    });
    await token.save();
  } else {
    const tokenData = await Token.findOne().sort({ updated_at: -1 });
    tokenData.access_token = oauthResponse.res.data.access_token,
    tokenData.expires_in = formattedDate,
    tokenData.updated_at = new Date();
    await tokenData.save();
  }

  // Update the OAuth2 client with the new access token
  oauth2Client.setCredentials({
    access_token: oauthResponse.res.data.access_token,
    refresh_token: oauthResponse.res.data.refresh_token,
  });
  console.log(`[Token   ] Token successfully set`);
}

module.exports = { getAccessToken };
