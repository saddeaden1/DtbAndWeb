/*
 * Script for creating the forum database
 *
 * WARNING!  Running this script will delete all tables in the myforum database and recreate them.
 *           Any existing data will be lost!
 */

# Make sure the databese is created before you run this script
#     CREATE DATABASE myforum;

# Select the database
USE myforum;

# Create the user which the web app will use to access the database
DROP USER IF EXISTS 'forumapp'@'localhost';
CREATE USER 'forumapp'@'localhost' IDENTIFIED WITH mysql_native_password BY 'qwerty';
GRANT ALL PRIVILEGES ON myforum.* TO 'forumapp'@'localhost';      

# Remove the tables if they already exist
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS membership;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS topics;

# Create the user table to store user details
CREATE TABLE users (
  user_id INT NOT NULL UNIQUE AUTO_INCREMENT,
  firstname VARCHAR(20) NOT NULL,
  surname VARCHAR(20) NOT NULL,
  username VARCHAR(15) NOT NULL UNIQUE,
  country VARCHAR(20),
  PRIMARY KEY(user_id)
);

# Create the topics table to store the list of available topics
CREATE TABLE topics (
   topic_id INT NOT NULL UNIQUE AUTO_INCREMENT,
   topic_title VARCHAR(20),
   topic_description VARCHAR(100),
   PRIMARY KEY(topic_id)
);

# Create the membership table to say which users are members of which topics
CREATE TABLE membership (
	user_id INT,
    topic_id INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
);

# Create the posts table to store the user posts
CREATE TABLE posts (
	post_id INT NOT NULL UNIQUE AUTO_INCREMENT,
    post_date DATETIME,
    post_title VARCHAR(30),
    post_content MEDIUMTEXT,
    user_id INT,
    topic_id INT,
    PRIMARY KEY(post_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
);

# Create the replies table to store the user replies
CREATE TABLE replys (
	reply_id INT NOT NULL UNIQUE AUTO_INCREMENT,
    reply MEDIUMTEXT,
    user_id INT,
    topic_id INT,
    post_id INT,
    PRIMARY KEY(reply_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (post_id) REFERENCES posts(post_id)
);
