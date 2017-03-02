/**
  * vue-identity v0.0.3
  * (c) 2017 Matt Froese
  * @license MIT
  */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.VueIdentity = factory());
}(this, (function () { 'use strict';

/*jshint esversion: 6 */
function error(e) {
	var err = { code: -1, http: null };
	if (e.status !== undefined) {
		err.code = e.status;
		err.error = e.statusText;
		err.data = e.data ? e.data.errors : null;
		err.http = e;
		err.message = formatMessage(err);
	} else if (typeof e == "string") {
		err.message = err.error = e;
	} else {
		err.message = e.error = e.message;
	}
	console.error("[VueIdentity Error]", err);
	return Promise.reject(err)
}

function parseToken(token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace('-', '+').replace('_', '/');
  return JSON.parse(window.atob(base64))
}

function formatMessage(e) {
	// Custom
	if (e.error == 'Connection Issue') { return 'Could not connect' }
	if (e.error == 'Bad Request') { return 'Invalid data' }
	if (e.error == 'Token Expired') { return 'Token Expired' }
	// Standard http
	if (e.code == 500) { return 'Server Error' }
	if (e.code == 404) { return 'Not Found' }
	if (e.code == 403) { return 'Forbidden' }
	if (e.code == 401) { return 'Unauthorized' }
	return 'Unknown error'
}

var identity = {
  defaults: {
    url: '/api',
    loginUrl: '/login',
    logoutUrl: '/logout',
    refreshUrl: '/refresh',
    accessToken: 'token',
    refreshToken: 'refresh',
    unauthorizedRedirect: null,
    redirect: null,
    scope: null
  },
  install: function install(Vue, opts) {
    if (identity.installed) {
      return
    }
    // setup
    var vm = new Vue({
      data: {
        refreshToken: window.localStorage['vue-identity:refreshToken'],
        accessToken: null,
        expires: null,
        user: null,
        notBefore: null,
        issuedAt: null,
        loading: false,
        checking: false,
        expiryTimer: null
      },
      computed: {
        expiresIn: function expiresIn() {
          return this.expires ? (this.expires * 1000) - Date.now() : false
        }
      }
    });

    var self = Vue.prototype.$identity = vm;
    var options = Object.assign(identity.defaults, opts);

    var http = Vue.http;
    var router = opts.router;

    if (!http) {
      console.error('VueIdentity requires vue-resource. Make sure you Vue.use(VueResource) before Vue.use(VueIdentity)');
    }
    Vue.http.interceptors.push(function(request, next) {
      if( self.accessToken ) { request.headers.set('Authorization', 'Bearer ' + self.accessToken); }
      next();
    });
    if (!router) {
      console.info('To use with vue-router, pass it to me Vue.use(VueIdentity, {router})');
    } else {
      router.beforeEach(function (to, from, next) {
        var $identity = options.router.app.$identity;
        if (to.meta.identity && $identity.user === null) {
          $identity.authenticate().then(function() {
            next();
          }, function() {
            if (options.unauthorizedRedirect)
              { next({
                path: options.unauthorizedRedirect
              }); }
          });
        } else {
          next();
        }
      });
    }

    // bind events
    window.onfocus = function () {
      self.attemptRefresh();
    };

    // methods
    self.uri = function (endpoint) {
      return options.url + options[endpoint + 'Url']
    };
    self.authenticate = function () {
      // I have a valid access token = good
      if (self.isLoggedIn()) { return Promise.resolve() }

      // Attempt to get an access token if I have a refresh token
      // If refresh comes back as invalid, logout and call again to attempt loginWithCredentials
      if (self.refreshToken) { return self.refresh().catch(function (){ return self.authenticate(); }) }

      // Attempt to get access token with credentials (Cookie based auth)
      return self.loginWithCredentials()
    };
    // Login with fresh token
    self.refresh = function () {
      return self.attachRequestQuarterback(http.post(self.uri('refresh'), {
        token: self.refreshToken
      }))
    };
    // Login with data (username, password)
    self.login = function (data) {
      return self.attachRequestQuarterback(http.post(self.uri('login'), data, {
        credentials: true,
        params: params
      }))
    };
    // Cookie based login
    self.loginWithCredentials = function () {
      var params = {};
      if (options.scope) { params.scope = options.scope; }
      if (options.redirect) { params.redirect = options.redirect; }
      return self.attachRequestQuarterback(http.get(self.uri('login'), {
        credentials: true,
        params: params
      }))
    };
    self.logout = function () {
      delete localStorage['vue-identity:refreshToken'];
      self.refreshToken = null;
      self.accessToken = null;
      self.user = null;
      self.expires = null;
      self.issuedAt = null;
      self.notBefore = null;
      return Promise.resolve()
    };
    self.attachRequestQuarterback = function (promise) {
      self.loading = true;
      return promise.then(function (r) {
        self.receivethMightyToken(r.data);
        return Promise.resolve()
      }).catch(function (e) {
        self.logout();
        if (e.headers.get('X-Authentication-Location'))
          { window.location.href = e.headers.get('X-Authentication-Location'); }
        return error(e)
      }).finally(function () {
        self.loading = false;
      })
    };
    self.receivethMightyToken = function (tokenIsMightier) {
      var accessToken = tokenIsMightier[options.accessToken];
      var refreshToken = tokenIsMightier[options.refreshToken];
      if (accessToken == undefined) { return error('No token received') }
      var user = parseToken(accessToken);
      self.accessToken = accessToken;
      self.refreshToken = localStorage['vue-identity:refreshToken'] = refreshToken;
      self.user = user;
      self.expires = user.exp;
      self.issuedAt = user.iat;
      self.notBefore = user.nbf;
      self.attemptRefreshIn(self.expiresIn - 30000);
    };
    self.attemptRefreshIn = function (ms) {
      console.info("attemptRefreshIn", ms);
      clearTimeout(self.expiryTimer);
      self.expiryTimer = setTimeout(function () {
        self.attemptRefresh();
      }, ms);
    };
    self.attemptRefresh = function () {
      var expiresIn = (self.expires * 1000) - Date.now();
      console.info("attemptRefresh", expiresIn);

      if (self.tokenValid() && expiresIn <= 300000) {
        console.info("attemptRefresh tokenValid expiresIn <= 300000", expiresIn);
        self.refresh().catch(function () {
          clearInterval(self.expiryTimer);
        });
      }
    };
    self.isLoggedIn = function () {
      return self.tokenValid()
    };
    self.tokenValid = function () {
      return self.refreshToken && ((self.expires * 1000) - Date.now()) > 0
    };
  }
};

return identity;

})));
