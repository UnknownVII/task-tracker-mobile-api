const express = require("express");
const { config } = require("dotenv");
const { engine } = require("express-handlebars");
const cors = require("cors");
const logEndpoints = require("./utils/print-endpoints");
const isRunningLocally = require("./utils/check-local-server");
const {
  getAccessToken,
} = require("./utils/token-authentication/oauth-access-token");
const schedule = require("node-schedule");
const authRoute = require("./src/routes/auth");
const tasksRoute = require("./src/routes/tasks");
const usersRoute = require("./src/routes/users");
const validateApiKey = require("./utils/global-authentication/validate-api-key");
const validateHmac = require("./utils/global-authentication/validate-hmac");
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

async function isRunningAt() {
  const isLocal = await isRunningLocally(port);
  console.log(
    `[\x1b[35mSERVER\x1b[0m  ] ${
      isLocal
        ? "Server is running locally: \x1b[32m\x1b[4mhttp://localhost:8080\x1b[0m"
        : "Server is running at your cloud service"
    }`
  );
}

app.listen(port, async () => {
  console.log(
    `[\x1b[35mPORT\x1b[0m    ] Server is Listening to [ \x1b[33m${port}\x1b[0m ]`
  );
  logEndpoints(app);
  isRunningAt();
  try {
    await getAccessToken();
    console.log(`[OAUTH2.0] Access token Retrieved`);
  } catch (err) {
    console.log(`[OAUTH2.0] ${err}`);
  }
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// BASE route
app.get("/", (req, res) => {
  res.json({ message: "HELLO WORLDOOO" });
});

// Route Middlewares
app.use("/api", rateLimiter);
app.use("/task", validateApiKey, validateHmac, rateLimiter);
app.use("/user", validateApiKey, validateHmac, rateLimiter);

app.use("/api", authRoute);
app.use("/task", tasksRoute);
app.use("/user", usersRoute);
