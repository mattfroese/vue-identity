<template>
<div id="app">
    <h1>User/Password</h1>

    <p v-if="error" class="error">{{error}}</p>

    <input type="text" placeholder="Username" value="vue" v-model="user">
    <input type="password" placeholder="Password" value="identity" v-model="password">

    <button v-on:click="login">
      <span v-if="$identity.loading">Logging in...</span>
      <span v-if="!$identity.loading">Login</span>
    </button>

    <div v-if="$identity.user">
        <h2>Welcome, {{$identity.user.name}}!</h2>

        <p>You have successfully been authenticated! Below are the details of your jwt decoded access that was received from the server:</p>

        <h3>$identity.user</h3>

        <p v-if="$identity.loading">Authenticating...</p>

        <pre>{{$identity.user}}</pre>

        <p>If vue-identity receives a refresh token, it will automatically attempt to get a new access token when it expires. This can be turned off by setting <i>autoRefresh</i> to false.</p>

    </div>
</div>
</template>

<script>
export default {
    data() {
        return {
            user: 'vue',
            password: 'identity',
            error: false
        }
    },
    methods: {
        login() {
            var thus = this;
            thus.error = "";
            this.$identity.login({
                user: this.user,
                password: this.password
            }).then(function() {
                console.info("You are authenticated")
            }, function(e) {
                console.log(e)
                thus.error = "Invalid login: " + e.message;
            })
        }
    }
}
</script>
