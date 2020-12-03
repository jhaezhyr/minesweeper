import Vue from 'vue'
import App from './App.vue'
import router from './router'
const extras = require('../public/extras.js');
//import '../public/extras.js';

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App),
  data: extras/*,
  mounted() {
    let externalScript = document.createElement('script');
    externalScript.setAttribute('src', '../../public/extras.js');
    document.head.appendChild(externalScript);
  }*/
}).$mount('#app')
