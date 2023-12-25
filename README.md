# DtbAndWeb

Ensure you have the following installed:

Node.js
MySQL

Clone the Repository

git clone https://github.com/saddeaden1/DtbAndWeb.git
cd DtbAndWeb

Install Dependencies

npm install

Database Setup

Run the following script on your mysql server:

CREATE USER 'deployment'@'localhost' IDENTIFIED WITH mysql_native_password BY 'sadde';
GRANT ALL PRIVILEGES ON *.* TO 'deployment'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;

This will add the deployment user to your Database to allow the appllication to create the databases

Running the Application:

node index.js

Usage:

Navigate to http://localhost:8000 in your chosen web browser.
Register for a new account and login.
Start exploring the features like adding reviews, viewing reviews, and searching for books.