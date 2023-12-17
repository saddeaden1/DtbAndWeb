DROP DATABASE IF EXISTS myforum;
CREATE DATABASE IF NOT EXISTS myforum;

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


INSERT INTO users (firstname, surname, username, country)
VALUES  ('Shad','Travis','shaddy', 'UK'),
		('Bernadette','Bagley','baggy', 'Italy'),
		('Rolo','Vicario','roly', 'Italy'),
		('Sophie','Panza','panny','UK'),
		('Miriana','Vitali','vit', 'Italy'),
		('Carolina','Morella','lina','Spain'),
		('Allyn','Earl','ally', 'UK'),
		('Giada','Filippi','pip', 'Italy'),
		('Elly','Barros','elly', 'Spain');
        
# Insert a few initial topics
INSERT INTO topics (topic_title, topic_description)
VALUES ('food', 'All about food'),
       ('art', 'Arts, artists and related'),
       ('architecture', 'Buildings of interest');
       
# Insert some user membership to topics
INSERT INTO membership (user_id, topic_id)
VALUES (1,1),(1,2),(1,3),
       (2,2),
       (3,3),
       (4,1),
       (5,1),
       (6,1),(6,3),
       (7,3);
       
# Insert some test posts
INSERT INTO posts (post_date, post_title, post_content, user_id, topic_id)
VALUES ('2021-11-01 12:53', "How to peel an avocado", "What's the best way to peel an avocado?", 1, 1);

INSERT INTO posts (post_date, post_title, post_content, user_id, topic_id)
VALUES ('2021-11-03 10:34', "Peeling bananas", "Which is the correct end?", 4, 1);

INSERT INTO posts (post_date, post_title, post_content, user_id, topic_id)
VALUES ('2021-11-07 16:26', "How to peel a grape", "Is this even possible?", 6, 1);

INSERT INTO posts (post_date, post_title, post_content, user_id, topic_id)
VALUES ('2021-11-13 17:01', "My bao buns are soggy", "What am I doing wrong?", 6, 1);

INSERT INTO posts (post_date, post_title, post_content, user_id, topic_id)
VALUES ('2021-11-13 19:45', "Framers in Camberwell", "I urgently need a picture framing.  Any recommendations?", 1, 2);

INSERT INTO posts (post_date, post_title, post_content, user_id, topic_id)
VALUES ('2021-11-15 13:32', "Cezanne exhibition", "I have 2 spare tickets for this Friday.  Anyone want them?", 2, 2);