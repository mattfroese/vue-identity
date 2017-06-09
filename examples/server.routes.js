// Again we are importing the libraries we are going to use
var express = require('express')
var router = express.Router()

// We are going to do the same thing for the remaining routes.
router.get('/login',function(req, res){
  res.send('You are on the login page')
})
router.post('/login',function(req, res){
  res.send('You posting to the login page')
})

router.get('/logout', function(req, res){
  res.send('You are on the logout page')
})

router.get('/polls', function(req, res){
  res.send('You are on the polls page')
})

router.get('/user', function(req, res) { //next
  res.send('You are on the user page')
})

// Finally, we export this module so that we can import it in our app.js file and gain access to the routes we defined.
module.exports = router
