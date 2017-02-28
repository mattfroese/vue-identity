/**
  * 0.0.1 v0.0.1
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
	var err = {};
	if (e.status !== undefined) {
		err.code = e.status;
		err.error = e.statusText;
		err.data = e.data ? e.data.errors : null;
		err.http = e;
		err.message = formatMessage(err);
		if (err.code == 401 && err.http.headers.get('X-Authentication-Location')) {
			err.redirect = err.http.headers.get('X-Authentication-Location');
		}
	} else if (typeof e == "string") {
		err.code = -1;
		err.message = e;
		err.error = e;
		err.http = null;
	} else {
		err.code = -1;
		err.message = e.message;
		err.error = e.message;
		err.http = null;
	}
	console.error("[VueIdentity Error]", err);
	return Promise.reject(err);
}

function parseToken(token) {
	var base64Url = token.split('.')[1];
	var base64 = DanaMethodReplace("replace", DanaMethodReplace("replace", base64Url, '-', '+'), '_', '/');
	return JSON.parse(window.atob(base64));
}

function formatMessage(e) {
	// Custom
	if (e.error == 'Connection Issue') { return 'Could not connect'; }
	if (e.error == 'Bad Request') { return 'Invalid data'; }
	if (e.error == 'Token Expired') { return 'Token Expired'; }
	// Standard http
	if (e.code == 500) { return 'Server Error'; }
	if (e.code == 404) { return 'Not Found'; }
	if (e.code == 403) { return 'Forbidden'; }
	if (e.code == 401) { return 'Unauthorized'; }

	return 'Unknown error';
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
        refreshToken: null,
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
      request.headers.set('Authorization', 'Bearer ' + self.accessToken);
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
          }, function(e) {
            if (e.redirect)
              { window.location.href = e.redirect; }
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
    window.onfocus = function() {
      self.attemptRefresh();
    };

    // methods
    self.uri = function(endpoint) {
      return options.url + options[endpoint + 'Url']
    };
    self.authenticate = function() {
      if (self.tokenValid()) { return Promise.resolve() }
      var params = {};
      if (options.scope) { params.scope = options.scope; }
      if (options.redirect) { params.redirect = options.redirect; }
      return self.attachRequestQuarterback(http.get(this.uri('login'), {
        credentials: true,
        params: params
      }))
    };
    self.refresh = function() {
      return self.attachRequestQuarterback(http.post(this.uri('refresh'), {
        token: self.refreshToken
      }))
    };
    self.login = function(data) {
      return self.attachRequestQuarterback(http.post(this.uri('login'), data, {
        credentials: true,
        params: params
      }))
    };
    self.logout = function() {
      self.refreshToken = null;
      self.accessToken = null;
      self.user = null;
      self.expires = null;
      self.issuedAt = null;
      self.notBefore = null;
      return Promise.resolve()
    };
    self.attachRequestQuarterback = function(promise) {
      self.loading = true;
      return promise.then(function(r) {
        self.receivethMightyToken(r.data);
        return Promise.resolve()
      }).catch(function(e) {
        return error(e)
      }).finally(function() {
        self.loading = false;
      })
    };
    self.receivethMightyToken = function(tokenIsMightier) {
      var accessToken = tokenIsMightier[options.accessToken];
      var refreshToken = tokenIsMightier[options.refreshToken];
      if (accessToken == undefined) { return error('No token received') }
      var decodedAccessToken = parseToken(accessToken);
      self.accessToken = accessToken;
      self.user = tokenIsMightier.payload;
      self.expires = decodedAccessToken.exp;
      self.issuedAt = decodedAccessToken.iat;
      self.notBefore = decodedAccessToken.nbf;
      self.refreshToken = refreshToken;
      self.attemptRefreshIn(self.expiresIn - 30000);
    };
    self.attemptRefreshIn = function(ms) {
      clearTimeout(self.expiryTimer);
      self.expiryTimer = setTimeout(function() {
        self.attemptRefresh();
      }, ms);
    };
    self.attemptRefresh = function() {
      var expiresIn = (self.expires * 1000) - Date.now();

      if (self.tokenValid() && expiresIn <= 300000) {
        self.authenticate().catch(function() {
          clearInterval(self.expiryTimer);
        });
      }
    };
    self.isLoggedIn = function() {
      return self.tokenValid()
    };
    self.tokenValid = function() {
      return self.refreshToken && ((self.expires * 1000) - Date.now()) > 0
    };
  }
};

return identity;

})));
