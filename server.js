const express = require("express");
const app = express();
const { config } = require("dotenv");
var cors = require("cors");
const verify = require("./utils/verify-token");
const { engine } = require("express-handlebars");


app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", "./emails");

app.use("/images", express.static(__dirname + "/emails/images"));
app.use('/favicon.ico', express.static(__dirname + '/emails/images/favicon.ico'));

config();

//API CACHE
// const apicache = require('apicache');
// let cache = apicache.middleware;
// app.use(cache('5 minutes'));

const port = process.env.PORT || 8080;

//Import Routes
const authRoute = require("./src/routes/auth");
const tasksRoute = require("./src/routes/tasks");
const usersRoute = require("./src/routes/users");

app.listen(port, () => {
  console.log("[Port    ] Server is running [", port, "]");
});

//Connect to DB
require("./utils/config/db.config")();

//Middlewares
app.use(cors());

//content-type - application/json
app.use(express.json());

//ontent-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// simple route
app.get("/", verify, (req, res) => {
  res.json({ message: "HELLO WORLDOOO" });
});

//Route Middleware
app.use("/api", authRoute);
app.use("/task", tasksRoute);
app.use("/user", usersRoute);

//OAuth2.0
const { google } = require("googleapis");
const OAuth2Google = google.auth.OAuth2;

const oauth2Client = new OAuth2Google(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  `http://localhost:8080/api${process.env.REDIRECT_URL}`
);

oauth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});
