DROP DATABASE IF EXISTS myforum;
CREATE DATABASE IF NOT EXISTS myforum;

# Select the database
USE myforum;

# Create the user which the web app will use to access the database
DROP USER IF EXISTS 'forumapp'@'localhost';
CREATE USER 'forumapp'@'localhost' IDENTIFIED WITH mysql_native_password BY 'qwerty';
GRANT ALL PRIVILEGES ON myforum.* TO 'forumapp'@'localhost';

# Create the user table to store user details
CREATE TABLE users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    UserName VARCHAR(50) UNIQUE NOT NULL,
    FirstName VARCHAR(20) NOT NULL,
    Surname VARCHAR(20) NOT NULL,
    HashedPassword VARCHAR(255) NOT NULL,
    Country VARCHAR(50)
);

# Create the Books table to store the list of books reveiwed
CREATE TABLE books (
    ISBN VARCHAR(50) PRIMARY KEY,
    BookName VARCHAR(255) NOT NULL,
    Author VARCHAR(255) NOT NULL,
    Category VARCHAR(100)
);

# Create the reviews table to store the user reviews
CREATE TABLE reviews (
    ReviewID INT NOT NULL UNIQUE AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    ISBN VARCHAR(50),
    ReviewText MEDIUMTEXT,
    PostDate DATETIME,
    PostTitle VARCHAR(30),
    Rating INT CHECK (Rating >= 1 AND Rating <= 5),
    FOREIGN KEY (UserID) REFERENCES users(UserID),
    FOREIGN KEY (ISBN) REFERENCES books(ISBN)
);

# Create the replies table to store the user replies to reveiws
CREATE TABLE replys (
    reply_id INT NOT NULL UNIQUE AUTO_INCREMENT,
    reply MEDIUMTEXT,
    UserID INT,
    ReviewID INT,
    PRIMARY KEY(reply_id),
    FOREIGN KEY (UserID) REFERENCES users(UserID),
    FOREIGN KEY (ReviewID) REFERENCES reviews(ReviewID)
);
       
INSERT INTO users (UserName, FirstName, Surname, HashedPassword, Country)
VALUES 
('johndoe', 'John', 'Doe', 'hashedpassword1111111111111111111', 'USA'),
('janedoe', 'Jane', 'Doe', 'hashedpassword222222222222222222', 'UK'),
('joew', 'Joe', 'Wonderland', 'hashedpassword3333333333', 'Australia'),
('fredb', 'Fred', 'Builder', 'hashedpassword44444444444', 'Canada'),
('saddeaden', 'Sadde', 'Aden', '$2b$10$MFVDXsR3u32pnwW0z5fRG.h7r169nO2U1TKnSpsepsLeKMkssjjL6', 'United Kingdom');

INSERT INTO books (ISBN, BookName, Author, Category)
VALUES 
('978-3-16-148410-0', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction'),
('979-8600420458', 'To Kill a Mockingbird', 'Harper Lee', 'Fiction'),
('978-1790245840', 'The Sign of The Blood', 'Jane Austen', 'Horror'),
('979-8986770505', 'Fire Marker Man', 'George Orwell', 'Sci-Fi');

INSERT INTO reviews (UserID, ISBN, ReviewText, PostDate, PostTitle, Rating)
VALUES 
(1, '978-3-16-148410-0', 'Great read this was', '2023-12-01 10:00:00', 'Classic', 5),
(2, '979-8600420458', 'An inspiration', '2023-12-02 11:30:00', 'Inspiration', 4),
(3, '978-1790245840', 'I liked this book', '2023-12-03 09:15:00', 'Great read', 4),
(4, '979-8986770505', 'Did not like this very much, very boring', '2023-12-04 08:45:00', 'Very boring', 5);

INSERT INTO replys (reply, UserID, ReviewID)
VALUES 
('Gread insight i totally agree', 2, 1),
('I disagree actually', 1, 2),
('This is my fav', 4, 3),
('This book was thought provocing', 3, 4);


CREATE PROCEDURE RegisterUser(IN p_UserName VARCHAR(50), IN p_FirstName VARCHAR(20), IN p_Surname VARCHAR(20), IN p_HashedPassword VARCHAR(255), IN p_Country VARCHAR(50))
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
    END;

    START TRANSACTION;
        INSERT INTO users (UserName, FirstName, Surname, HashedPassword, Country) VALUES (p_UserName, p_FirstName, p_Surname, p_HashedPassword, p_Country);
    COMMIT;
END;

CREATE PROCEDURE LoginUser(IN p_UserName VARCHAR(50))
BEGIN
    SELECT UserID, UserName, HashedPassword FROM users WHERE UserName = p_UserName;
END;