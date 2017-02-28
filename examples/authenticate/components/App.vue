<template>
  <div id="app">
    <h1>Authenticate</h1>

    <p v-if="error">{{error}}</p>

    <div v-if="$identity.user">{{$identity.user}}</div>
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
    var self = this;
    this.$identity.authenticate().then(function(){
      console.info("You are authenticated")
    },function(e){
      self.error = "Could not authenticate: " + e.message;
    })
  }
}
</script>
