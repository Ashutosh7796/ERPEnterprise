import Vue from 'vue'
import { login, logout } from "@/api/login"
import { ACCESS_TOKEN, USER_NAME,USER_INFO,UI_CACHE_DB_DICT_DATA,USER_ID,USER_LOGIN_NAME,CACHE_INCLUDED_ROUTES } from "@/store/mutation-types"
import { welcome } from "@/utils/util"
import { queryPermissionsByUser, getUserBtnByCurrentUser } from '@/api/api'
import { getAction } from '@/api/manage'

const user = {
  state: {
    token: '',
    username: '',
    realname: '',
    welcome: '',
    avatar: '',
    permissionList: [],
    info: {}
  },

  mutations: {
    SET_TOKEN: (state, token) => {
      state.token = token
    },
    SET_NAME: (state, { username, realname, welcome }) => {
      state.username = username
      state.realname = realname
      state.welcome = welcome
    },
    SET_AVATAR: (state, avatar) => {
      state.avatar = avatar
    },
    SET_PERMISSIONLIST: (state, permissionList) => {
      state.permissionList = permissionList
    },
    SET_INFO: (state, info) => {
      state.info = info
    },
  },

  actions: {
    // CASLogin
    ValidateLogin({ commit }, userInfo) {
      return new Promise((resolve, reject) => {
        getAction("/cas/client/validateLogin",userInfo).then(response => {
          console.log("----cas 登录--------",response);
          if(response.success){
            const result = response.result
            const userInfo = result.userInfo
            Vue.ls.set(ACCESS_TOKEN, result.token, 7 * 24 * 60 * 60 * 1000)
            Vue.ls.set(USER_NAME, userInfo.username, 7 * 24 * 60 * 60 * 1000)
            Vue.ls.set(USER_INFO, userInfo, 7 * 24 * 60 * 60 * 1000)
            commit('SET_TOKEN', result.token)
            commit('SET_INFO', userInfo)
            commit('SET_NAME', { username: userInfo.username,realname: userInfo.realname, welcome: welcome() })
            commit('SET_AVATAR', userInfo.avatar)
            resolve(response)
          }else{
            resolve(response)
          }
        }).catch(error => {
          reject(error)
        })
      })
    },
    // Login
    Login({ commit }, userInfo) {
      return new Promise((resolve, reject) => {
        login(userInfo).then(response => {
          if(response.code === 200){
            if(response.data.msgTip === 'user can login'){
              const result = response.data
              Vue.ls.set(USER_ID, result.user.id, 7 * 24 * 60 * 60 * 1000);
              Vue.ls.set(USER_LOGIN_NAME, result.user.loginName, 7 * 24 * 60 * 60 * 1000);
              //7Has，Default1，OnlyUser1HasPage7
              Vue.ls.set(ACCESS_TOKEN, result.token, 7 * 24 * 60 * 60 * 1000)
              Vue.ls.set(USER_INFO, result.user, 7 * 24 * 60 * 60 * 1000)
              commit('SET_TOKEN', result.token)
            }
            commit('SET_INFO', userInfo)
            resolve(response)
          } else{
            resolve(response)
          }
        }).catch(error => {
          reject(error)
        })
      })
    },
    // Get user profile
    GetPermissionList({ commit }) {
      return new Promise((resolve, reject) => {
        //let v_token = Vue.ls.get(ACCESS_TOKEN);
        let params = {pNumber:0,userId: Vue.ls.get(USER_ID)};
        queryPermissionsByUser(params).then(response => {
          const menuData = response;
          if (menuData && menuData.length > 0) {
            commit('SET_PERMISSIONLIST', menuData)
          } else {
            reject('getPermissionList: permissions must be a non-null array !')
          }
          resolve(response)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // GetUserButtonPermission
    GetUserBtnList({ commit }) {
      return new Promise((resolve, reject) => {
        getUserBtnByCurrentUser().then(response => {
          resolve(response)
        }).catch(error => {
          reject(error)
        })
      })
    },

    // 
    Logout({ commit, state }) {
      return new Promise((resolve) => {
        //let logoutToken = state.token;
        commit('SET_TOKEN', '')
        commit('SET_PERMISSIONLIST', [])
        Vue.ls.remove(USER_ID)
        Vue.ls.remove(USER_LOGIN_NAME)
        Vue.ls.remove(USER_INFO)
        Vue.ls.remove(UI_CACHE_DB_DICT_DATA)
        Vue.ls.remove(CACHE_INCLUDED_ROUTES)
        logout().then(() => {
          resolve()
        }).catch(() => {
          resolve()
        })
      })
    },
    // Login
    ThirdLogin({ commit }, token) {
      return new Promise((resolve, reject) => {
        thirdLogin(token).then(response => {
          if(response.code =='200'){
            const result = response.result
            const userInfo = result.userInfo
            Vue.ls.set(ACCESS_TOKEN, result.token, 7 * 24 * 60 * 60 * 1000)
            Vue.ls.set(USER_NAME, userInfo.username, 7 * 24 * 60 * 60 * 1000)
            Vue.ls.set(USER_INFO, userInfo, 7 * 24 * 60 * 60 * 1000)
            commit('SET_TOKEN', result.token)
            commit('SET_INFO', userInfo)
            commit('SET_NAME', { username: userInfo.username,realname: userInfo.realname, welcome: welcome() })
            commit('SET_AVATAR', userInfo.avatar)
            resolve(response)
          }else{
            reject(response)
          }
        }).catch(error => {
          reject(error)
        })
      })
    },

  }
}

export default user