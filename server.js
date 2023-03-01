const express = require('express');
const app = express();
const dotenv = require('dotenv');
var cors = require('cors')
const verify = require('./app/verify-token');

//API CACHE
// const apicache = require('apicache');
// let cache = apicache.middleware;
// app.use(cache('5 minutes'));

const port = process.env.PORT || 8080;

//Import Routes
const tasksRoute = require('./src/routes/tasks');
const usersRoute = require('./src/routes/users');


dotenv.config();

app.listen(port, () => {
    console.log('[Port    ] Server is running [', port, ']');
});

//Connect to DB
require('./app/config/db.config')();

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
app.use('/task', tasksRoute);
app.use('/user', usersRoute);