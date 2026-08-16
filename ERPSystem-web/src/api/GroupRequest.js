import Vue from 'vue'

/**
 * 将一个Request分组
 *
 * @param getPromise 传入一个可以Get到Promise对象的方法
 * @param groupId 分组ID，如果不传或者for空则不分组
 * @param expire 过期Time，默认 半分钟
 */
export function httpGroupRequest(getPromise, groupId, expire = 1000 * 30) {
  if (groupId == null || groupId === '') {
    console.log("--------popup----------getFrom  DB-------with---no--groupId ")
    return getPromise()
  }

  if (Vue.ls.get(groupId)) {
    console.log("---------popup--------getFrom  Cache--------groupId = " + groupId)
    return Promise.resolve(Vue.ls.get(groupId));
  } else {
    console.log("--------popup----------getFrom  DB---------groupId = " + groupId)
  }

  // HasRequest，Request
  return getPromise().then(res => {
    Vue.ls.set(groupId, res, expire);
    return Promise.resolve(res);
  })
}


