import Vue from 'vue'
import VueResource from 'vue-resource'
import VueIdentity from 'vue-identity'
import App from './components/App.vue'

Vue.use(VueResource)
Vue.use(VueIdentity,{
  url: "/api"
})

/* eslint-disable no-new */
new Vue({
  el: '#app',
  // replace the content of <div id="app"></div> with App
  render: h => h(App)
})
