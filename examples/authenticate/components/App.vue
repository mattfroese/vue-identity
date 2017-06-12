<template>
  <div id="app">
    <h1>Authenticate</h1>

    <p v-if="error" class="error">{{error}}</p>

    <p>Authenticate will attempt to use a saved refresh token to obtain an access token.</p>

    <h3>$identity.user</h3>

    <p v-if="$identity.loading">Authenticating...</p>

    <pre>{{$identity.user}}</pre>

    <h2>localStorage</h2>

    <p>By default, vue-identity uses localStorage to save the refresh token.</p>

    <h2>Auto-Redirect</h2>

    <p>If the server responds with the <i>X-Authentication-Location</i> header, vue-identity will automatically redirect. This is useful for single sign or third party authentication providers.</p>

  </div>
</template>

<script>
export default {
  data () {
    return {
      error: false
    }
  },
  created () {
    var thus = this
    thus.error = false
    this.$identity.authenticate().then(function(){
      console.info("You are authenticated")
    },function(e){
      console.log(e)
      thus.error = "Could not authenticate: " + e.message;
    })
  }
}
</script>
