<template>
  <div id="app">
    <h1>Authenticate?</h1>

    <p v-if="error">{{error}}</p>

    <input type="text" placeholder="Username" value="vue" v-model="user">
    <input type="password" placeholder="Password" value="identity" v-model="password">
    <input type="submit" value="Login" v-on:click="login">

    <div v-if="$identity.user">{{$identity.user}}</div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      user: 'vue',
      password: 'identity',
      error: false
    }
  },
  created () {
    var self = this;
    this.$identity.authenticate().then(function(){
      console.info("You are authenticated")
    },function(e){
      console.log(e)
      self.error = "Could not authenticate: " + e.message;
    })
  },
  methods: {
    login () {
      var thus = this;
      this.$identity.login({username: this.user, password: this.passs}).then(function(){
        console.info("You are authenticated")
      },function(e){
        console.log(e)
        thus.error = "Invalid login: " + e.message;
      })
    }
  }
}
</script>
