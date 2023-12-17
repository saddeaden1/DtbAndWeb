/*
 * Script for setting up the forum database test data
 *
 */

# Select the database
USE myforum;

# Insert a few initial users
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