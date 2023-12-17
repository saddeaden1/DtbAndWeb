// Route handler for forum web app

module.exports = function (app, forumData) {
  // Handle our routes

  // Home page
  app.get("/", function (req, res) {
    res.render("index.ejs", forumData);
  });

  // About page
  app.get("/about", function (req, res) {
    res.render("about.ejs", forumData);
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
  });

  // Add a New Post page
  app.get("/addpost", function (req, res) {
    // Set the initial values for the form
    let initialvalues = { username: "", topic: "", title: "", content: "" };

    // Pass the data to the EJS page and view it
    return renderAddNewPost(res, initialvalues, "");
  });

  // Helper function to
  function renderAddNewPost(res, initialvalues, errormessage) {
    let data = Object.assign({}, forumData, initialvalues, {
      errormessage: errormessage,
    });
    console.log(data);
    res.render("addpost.ejs", data);
    return;
  }

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
};
