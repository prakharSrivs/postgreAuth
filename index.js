const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const flash = require('express-flash');
const pg = require('pg');
const path = require('path');
const pool = require('./dbconfig');


const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());



passport.use(
  new LocalStrategy(
    {
      usernameField: 'email', 
      passwordField: 'password', 
    },
    (email, password, done) => {
      pool.query('SELECT * FROM users WHERE email = $1', [email], (err, result) => {
        if (err) {
          return done(err);
        }

        if (result.rows.length === 0) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        const user = result.rows[0];
        bcrypt.compare(password, user.hashedpassword, (err, isMatch) => {
          if (err) {
            return done(err);
          }

          if (!isMatch) {
            return done(null, false, { message: 'Incorrect email or password.' });
          }
          return done(null, user);
        });
      });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  pool.query('SELECT * FROM users WHERE id = $1', [id], (err, result) => {
    if (err) {
      return done(err);
    }

    const user = result.rows[0];
    done(null, user);
  });
});


app.use(passport.initialize());
app.use(passport.session());



//Routes
app.get('/users/login', (req, res) => {
  res.render('login', { message: req.flash('error') });
});

app.post('/users/login', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/users/dashboard',
    failureRedirect: '/users/login',
    failureFlash: true,
  })(req, res, next);
});

app.get('/users/register', (req, res) => {
  res.render('register');
});

app.post('/users/register', (req, res, next) => {
  const { username, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match');
    return res.redirect('/users/register');
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return next(err);
    }

    pool.query('INSERT INTO users (username, email, hashedPassword) VALUES ($1, $2, $3)', [username, email, hashedPassword], (err) => {
      if (err) {
        return next(err);
      }
      res.redirect('/users/dashboard');
    });
  });
});


app.get('/users/dashboard', isAuthenticated, (req, res) => {
  res.render('dashboard', { username: req.user.username });
});

app.get('/users/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
      res.redirect('/users/login');
    });
  });
});


function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
