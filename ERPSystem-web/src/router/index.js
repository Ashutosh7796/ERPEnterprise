import Vue from 'vue'
import Router from 'vue-router'
import { constantRouterMap } from '@/config/router.config'

//update-begin-author:taoyan date:20191011 for:TASK #3214 【】onlineFunctionTest Exception
try {
  const originalPush = Router.prototype.push
  Router.prototype.push = function push(location) {
    return originalPush.call(this, location).catch(err => err)
  }
} catch (e) {
}
//update-end-author:taoyan date:20191011 for:TASK #3214 【】onlineFunctionTest Exception

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRouterMap
})