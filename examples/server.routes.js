// Again we are importing the libraries we are going to use
const express = require('express')
const jws = require('jws')
const sleep = require('sleep')
const router = express.Router()
const secret = 'vue-identity-seeecrets'

router.get('/login', function(req, res) {
  // Simulate latency
  sleep.sleep(3)
  //pretend this reqeust is valid
  let valid = true
  if( valid ) {
    res.status(200).send({
      token: token('vue'),
      refresh: token('vue')
    })
  }
})

router.post('/login', function(req, res) {
  // Simulate latency
  sleep.sleep(3)
  
  let user = req.body.user
  let password = req.body.password
  if (user == 'vue' && password == 'identity') {
    res.status(200).send({
      token: token(user),
      refresh: token(user)
    })
  } else {
    res.status(401).send('Invalid Username/Password')
  }
})

router.post('/refresh', function(req, res) {
  // Simulate latency
  sleep.sleep(3)

  let refresh = jws.decode(req.body.token)
  let payload = JSON.parse(refresh.payload)
  // NOTE: This example ignores the expiry in the refresh payload
  // You will want to validate refresh tokens in a database of some kind
  if (payload.name == 'vue') {
    res.status(200).send({
      token: token(payload.name),
      refresh: token(payload.name)
    })
  } else {
    res.status(401).send('Invalid refresh token')
  }
})

function token(user) {
  let now = (Date.now())/1000
  return jws.sign({
    header: { alg: 'HS256' },
    payload: {
      exp: now+60,
      iat: now,
      nbf: now-2,
      name: user
    },
    secret: secret,
  })
}

// Finally, we export this module so that we can import it in our app.js file and gain access to the routes we defined.
module.exports = router
