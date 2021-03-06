//Only deals with auth, not real user information
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');


/*
======================================
PUBLIC ROUTES
======================================
*/


// @route   POST api/users/register
// @desc    Register a user
// @access  Public
router.post('/register', (req, res) => {
  const {
    errors,
    isValid
  } = validateRegisterInput(req.body);
  if (!isValid) return res.status(400).json(errors);
  User.findOne({
      email: req.body.email
    })
    .then((user) => {
      if (user) {
        errors.email = "User already exists. Please login."
        res.status(400).json(errors);
      } else {
        const avatar = gravatar.url(req.body.email, {
          s: '200',
          r: 'pg',
          d: 'mp'
        })
        const newbie = new User({
          name: req.body.name,
          email: req.body.email,
          password: req.body.password,
          avatar
        });

        // Encrypt password and save user to Mongo
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newbie.password, salt, (err, hash) => {
            if (err) throw err;
            newbie.password = hash;
            newbie.save()
              .then(user => res.json(user))
              .catch(err => console.error(err));
          })
        })
      }
    })
    .catch(err => res.json(err));
});



// @route   POST api/users/login
// @desc    Login User / Return JSON Web Token
// @access  Public
router.post('/login', (req, res) => {
  // Pre-validate inputs
  const {
    errors,
    isValid
  } = validateLoginInput(req.body);
  if (!isValid) {
    res.status(400).json(errors);
  }

  // Find user by email address.
  User.findOne({
      email: req.body.email
    })
    .then(user => {
      if (!user) return res.status(400).json({
        msg: 'User not found.'
      });

      // Compare the given pw with the stored, hashed version.  
      bcrypt.compare(req.body.password, user.password)
        .then(match => {
          if (match) {
            //Create jwt payload
            const payload = {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
            }
            // Sign Token
            jwt.sign(
              payload,
              process.env.SECRET, {
                expiresIn: 3600
              },
              (err, token) => {
                res.json({
                  success: true,
                  token: `Bearer ${token}`
                })
              })
          } else {
            return res.status(400).json({
              msg: 'Password Incorrect.'
            })
          }
        })
    })
});




/*
======================================
PRIVATE ROUTES
======================================
*/


// @route   POST api/users/current
// @desc    Returns current user
// @access  Private

router.get('/current', passport.authenticate('jwt', {
  session: false
}), (req, res) => {
  res.json(req.user);
})


module.exports = router;