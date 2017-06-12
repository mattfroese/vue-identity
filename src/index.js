import {
  error,
  parseToken
} from './util'

const identity = {
  defaults: {
    url: '/api',
    loginUrl: '/login',
    refreshUrl: '/refresh',
    accessToken: 'token',
    refreshToken: 'refresh',
    autoRefresh: true,
    unauthorizedRedirect: null,
    redirect: null,
    scope: null
  },
  install(Vue, opts) {
    if (identity.installed) {
      return
    }
    // setup
    let vm = new Vue({
      data: {
        refreshToken: window.localStorage['vue-identity:refresh-token'],
        accessToken: null,
        expires: null,
        user: null,
        notBefore: null,
        issuedAt: null,
        loading: false
      },
      computed: {
        expiresIn() {
          return this.expires ? (this.expires * 1000) - Date.now() : false
        }
      }
    })

    let self = Vue.prototype.$identity = vm
    let options = Object.assign(identity.defaults, opts)

    let http = Vue.http
    let router = opts.router

    if (!http) {
      console.error('VueIdentity requires vue-resource. Make sure you Vue.use(VueResource) before Vue.use(VueIdentity)')
    }
    Vue.http.interceptors.push(function(request, next) {
      if(request.url === self.uri('login') || request.url === self.uri('refresh')) {
        return next()
      } else {
        self.authenticate({ preventRedirect: true }).then(() => {
          request.headers.set('Authorization', 'Bearer ' + self.accessToken)
          next()
        })
      }
    })
    if (!router) {
      console.info('To use with vue-router, pass it to me Vue.use(VueIdentity, {router})')
    } else {
      router.beforeEach((to, from, next) => {
        if (to.meta.identity && self.isLoggedIn() === false) {
          self.authenticate().then(function() {
            next()
          }, function() {
            if (options.unauthorizedRedirect)
              next({
                path: options.unauthorizedRedirect
              })
          })
        } else {
          next()
        }
      })
    }

    // methods
    self.uri = (endpoint) => {
      return options.url + options[endpoint + 'Url']
    }
    self.authenticate = (options) => {
      // I have a valid access token = good
      if (self.isLoggedIn()) return Promise.resolve()

      // Attempt to get an access token if I have a refresh token
      // If refresh comes back as invalid, logout and call myself again
      if (self.refreshToken) return self.refresh().catch(() => self.authenticate())

      // Attempt to get access token with credentials (Cookie based auth)
      let params = {}
      if (options && options.scope) params.scope = options.scope
      if (options && options.redirect) params.redirect = options.redirect
      return self.request(http.get(self.uri('login'), {
        credentials: true, // attempt with http cookies
        params: params
      }), opts)
    }
    // Login with fresh token
    self.refresh = () => {
      return self.request(http.post(self.uri('refresh'), {
        token: self.refreshToken
      }))
    }
    // Login with data (username, password)
    self.login = (data) => {
      let params = {}
      if (options && options.scope) params.scope = options.scope
      if (options && options.redirect) params.redirect = options.redirect
      return self.request(http.post(self.uri('login'), data, {
        credentials: true,
        params: params
      }))
    }
    self.logout = () => {
      delete localStorage['vue-identity:refresh-token']
      self.refreshToken = null
      self.accessToken = null
      self.user = null
      self.expires = null
      self.issuedAt = null
      self.notBefore = null
      return Promise.resolve()
    }
    self.request = (promise, opts) => {
      opts = opts || {}
      self.loading = true
      return promise.then((r) => {
        return self.receive(r.data)
      }).catch((e) => {
        self.logout()
        if (e.headers&&e.headers.get('X-Authentication-Location') && !opts.preventRedirect)
          window.location.href = e.headers.get('X-Authentication-Location')
        return Promise.reject(error(e))
      }).finally(() => {
        self.loading = false
      })
    }
    self.receive = (response) => {
      let accessToken = response[options.accessToken]
      let refreshToken = response[options.refreshToken]
      if (accessToken == undefined) return Promise.reject(error('No token received'))
      let user = parseToken(accessToken)
      self.accessToken = accessToken
      self.refreshToken = localStorage['vue-identity:refresh-token'] = refreshToken
      self.user = user
      self.expires = user.exp
      self.issuedAt = user.iat
      self.notBefore = user.nbf
      if( self.refreshToken && options.autoRefresh ) {
        self.autoRefresh()
      }
      return Promise.resolve()
    }
    self.autoRefresh = () => {
      if( !self.refreshToken ) return false
      let expiresIn = (self.expires * 1000) - Date.now()
      console.info("autoRefresh enabled, will refresh in", expiresIn)
      setTimeout( self.refresh, expiresIn )
    }
    self.isLoggedIn = () => {
      return self.tokenValid()
    }
    self.tokenValid = () => {
      return !!self.accessToken && ((self.expires * 1000) - Date.now()) > 0
    }
  }
}
export default identity
