# Configuration

## Webpack/Browserify

Add `vue`, `vue-resource`, `vue-identity` to your `package.json`, then `npm install`, then add these lines in your code:

```js
var Vue = require('vue');
var VueResource = require('vue-resource');
var VueIdentity = require('vue-identity');

Vue.use(VueResource)
Vue.use(VueIdentity, options)
```

## Options

Here is a list of all available options that are passed to the plugin

| Option   	| Default value      | Description 						|
|-----------|------------------|---------------------------------|
| url | ``/api`` | Full or relative base url for auth requests	|
| loginUrl | ``/login`` | Name of the login endpoint. Ends up as url + loginUrl	|
| logoutUrl | ``/logout`` | Name of the logout endpoint. Ends up as url + logoutUrl	|
| refreshUrl |  ``/refresh`` | Name of the refresh endpoint. Ends up as url + refreshUrl	|
| unauthorizedRedirect | ``null`` | If set, vue-router will redirect here when unauthorized. Redirect only occurs between routes.	|
| accessToken | ``token`` | Verbage. The name of the accessToken returned by the api	|
| refreshToken |  ``refresh`` | Verbage. The name of the accessToken returned by the api	|
| scope |  ``null`` | Pass a scope to login in the query string	|
| redirect |  ``null`` | Pass a redirect location to login in the query string	|
