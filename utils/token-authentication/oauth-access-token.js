const { google } = require("googleapis");
const OAuth2Google = google.auth.OAuth2;
const Token = require("../../models/token");
const { config } = require("dotenv");

config();

// Create a new OAuth2 client
const oauth2Client = new OAuth2Google(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  `http://localhost:8080/api${process.env.REDIRECT_URL}`
);

// Retrieve the access token from the database
async function getAccessToken() {
  // Get the most recent token document
  const token = await Token.findOne().sort({ updated_at: -1 });

  if (!token) {
    console.log(`[Token   ] No Token Found`);
    await refreshAccessToken(process.env.REFRESH_TOKEN);
    return oauth2Client.credentials.access_token;
  }

  // Check if the token has expired
  const now = Date.now();
  if (token.updated_at.getTime() + token.expires_in * 3600 < now) {
    console.log(`[Token   ] Token Expired`);
    await refreshAccessToken(token.refresh_token);
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

  // Save the new token to the database
  const token = new Token({
    access_token: oauthResponse.res.data.access_token,
    refresh_token: oauthResponse.res.data.refresh_token,
    expiry_date: oauthResponse.res.data.expiry_date,
    updated_at: new Date(),
  });

  await token.save();

  // Update the OAuth2 client with the new access token
  oauth2Client.setCredentials({
    access_token: oauthResponse.res.data.access_token,
    refresh_token: oauthResponse.res.data.refresh_token,
  });
  console.log(`[Token   ] Token successfully set`);
}

module.exports = { getAccessToken };
