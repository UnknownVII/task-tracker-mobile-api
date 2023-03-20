const express = require("express");
const { config } = require("dotenv");
const { engine } = require("express-handlebars");
const cors = require("cors");
const schedule = require("node-schedule");

const authRoute = require("./src/routes/auth");
const tasksRoute = require("./src/routes/tasks");
const usersRoute = require("./src/routes/users");
const validateApiKey = require("./utils/validate-api-key");
const validateHmac = require("./utils/validate-hmac");
const { rateLimiter } = require("./utils/rate-limiter");
const deleteOldDocuments = require("./utils/cron-jobs/ip-cleanup");

const app = express();
const port = process.env.PORT || 8080;

// Config image handlebars assets
app.engine(
  "handlebars",
  engine({
    layoutsDir: __dirname + "/emails/layouts",
  })
);
app.set("view engine", "handlebars");
app.set("views", "./emails");
app.use("/images", express.static(__dirname + "/emails/images"));
app.use(
  "/favicon.ico",
  express.static(__dirname + "/emails/images/favicon.ico")
);

config();

// Check Unused IP's
const job = schedule.scheduleJob("0 0 * * *", function () {
  deleteOldDocuments();
});

// API Cache
// const apicache = require('apicache');
// let cache = apicache.middleware;
// app.use(cache('5 minutes'));

// Connect to DB
require("./utils/config/db.config")();

app.listen(port, () => {
  console.log(`[Port    ] Server is running [ ${port} ]`);
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BASE route
app.get("/", (req, res) => {
  res.json({ message: "HELLO WORLDOOO" });
});

// Route Middleware
app.use("/api", rateLimiter);
app.use("/task", validateApiKey, validateHmac, rateLimiter);
app.use("/user", validateApiKey, validateHmac, rateLimiter);

app.use("/api", authRoute);
app.use("/task", tasksRoute);
app.use("/user", usersRoute);

// OAuth2.0
const { google } = require("googleapis");
const OAuth2Google = google.auth.OAuth2;

const oauth2Client = new OAuth2Google(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  `https://task-tracker-mobile-api.vercel.app/api${process.env.REDIRECT_URL}`
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});
