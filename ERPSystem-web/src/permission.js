import Vue from 'vue'
import router from './router'
import store from './store'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style
import { USER_ID,INDEX_MAIN_PAGE_PATH } from '@/store/mutation-types'
import { generateIndexRouter } from "@/utils/util"

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = ['/user/login', '/user/register', '/user/register-result'] // no redirect whitelist

router.beforeEach((to, from, next) => {
  NProgress.start() // start progress bar
  if (Vue.ls.get(USER_ID)) {
    /* has token */
    if (to.path === '/' || to.path === '/user/login') {
      next({ path: INDEX_MAIN_PAGE_PATH })
      NProgress.done()
    } else {
      if (store.getters.permissionList.length === 0) {
        store.dispatch('GetPermissionList').then(res => {
          const menuData = res;
          if (menuData === null || menuData === "" || menuData === undefined) {
            return;
          }
          // CacheUserButtonPermission
          store.dispatch('GetUserBtnList').then(res => {
            Vue.ls.set('winBtnStrList', res.data.userBtn, 100 * 24 * 60 * 60 * 1000)
          })
          let constRoutes = [];
          constRoutes = generateIndexRouter(menuData);
          // 
          store.dispatch('UpdateAppRouter',  { constRoutes }).then(() => {
            // RootrolesPermission
            // 
            router.addRoutes(store.getters.addRouters)
            const redirect = decodeURIComponent(from.query.redirect || to.path)
            next({ path: redirect })
          })
        })
        .catch(() => {
          store.dispatch('Logout').then(() => {
            next({ path: '/user/login' })
          })
        })
      } else {
        if (to.path) {
          _hmt.push(['_trackPageview', '/#' + to.fullPath]);
        }
        next()
      }
    }
  } else {
    if (whiteList.indexOf(to.path) !== -1) {
      // Login，
      next()
    } else {
      next({ path: '/user/login' })
      NProgress.done() // if current page is login will not trigger afterEach hook, so manually handle it
    }
  }
})

router.afterEach(() => {
  NProgress.done() // finish progress bar
})
