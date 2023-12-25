const bcrypt = require('bcrypt');
const axios = require('axios');
const https = require('https');

axios.defaults.proxy = false;

const redirectLogin = (req, res, next) => {
  if (!req.session.user) { 
      req.session.originalUrl = req.originalUrl; 
      res.redirect('/login');
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



            const protocol = req.protocol;
            const host = req.headers.host; 
            const baseUrl = `${protocol}://${host}`;

            const defaultRedirectPath = '/'; 
            const redirectTo = req.session.originalUrl || defaultRedirectPath;
            delete req.session.originalUrl;

            res.redirect(redirectTo);
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
            res.redirect('/login');
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
    let sqlquery = `SELECT BookName, ISBN FROM vw_books_with_reviews`;

    db.query(sqlquery, (err, result) => {
        if (err) {
            res.redirect("/");//todo: fix
        }

        let data = Object.assign({}, forumData, { books: result });
        res.render("viewreviews.ejs", data);
    });
  });

  // View Book Review
  app.get("/review/:reviewId", redirectLogin, function (req, res) {
    let reviewQuery = `SELECT * FROM reviews WHERE ReviewID = ?`;
    let repliesQuery = `SELECT * FROM replys WHERE ReviewID = ?`;

    db.query(reviewQuery, [req.params.reviewId], (err, reviewResult) => {
        if (err) {
            return res.redirect("./");
        }

        db.query(repliesQuery, [req.params.reviewId], (err, repliesResult) => {
            if (err) {
                return res.redirect("./");//todo fix
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

  app.get("/bookreviews/:isbn", redirectLogin, function (req, res) {
    let sqlquery = `SELECT ReviewID, ReviewText, PostDate, PostTitle, Rating, UserName
                    FROM vw_book_reviews
                    WHERE ISBN = ?
                    ORDER BY PostDate DESC`;

    db.query(sqlquery, [req.params.isbn], (err, result) => {
        if (err) {
            return res.redirect("./");
        }

        let data = Object.assign({}, forumData, { reviews: result });
        res.render("bookreviews.ejs", data);
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
            res.send('Book not found. <a href='+'/'+'>Home</a>');
        }
    } catch (error) {
        console.error('Error fetching book details:', error);
        res.status(500).send('Error fetching book details. <a href='+'/'+'>Home</a>');
    }
});
  
  app.post('/submitreview', (req, res) => {

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

/* /////////////////////////////////////////////////////////////////////////////
  // Search for Posts page
  app.get("/post/:postName", function (req, res) {
    let sqlquery = `Select post_id, post_date, post_title, post_content, reply, repliesUserName, postsUsername
                    FROM vw_replies
                    WHERE  post_title = ? `;

    db.query(sqlquery, [req.params.postName], (err, result) => {
      if (err) {
        res.redirect("./");
      }
      let initialvalues = { username: "", content: "", errormessage: "" };
      let data = Object.assign({}, forumData, { post: result }, initialvalues);
      res.render("post.ejs", data);
    });
  });

  // Adds a reply and returns the response
  app.post("/reply", function (req, res) {
    let params = [req.body.content, req.body.post_id, req.body.username];
    console.log(params);
    let sqlquery = `CALL sp_insert_reply(?,?,?)`;
    //Calling reply stored proc and returning the sucess or error page to the user
    db.query(sqlquery, params, (err, result) => {
      if (err) {
        res.send(err.message);
      }else{
        res.send("You reply has been added to forum");
      }
    });
  });

  // Search for Posts page
  app.get("/search", function (req, res) {
    res.render("search.ejs", forumData);
  });

  // Search for Posts form handler
  app.get("/search-result", function (req, res) {
    //searching in the database
    let term = "%" + req.query.keyword + "%";

    let sqlquery = `SELECT   post_id, post_date, topic_title, post_title, post_content, username 
                    FROM     vw_posts2
                    WHERE    post_title LIKE ? OR post_content LIKE ?
                    ORDER BY post_date DESC`;

    db.query(sqlquery, [term, term], (err, result) => {
      if (err) {
        res.redirect("./");
      }

      let data = Object.assign({}, forumData, { posts: result });
      res.render("viewposts.ejs", data);
    });
  });

    // Add a New Post page form handler
    app.post("/postadded", function (req, res) {
      let params = [
        req.body.title,
        req.body.content,
        req.body.topic,
        req.body.username,
      ];
      let sqlquery = `CALL sp_insert_post(?,?,?,?)`;
      db.query(sqlquery, params, (err, result) => {
        if (err) {
          return renderAddNewPost(res, req.body, err.message);
        }
        res.send("You post has been added to forum");
      });
    }); 
    
   // View Posts page
  app.get("/viewposts", function (req, res) {
    // Query to select all posts from the database
    let sqlquery2 =`SELECT   post_id, post_date, topic_title, post_title, post_content, username 
                    FROM     vw_posts2
                    ORDER BY post_date DESC`;

    // Run the query
    db.query(sqlquery2, (err, result) => {
      if (err) {
        res.redirect("./");
      }

      // Pass results to the EJS page and view it
      let data = Object.assign({}, forumData, { posts: result });
      console.log(data);
      res.render("viewposts.ejs", data);
    });
  });

  app.get("/viewposts/topic/:topic", function (req, res) {
    // Query to select all posts from the database
    let sqlquery2 = `SELECT   post_id, post_date, topic_title, post_title, post_content, username 
                    FROM     vw_posts4
                    WHERE    topic_title = ?
                    ORDER BY post_date DESC`;

    // Run the query
    db.query(sqlquery2, [req.params.topic], (err, result) => {
      if (err) {
        res.redirect("./");
      }

      // Pass results to the EJS page and view it
      let data = Object.assign({}, forumData, { posts: result });
      console.log(data);
      res.render("viewposts.ejs", data);
    });
  });

  app.get("/viewposts/user/:username", function (req, res) {
    // Query to select all posts from the database
    let sqlquery2 = `SELECT   post_id, post_date, topic_title, post_title, post_content, username 
                    FROM     vw_posts4
                    WHERE    username = ?
                    ORDER BY post_date DESC`;

    // Run the query
    db.query(sqlquery2, [req.params.username], (err, result) => {
      if (err) {
        res.redirect("./");
      }

      // Pass results to the EJS page and view it
      let data = Object.assign({}, forumData, { posts: result });
      console.log(data);
      res.render("viewposts.ejs", data);
    });
  });

  // List Users page
  app.get("/users", function (req, res) {
    // Query to select all users
    let sqlquery = `SELECT   username, firstname, surname, country
                    FROM     users 
                    ORDER BY username;`;

    // Run the query
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }

      // Pass results to the EJS page and view it
      let data = Object.assign({}, forumData, { users: result });
      console.log(data);
      res.render("users.ejs", data);
    });
  });

  // List User page
  app.get("/user/:username", function (req, res) {
    // Query to select all users
    let sqlquery = `SELECT topic_title, username, firstname, surname, country FROM vw_users3
                    WHERE    username = ?;`;

    // Run the query
    db.query(sqlquery, [req.params.username], (err, result) => {
      if (err) {
        res.redirect("./");
      }

      let data = Object.assign({}, forumData, { user: result });
      res.render("user.ejs", data);
    });
  });

  // List Topics page
  app.get("/topics", function (req, res) {
    // Query to select all topics
    let sqlquery = `SELECT   topic_id, topic_title, topic_description
                    FROM     topics
                    ORDER BY topic_title`;

    // Run the query
    db.query(sqlquery, (err, result) => {
      if (err) {
        res.redirect("./");
      }

      // Pass results to the EJS page and view it
      let data = Object.assign({}, forumData, { topics: result });
      console.log(data);
      res.render("topics.ejs", data);
    });
  });

  // List Topics page
  app.get("/topic/:topicName", function (req, res) {
    // Query to select all topics
    let sqlquery = `SELECT   topic_id, topic_title, topic_description
                    FROM     topics
                    WHERE topic_id = ?`;

    let data;
    // Run the query
    db.query(sqlquery, [req.params.topicName], (err, result) => {
      if (err) {
        res.redirect("./");
      }

      // Pass results to the EJS page and view it
      data = Object.assign({}, forumData, { topic: result });
      console.log(data);
      res.render("topic.ejs", data);
    });
  });*/