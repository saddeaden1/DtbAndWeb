const bcrypt = require('bcrypt');
const axios = require('axios');
const https = require('https');

axios.defaults.proxy = false;

const redirectLogin = (req, res, next) => {
  if (!req.session.user) { 
      req.session.originalUrl = req.originalUrl; 
      res.redirect('./login');
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
        user: req.session.user
    };
    res.render("index.ejs", data);
  });

  // About page
  app.get("/about", function (req, res) {
    res.render("about.ejs", forumData);
  });

  app.get('*/login', function (req, res) {
    res.render('login.ejs', forumData);
  });

  app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    db.query('CALL LoginUser(?)', [username], async (err, result) => {
        if (err) {
            return res.status(500).send('An error occurred');
        }

        const users = result[0];
        if (users.length === 0) {
            return res.status(401).send('User not found');
        }

        const user = users[0];
        const isValidPassword = await bcrypt.compare(password, user.HashedPassword);
        if (!isValidPassword) {
            return res.status(401).send('Invalid password');
        }

        req.session.user = { id: user.UserID, name: user.UserName };
        req.session.save(err => { 
            if (err) {
                return res.status(500).send('Error saving session');
            }

            const redirectPath = req.session.originalUrl ? "." + req.session.originalUrl : './';
            res.redirect(redirectPath);
        });
    });
  });


  app.get('/register', (req, res) => {
    res.render('register.ejs', forumData);
  });

  app.post('/register', async (req, res) => {
    try {
        const { username, password, confirmPassword, firstName, surname, country } = req.body;

        if (password !== confirmPassword) {
            return res.status(400).send('Passwords do not match');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        db.query('CALL RegisterUser(?, ?, ?, ?, ?)', [username, firstName, surname, hashedPassword, country], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error registering new user');
            }
            res.redirect('./login');
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
  });

  app.get('/logout', function (req, res) {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.send('you are now logged out. <a href='+'/'+'>Home</a>');
    });
  });

  // View Book Reviews
  app.get("/viewreviews", redirectLogin, function (req, res) {
    let sqlquery = `SELECT BookID, BookName, GoogleBooksID FROM vw_books_with_reviews`;

    db.query(sqlquery, (err, books) => {
        if (err) {
            console.error(err);
            return res.redirect("/");
        }

        let data = Object.assign({}, forumData, { books: books });
        res.render("viewreviews.ejs", data);
    });
  });

  // View Book Review and replies to that reveiw 
  app.get("/review/:reviewId", redirectLogin, function (req, res) {
    let reviewQuery = `SELECT r.ReviewID, r.ReviewText, r.PostDate, r.PostTitle, r.Rating, u.UserName 
                       FROM reviews r
                       JOIN users u ON r.UserID = u.UserID
                       WHERE r.ReviewID = ?`;

    let repliesQuery = `SELECT rep.ReplyID, rep.Reply, u.UserName 
                        FROM replies rep
                        JOIN users u ON rep.UserID = u.UserID
                        WHERE rep.ReviewID = ?`;

    db.query(reviewQuery, [req.params.reviewId], (err, reviewResult) => {
        if (err) {
            console.error(err);
            return res.redirect("./");
        }

        if (reviewResult.length === 0) {
            return res.status(404).send("Review not found");
        }

        db.query(repliesQuery, [req.params.reviewId], (err, repliesResult) => {
            if (err) {
                console.error(err);
                return res.redirect("./");
            }

            let data = {
                review: reviewResult[0],
                replies: repliesResult,
                forumName: forumData.forumName
            };

            res.render("review.ejs", data);
        });
    });
  });

  app.get("/bookreviews/:bookId", redirectLogin, function (req, res) {
    let sqlquery = `SELECT ReviewID, ReviewText, PostDate, PostTitle, Rating, UserName, BookName, GoogleBooksID
                    FROM vw_book_reviews
                    WHERE BookID = ?
                    ORDER BY PostDate DESC`;

    db.query(sqlquery, [req.params.bookId], (err, result) => {
        if (err) {
            console.error(err);
            return res.redirect("./");
        }

        let data = Object.assign({}, forumData, { reviews: result });
        res.render("bookreviews.ejs", data);
    });
  });

  app.post("/addreply", redirectLogin, (req, res) => {
    const replyContent = req.body.content;
    const reviewId = req.body.reviewId;
    const userId = req.session.user.id;

    //TODO: data sanitisation 

    let insertReplyQuery = `INSERT INTO replies (Reply, UserID, ReviewID) VALUES (?, ?, ?)`;

    db.query(insertReplyQuery, [replyContent, userId, reviewId], (err, result) => {
        if (err) {
            console.error(err);
            return res.redirect(`./`);
        }

        res.redirect(`./review/${reviewId}`);
    });
});


  app.get('/searchBooks', redirectLogin, (req, res) => {
    renderAddNewReview(res, {}, [], null);
  });

  app.post('/searchBooks', async (req, res) => {
      try {
          const query = req.body.bookSearch;
          const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;

          const httpsAgent = new https.Agent({  
              rejectUnauthorized: false
          });

          const response = await axios.get(url, { httpsAgent });

          renderAddNewReview(res, {}, response.data.items || [], null);
      } catch (error) {
          console.error('Error fetching data from Google Books API:', error);
          renderAddNewReview(res, {}, [], 'Error fetching data');
      }
  });

  // Helper function to render the Add New Review page
  function renderAddNewReview(res, initialValues, bookList, errorMessage) {
    let data = {
        forumName: forumData.forumName,
        initialValues: initialValues || {},
        bookList: bookList || [],
        errorMessage: errorMessage || null
    };
    res.render("addreview.ejs", data);
  }

  app.get('/book/:id/addreview', redirectLogin, async (req, res) => {
    const bookId = req.params.id;
    const url = `https://www.googleapis.com/books/v1/volumes/${bookId}`;

    try {
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const response = await axios.get(url, { httpsAgent });
        const bookData = response.data;

        if (bookData) {
            const book = {
                title: bookData.volumeInfo.title,
                thumbnail: bookData.volumeInfo.imageLinks ? bookData.volumeInfo.imageLinks.thumbnail : null,
                id: bookId
            };
            res.render('addbookreview.ejs', { book: book, forumName: forumData.forumName });
        } else {
            res.send('Book not found. <a href='+'./'+'>Home</a>');
        }
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).send('Error fetching book details. <a href='+'./'+'>Home</a>');
    }
  });
  
  app.post('/submitreview', redirectLogin, async (req, res) => {
    const { bookId, reviewText, rating, postTitle } = req.body;
    const userId = req.session.user.id;

    if (!bookId || !reviewText || !rating) {
        return res.status(400).send('All fields are required.');
    }

    try {
        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const bookResponse = await axios.get(`https://www.googleapis.com/books/v1/volumes/${bookId}`, { httpsAgent });
        const bookData = bookResponse.data.volumeInfo;

        const title = bookData.title;
        const authors = bookData.authors.join(', ');
        const isbn = bookData.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier || '';

        await db.query('CALL SubmitReview(?, ?, ?, ?, ?, ?, ?, ?)', [userId, bookId, postTitle, reviewText, rating, title, authors, isbn]);

        res.redirect(`./viewreviews`);
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while submitting the review.');
    }
  });

  app.post("/reviewadded", function (req, res) {
    let { isbn, reviewText, rating } = req.body;
    let userId = req.session.user ? req.session.user.id : 1; 

    let sqlquery = `INSERT INTO reviews (UserID, ISBN, ReviewText, Rating) VALUES (?, ?, ?, ?)`;
    db.query(sqlquery, [userId, isbn, reviewText, rating], (err, result) => {
        if (err) {
            return renderAddNewReview(res, req.body, err.message);
        }
        res.send("Review added successfully");
    });
  });
};