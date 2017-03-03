import {
  error,
  parseToken
} from './util'

const identity = {
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
  install(Vue, opts) {
    if (identity.installed) {
      return
    }
    // setup
    let vm = new Vue({
      data: {
        refreshToken: window.localStorage['vue-identity:refreshToken'],
        accessToken: null,
        expires: null,
        user: null,
        notBefore: null,
        issuedAt: null,
        loading: false,
        checking: false
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
      if( self.accessToken ) request.headers.set('Authorization', 'Bearer ' + self.accessToken)
      next()
    })
    if (!router) {
      console.info('To use with vue-router, pass it to me Vue.use(VueIdentity, {router})')
    } else {
      router.beforeEach((to, from, next) => {
        let $identity = options.router.app.$identity
        if (to.meta.identity && $identity.user === null) {
          $identity.authenticate().then(function() {
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
    self.authenticate = () => {
      // I have a valid access token = good
      if (self.isLoggedIn()) return Promise.resolve()

      // Attempt to get an access token if I have a refresh token
      // If refresh comes back as invalid, logout and call again to attempt loginWithCredentials
      if (self.refreshToken) return self.refresh().catch(() => self.authenticate())

      // Attempt to get access token with credentials (Cookie based auth)
      return self.loginWithCredentials()
    }
    // Login with fresh token
    self.refresh = () => {
      return self.attachRequestQuarterback(http.post(self.uri('refresh'), {
        token: self.refreshToken
      }))
    }
    // Login with data (username, password)
    self.login = (data) => {
      return self.attachRequestQuarterback(http.post(self.uri('login'), data, {
        credentials: true,
        params: params
      }))
    }
    // Cookie based login
    self.loginWithCredentials = () => {
      let params = {}
      if (options.scope) params.scope = options.scope
      if (options.redirect) params.redirect = options.redirect
      return self.attachRequestQuarterback(http.get(self.uri('login'), {
        credentials: true,
        params: params
      }))
    }
    self.logout = () => {
      delete localStorage['vue-identity:refreshToken']
      self.refreshToken = null
      self.accessToken = null
      self.user = null
      self.expires = null
      self.issuedAt = null
      self.notBefore = null
      return Promise.resolve()
    }
    self.attachRequestQuarterback = (promise) => {
      self.loading = true
      return promise.then((r) => {
        self.receivethMightyToken(r.data)
        return Promise.resolve()
      }).catch((e) => {
        self.logout()
        if (e.headers.get('X-Authentication-Location'))
          window.location.href = e.headers.get('X-Authentication-Location')
        return error(e)
      }).finally(() => {
        self.loading = false
      })
    }
    self.receivethMightyToken = (tokenIsMightier) => {
      let accessToken = tokenIsMightier[options.accessToken]
      let refreshToken = tokenIsMightier[options.refreshToken]
      if (accessToken == undefined) return error('No token received')
      let user = parseToken(accessToken)
      self.accessToken = accessToken
      self.refreshToken = localStorage['vue-identity:refreshToken'] = refreshToken
      self.user = user
      self.expires = user.exp
      self.issuedAt = user.iat
      self.notBefore = user.nbf
    }
    self.attemptRefresh = () => {
      let expiresIn = (self.expires * 1000) - Date.now()
      console.info("attemptRefresh", expiresIn)

      if (self.tokenValid() && expiresIn <= 300000) {
        console.info("attemptRefresh tokenValid expiresIn <= 300000", expiresIn)
        return self.refresh()
      }
    }
    self.isLoggedIn = () => {
      return self.tokenValid()
    }
    self.tokenValid = () => {
      return self.accessToken && ((self.expires * 1000) - Date.now()) > 0
    }
  }
}
export default identity
