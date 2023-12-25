var express = require("express");
var ejs = require("ejs");
const mysql = require("mysql");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const expressSanitizer = require("express-sanitizer");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const port = process.env.PORT || 8000;

var session = require("express-session");
app.use(
  session({
    secret: "saddesecret",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      expires: 600000,
    },
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

app.use(expressSanitizer());

function runSetupScript(callback) {
  const sqlquery = fs.readFileSync(path.join(__dirname, "create_db.sql"), {
    encoding: "utf-8",
  });

  const connection = mysql.createConnection({
    host: "localhost",
    user: "deployment",
    password: "sadde",
    multipleStatements: true,
  });

  connection.connect(function (err) {
    if (err) {
      console.error("Error connecting to MySQL:", err);
      return callback(err);
    }

    connection.query(sqlquery, function (error, results, fields) {
      connection.end();

      if (error) {
        console.error("Error executing SQL script:", error);
        return callback(error);
      } else {
        console.log("SQL script executed successfully.");
        callback(null);
      }
    });
  });
}

function setupDatabase() {
  runSetupScript(function (err) {
    if (err) {
      console.error("Failed to run setup script:", err);
      return;
    }

    console.log("Database setup completed");

    const db = mysql.createConnection({
      host: "localhost",
      user: "forumapp",
      password: "qwerty",
      database: "myforum",
    });

    db.connect(function (err) {
      if (err) {
        console.error("Failed to connect to database:", err);
        return;
      }

      console.log("Connected to database");
      global.db = db;
    });
  });
}

setupDatabase();

// Set the directory where static files (css, js, etc) will be
app.use(express.static(__dirname + "/public"));

// Set the directory where Express will pick up HTML files
// __dirname will get the current directory
app.set("views", __dirname + "/views");

// Tell Express that we want to use EJS as the templating engine
app.set("view engine", "ejs");

// Tells Express how we should process html files
// We want to use EJS's rendering engine
app.engine("html", ejs.renderFile);

// Define our data
var forumData = { forumName: "Sadde's Forums" };

// Requires the main.js file inside the routes folder passing in the Express app and data as arguments.  All the routes will go in this file
require("./routes/main")(app, forumData);

// Start the web app listening
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
