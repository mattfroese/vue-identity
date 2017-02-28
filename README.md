# vue-identity

`vue-identity` is a vue plugin that uses jwt to make authentication easy.

## Installation

### NPM

```
$ npm install vue-identity
```

## Example

```javascript
import VueIdentity from 'vue-identity'
Vue.use(VueIdentity, {
    url: "/auth", // full url to your auth endpoint
})
```

### Authenticate

This will ask the server for an `accessToken` by passing it a `refreshToken`. Cookies are sent with this request if you prefer.

```javascript
this.$identity.authenticate().then(function(){ console.log( "Logged in!" ) })
```

### Login

Request a new `accessToken` and `refreshToken` by passing credentials to the server. Credentials are sent as parameters of login and are `POST`ed to the server.

```javascript
this.$identity.login({username: "salty",password:"quark"}).then(function(){ console.log( "Logged in!" ) })
```

In your html, you can access the ``user`` state
```html
<div v-if="$identity.user">
  <p>Hello {{$identity.user.name}}</p>
</div>
```

### Vue Resource Interceptor

After authenticating, an interceptor is added to `vue-resource` that sends the `accessToken` in the `Authorization` header as a Bearer token.

## Documentation

- [Configuration](docs/config.md)
- [Vue Router](docs/vuerouter.md)
- [Development](docs/dev.md)

## License

[MIT](http://opensource.org/licenses/MIT)
