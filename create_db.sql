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
    BookID INT AUTO_INCREMENT PRIMARY KEY,
    ISBN VARCHAR(50),
    BookName VARCHAR(255) NOT NULL,
    Author VARCHAR(255) NOT NULL,
    Category VARCHAR(100),
    GoogleBooksID VARCHAR(255) UNIQUE
);

# Create the reviews table to store the user reviews
CREATE TABLE reviews (
    ReviewID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT,
    BookID INT,
    ReviewText MEDIUMTEXT,
    PostDate DATETIME,
    PostTitle VARCHAR(30),
    Rating INT CHECK (Rating >= 1 AND Rating <= 5),
    FOREIGN KEY (UserID) REFERENCES users(UserID),
    FOREIGN KEY (BookID) REFERENCES books(BookID)
);

# Create the replies table to store the user replies to reveiws
CREATE TABLE replies (
    ReplyID INT AUTO_INCREMENT PRIMARY KEY,
    Reply MEDIUMTEXT,
    UserID INT,
    ReviewID INT,
    FOREIGN KEY (UserID) REFERENCES users(UserID),
    FOREIGN KEY (ReviewID) REFERENCES reviews(ReviewID)
);

INSERT INTO users (UserName, FirstName, Surname, HashedPassword, Country) VALUES 
('johndoe', 'John', 'Doe', 'hashedpassword1111111111111111111', 'USA'),
('janedoe', 'Jane', 'Doe', 'hashedpassword222222222222222222', 'UK'),
('joew', 'Joe', 'Wonderland', 'hashedpassword3333333333', 'Australia'),
('fredb', 'Fred', 'Builder', 'hashedpassword44444444444', 'Canada'),
('saddeaden', 'Sadde', 'Aden', '$2b$10$MFVDXsR3u32pnwW0z5fRG.h7r169nO2U1TKnSpsepsLeKMkssjjL6', 'United Kingdom');

INSERT INTO books (ISBN, BookName, Author, Category, GoogleBooksID) VALUES 
('978-3-16-148410-0', 'The Great Gatsby', 'F. Scott Fitzgerald', 'Fiction', 'iXn5U2IzVH0C'),
('979-8600420458', 'To Kill a Mockingbird', 'Harper Lee', 'Fiction', 'i5PsAwAAQBAJ'),
('978-1790245840', 'The Sign of The Blood', 'Jane Austen', 'Horror', 'kjziygEACAAJ'),
('979-8986770505', 'Fire Marker Man', 'George Orwell', 'Sci-Fi', 'SxdWzwEACAAJ');

INSERT INTO reviews (UserID, BookID, ReviewText, PostDate, PostTitle, Rating)
VALUES 
(1, (SELECT BookID FROM books WHERE ISBN = '978-3-16-148410-0'), 'Great read this was', '2023-12-01 10:00:00', 'Classic', 5),
(2, (SELECT BookID FROM books WHERE ISBN = '979-8600420458'), 'An inspiration', '2023-12-02 11:30:00', 'Inspiration', 4),
(3, (SELECT BookID FROM books WHERE ISBN = '978-1790245840'), 'I liked this book', '2023-12-03 09:15:00', 'Great read', 4),
(4, (SELECT BookID FROM books WHERE ISBN = '979-8986770505'), 'Did not like this very much, very boring', '2023-12-04 08:45:00', 'Very boring', 5);

INSERT INTO replies (Reply, UserID, ReviewID)
VALUES 
('Great insight, I totally agree', 2, 1),
('I disagree actually', 1, 2),
('This is my favorite', 4, 3),
('This book was thought-provoking', 3, 4);

CREATE PROCEDURE RegisterUser(
    IN p_UserName VARCHAR(50), 
    IN p_FirstName VARCHAR(20), 
    IN p_Surname VARCHAR(20), 
    IN p_HashedPassword VARCHAR(255), 
    IN p_Country VARCHAR(50)
)
BEGIN
    DECLARE v_UserExists INT;

    -- Check if the user already exists
    SELECT COUNT(*) INTO v_UserExists FROM users WHERE UserName = p_UserName;

    IF v_UserExists = 0 THEN
        INSERT INTO users (UserName, FirstName, Surname, HashedPassword, Country) 
        VALUES (p_UserName, p_FirstName, p_Surname, p_HashedPassword, p_Country);
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User already exists';
    END IF;
END;

CREATE PROCEDURE LoginUser(IN p_UserName VARCHAR(50))
BEGIN
    SELECT UserID, UserName, HashedPassword FROM users WHERE UserName = p_UserName;
END;

CREATE VIEW vw_books_with_reviews AS
SELECT DISTINCT 
    books.BookID,
    books.BookName, 
    books.ISBN,
    books.GoogleBooksID
FROM 
    reviews
JOIN 
    books ON reviews.BookID = books.BookID
ORDER BY 
    books.BookName;

CREATE VIEW vw_book_reviews AS
SELECT 
    reviews.ReviewID, 
    reviews.ReviewText, 
    reviews.PostDate, 
    reviews.PostTitle, 
    reviews.Rating, 
    books.BookID,
    books.BookName,
    books.GoogleBooksID,
    users.UserName
FROM 
    reviews
JOIN 
    users ON reviews.UserID = users.UserID
JOIN
    books ON reviews.BookID = books.BookID;

CREATE PROCEDURE SubmitReview(
    IN p_UserId INT, 
    IN p_GoogleBooksID VARCHAR(255), 
    IN p_PostTittle VARCHAR(30),
    IN p_ReviewText TEXT, 
    IN p_Rating INT, 
    IN p_Title VARCHAR(255), 
    IN p_Authors VARCHAR(255), 
    IN p_ISBN VARCHAR(20)
)
BEGIN
    DECLARE v_BookExists INT;
    DECLARE v_BookID INT;

    -- Start transaction
    START TRANSACTION;

    -- Check if the book already exists
    SELECT COUNT(*) INTO v_BookExists FROM books WHERE GoogleBooksID = p_GoogleBooksID;

    IF v_BookExists = 0 THEN
        -- Insert the new book
        INSERT INTO books (BookName, Author, ISBN, GoogleBooksID) VALUES (p_Title, p_Authors, p_ISBN, p_GoogleBooksID);
    END IF;

    -- Get the BookID of the book
    SELECT BookID INTO v_BookID FROM books WHERE GoogleBooksID = p_GoogleBooksID;

    -- Insert the review
    INSERT INTO reviews (UserID, BookID, PostTitle,ReviewText, Rating, PostDate) VALUES (p_UserId, v_BookID, p_PostTittle, p_ReviewText, p_Rating, NOW());

    -- Commit transaction
    COMMIT;
END;

