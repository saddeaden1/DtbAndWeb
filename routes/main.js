//import modules
const bcrypt = require("bcrypt");
const axios = require("axios");
const https = require("https");
const { check, validationResult } = require("express-validator");

//an attempt to bypass my laptops proxy to make api calls to google without ssl handshake problems
axios.defaults.proxy = false;

//If the user is not logged in it will redict them to the login page and preserve the previous url
const redirectLogin = (req, res, next) => {
  if (!req.session.user) {
    req.session.originalUrl = req.originalUrl;
    res.redirect("./login");
  } else {
    next();
  }
};

module.exports = function (app, forumData) {
  // Handle our routes

  // Home page
  app.get("/", function (req, res) {
    let data = {
      forumName: forumData.forumName,
      user: req.session.user,
    };
    res.render("index.ejs", data);
  });

  // About page
  app.get("/about", function (req, res) {
    res.render("about.ejs", forumData);
  });

  //route for login, * meaning it will work on any page when a user is on a page which isnt the home page and is redirected to the login page
  app.get("*/login", function (req, res) {
    renderLoginPage(res, {}, null);
  });

  //login form route
  app.post(
    "/login",
    [
      // Validation rules
      check("username", "Username is required").not().isEmpty(),
      check("password", "Password is required").not().isEmpty(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // If there are validation errors, render the error page
        return renderLoginPage(
          res,
          req.body,
          errors
            .array()
            .map((err) => err.msg)
            .join(", ")
        );
      }

      const username = req.sanitize(req.body.username);
      const password = req.body.password;

      //call login stored proc
      db.query("CALL LoginUser(?)", [username], async (err, result) => {
        if (err) {
          console.error(err);
          return renderLoginPage(res, req.body, "An error occurred");
        }

        const users = result[0];
        if (users.length === 0) {
          return renderLoginPage(res, req.body, "User not found");
        }

        //validate user password against stored hash
        const user = users[0];
        const isValidPassword = await bcrypt.compare(
          password,
          user.HashedPassword
        );
        if (!isValidPassword) {
          return renderLoginPage(res, req.body, "Invalid password");
        }

        //save user information in session 
        req.session.user = { id: user.UserID, name: user.UserName };
        req.session.save((err) => {
          if (err) {
            console.error(err);
            return renderLoginPage(res, req.body, "Error saving session");
          }

          const redirectPath = req.session.originalUrl
            ? "." + req.session.originalUrl
            : "./";
          res.redirect(redirectPath);
        });
      });
    }
  );

  function renderLoginPage(res, initialValues, errorMessage) {
    let data = {
      initialValues: initialValues || {},
      errorMessage: errorMessage || null,
      forumName: forumData.forumName,
    };
    res.render("login.ejs", data);
  }

  app.get("/register", (req, res) => {
    renderRegisterPage(res, {}, null);
  });

  app.post(
    "/register",
    [
      // Validation rules
      check("username").not().isEmpty().withMessage("Username is required"),
      check("firstName").not().isEmpty().withMessage("First name is required"),
      check("surname").not().isEmpty().withMessage("Surname is required"),
      check("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long"),
      check("confirmPassword", "Passwords do not match").custom(
        (value, { req }) => value === req.body.password
      ),
    ],
    (req, res) => {
      const errors = validationResult(req);

      // If there are validation errors, render the error page
      if (!errors.isEmpty()) {
        return renderRegisterPage(
          res,
          req.body,
          errors
            .array()
            .map((err) => err.msg)
            .join(", ")
        );
      }

      // Sanitize inputs
      const username = req.sanitize(req.body.username);
      const firstName = req.sanitize(req.body.firstName);
      const surname = req.sanitize(req.body.surname);
      const country = req.sanitize(req.body.country);
      const password = req.body.password;

      //hash password
      const hashedPassword = bcrypt.hashSync(password, 10);

      //call registration stored procedure
      db.query(
        "CALL RegisterUser(?, ?, ?, ?, ?)",
        [username, firstName, surname, hashedPassword, country],
        (err, results) => {
          if (err) {
            let errorMessage = "An error occurred during registration.";
            if (
              err.code === "ER_SIGNAL_EXCEPTION" &&
              err.sqlMessage === "User already exists"
            ) {
              errorMessage = "User already exists.";
            }
            console.error(err);
            return renderRegisterPage(res, req.body, errorMessage);
          }
          res.redirect("./login");
        }
      );
    }
  );

  function renderRegisterPage(res, initialValues, errorMessage) {
    let data = {
      initialValues: initialValues || {},
      errorMessage: errorMessage || null,
      forumName: forumData.forumName,
    };
    res.render("register.ejs", data);
  }

  app.get("/logout", function (req, res) {
    req.session.destroy((err) => {
      return res.redirect("./");
    });
  });

  // View Book Reviews
  //calls the redirect to redirect to the login check to see if the user is logged in and prompts a login if they arent
  app.get("/viewreviews", redirectLogin, function (req, res) {
    let sqlquery = `SELECT BookID, BookName, GoogleBooksID FROM vw_books_with_reviews`;

    db.query(sqlquery, (err, books) => {
      if (err) {
        console.error(err);
        return res.redirect("./");
      }

      let data = Object.assign({}, forumData, { books: books });
      res.render("viewreviews.ejs", data);
    });
  });

  app.get("/bookreviews/:bookId", redirectLogin, function (req, res) {
    let sqlquery = `SELECT ReviewID, ReviewText, PostDate, PostTitle, Rating, UserName, BookName, GoogleBooksID
                    FROM vw_book_reviews
                    WHERE BookID = ?
                    ORDER BY PostDate DESC`;

    const bookId = req.sanitize(req.params.bookId);

    db.query(sqlquery, [bookId], (err, result) => {
      if (err) {
        console.error(err);
        return res.redirect("./");
      }

      let data = Object.assign({}, forumData, { reviews: result });
      res.render("bookreviews.ejs", data);
    });
  });

  app.get("/review/:reviewId", redirectLogin, function (req, res) {
    const reviewId = req.sanitize(req.params.reviewId);
    fetchAndRenderReviewPage(req, res, reviewId, null);
  });

  app.post(
    "/addreply",
    [
      // Validation rules
      check("content", "Reply content is required").not().isEmpty(),
      check("reviewId", "Review ID is required").not().isEmpty(),
    ],
    redirectLogin,
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return fetchAndRenderReviewPage(
          req,
          res,
          req.body.reviewId,
          //combine errors into 1 errror message
          errors
            .array()
            .map((err) => err.msg)
            .join(", ")
        );
      }

      // Sanitize inputs
      const replyContent = req.sanitize(req.body.content);
      const reviewId = req.sanitize(req.body.reviewId);
      //retrive user information from session 
      const userId = req.session.user.id;

      let insertReplyQuery = `INSERT INTO replies (Reply, UserID, ReviewID) VALUES (?, ?, ?)`;

      db.query(
        insertReplyQuery,
        [replyContent, userId, reviewId],
        (err, result) => {
          if (err) {
            console.error(err);
            return renderReplyPage(
              res,
              reviewId,
              req.body,
              "An error occurred while submitting the reply."
            );
          }

          res.redirect(`./review/${reviewId}`);
        }
      );
    }
  );

  function fetchAndRenderReviewPage(req, res, reviewId, errorMessage) {
    let reviewQuery = `SELECT r.ReviewID, r.ReviewText, r.PostDate, r.PostTitle, r.Rating, u.UserName 
                       FROM reviews r
                       JOIN users u ON r.UserID = u.UserID
                       WHERE r.ReviewID = ?`;

    let repliesQuery = `SELECT rep.ReplyID, rep.Reply, u.UserName 
                        FROM replies rep
                        JOIN users u ON rep.UserID = u.UserID
                        WHERE rep.ReviewID = ?`;

    db.query(reviewQuery, [reviewId], (err, reviewResult) => {
      if (err) {
        console.error(err);
        return res.redirect("./");
      }

      if (reviewResult.length === 0) {
        return res.status(404).send("Review not found");
      }

      db.query(repliesQuery, [reviewId], (err, repliesResult) => {
        if (err) {
          console.error(err);
          return res.redirect("./");
        }

        let data = {
          review: reviewResult[0],
          replies: repliesResult,
          forumName: forumData.forumName,
          errorMessage: errorMessage,
        };

        res.render("review.ejs", data);
      });
    });
  }

  app.get("/searchBooks", redirectLogin, (req, res) => {
    renderAddNewReview(res, {}, [], null);
  });

  app.post("/searchBooks", redirectLogin, async (req, res) => {
    try {
      const query = req.sanitize(req.body.bookSearch);
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
        query
      )}`;

      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
      });

      const response = await axios.get(url, { httpsAgent });

      renderAddNewReview(res, {}, response.data.items || [], null);
    } catch (error) {
      console.error("Error fetching data from Google Books API:", error);
      renderAddNewReview(res, {}, [], "Error fetching data");
    }
  });

  // Helper function to render the Add New Review page
  function renderAddNewReview(res, initialValues, bookList, errorMessage) {
    let data = {
      forumName: forumData.forumName,
      initialValues: initialValues || {},
      bookList: bookList || [],
      errorMessage: errorMessage || null,
    };
    res.render("searchbooks.ejs", data);
  }

  app.get("/book/:id/addreview", redirectLogin, async (req, res) => {
    const bookId = req.sanitize(req.params.id);
    const url = `https://www.googleapis.com/books/v1/volumes/${bookId}`;

    try {
       //disable certificate validaion handling to bypass proxy errors on my machine 
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      //api call to google
      const response = await axios.get(url, { httpsAgent });

      //retrive response data 
      const bookData = response.data;

      //retrive relevent data from response
      if (bookData) {
        const book = {
          title: bookData.volumeInfo.title,
          thumbnail: bookData.volumeInfo.imageLinks
            ? bookData.volumeInfo.imageLinks.thumbnail
            : null,
          id: bookId,
        };
        res.render("addbookreview.ejs", {
          book: book,
          forumName: forumData.forumName,
          errorMessage: null,
        });
      } else {
        res.send("Book not found. <a href=" + "./" + ">Home</a>");
      }
    } catch (error) {
      console.error("Error fetching book details:", error);
      res
        .status(500)
        .send("Error fetching book details. <a href=" + "./" + ">Home</a>");
    }
  });

  app.post(
    "/submitreview",
    [
      // Validation rules
      check("postTitle", "Review title is required").not().isEmpty(),
      check("reviewText", "Review text is required").not().isEmpty(),
      check(
        "rating",
        "Rating is required and must be a number between 1 and 5"
      ).isInt({ min: 1, max: 5 }),
      check("bookId", "Book ID is required").not().isEmpty(),
    ],
    redirectLogin,
    async (req, res) => {
      const errors = validationResult(req);

      // If there are validation errors, render the error page
      if (!errors.isEmpty()) {
        const book = {
          id: req.body.bookId,
          title: req.body.bookTitle,
          thumbnail: req.body.thumbnail,
        };
        return renderSubmitReviewPage(
          res,
          book,
          req.body,
          errors
            .array()
            .map((err) => err.msg)
            .join(", ")
        );
      }

      const bookId = req.sanitize(req.body.bookId);
      const reviewText = req.sanitize(req.body.reviewText);
      const rating = req.sanitize(req.body.rating);
      const postTitle = req.sanitize(req.body.postTitle);
      const userId = req.session.user.id;

      try {
        //disable certificate validaion handling to bypass proxy errors on my machine 
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });

        //api call to google 
        const bookResponse = await axios.get(
          `https://www.googleapis.com/books/v1/volumes/${bookId}`,
          { httpsAgent }
        );
        const bookData = bookResponse.data.volumeInfo;


        const title = req.sanitize(bookData.title);
        const authors = req.sanitize(bookData.authors.join(", "));

        //retrive the isbn 13 format and if it is null retrive the isbn 10 and if both are null store a null value for this in the db
        const isbn13 = bookData.industryIdentifiers?.find(
          (id) => id.type === "ISBN_13"
        )?.identifier;
        const isbn10 = bookData.industryIdentifiers?.find(
          (id) => id.type === "ISBN_10"
        )?.identifier;
        const isbn = req.sanitize(isbn13 || isbn10 || "");

        await db.query("CALL SubmitReview(?, ?, ?, ?, ?, ?, ?, ?)", [
          userId,
          bookId,
          postTitle,
          reviewText,
          rating,
          title,
          authors,
          isbn,
        ]);

        res.redirect(`./viewreviews`);
      } catch (error) {
        console.error(error);
        const book = {
          id: req.body.bookId,
          title: req.body.bookTitle,
          thumbnail: req.body.thumbnail,
        };
        renderSubmitReviewPage(
          res,
          book,
          req.body,
          "An error occurred while submitting the review."
        );
      }
    }
  );

  function renderSubmitReviewPage(res, book, initialValues, errorMessage) {
    let data = {
      book: book || {},
      initialValues: initialValues || {},
      errorMessage: errorMessage || null,
      forumName: forumData.forumName,
    };
    res.render("addbookreview.ejs", data);
  }

  app.get("/search", redirectLogin,(req, res) => {
    renderSearchPage(res, {}, null);
  });

  app.post("/search",[
    check("searchTerm", "A search term required").not().isEmpty()
  ],
  redirectLogin, (req, res) => {

    // If there are validation errors, render the error page
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return renderSearchPage(res,{},errors.array().map((err) => err.msg).join(", "));
    }

    //sanatize search input 
    const searchTerm = req.sanitize(req.body.searchTerm);

    //search by book name or reveiw and join the tables
    const searchQuery = `
          SELECT reviews.*, books.BookName 
          FROM reviews 
          INNER JOIN books ON reviews.BookID = books.BookID 
          WHERE reviews.ReviewText LIKE ? OR books.BookName LIKE ?`;

    db.query(searchQuery, [`%${searchTerm}%`, `%${searchTerm}%`], (err, results) => {
        if (err) {
            console.error(err);
            // If there are errors, render the error page
            renderSearchPage(res, [], "An error occurred during the search");
        } else {
            renderSearchPage(res, results, null);
        }
    });
  });

  function renderSearchPage(res, searchResults, errorMessage) {
    let data = {
      searchResults: searchResults || [],
      errorMessage: errorMessage,
    };
    res.render("search.ejs", data);
  }

  app.get("/reviews", (req, res) => {
    //retrives the header from the request
    const apiKey = req.headers["x-api-key"];

    //returns an unauthorized response if the key is not included in the header or incorrect
    if (!apiKey || apiKey !== "apikey") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query = "SELECT * FROM vw_book_reviews";

    db.query(query, (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Internal server error" });
      }
      //return the data if all is successful
      res.json(results);
    });
  });
};
