import { USER_AUTH,SYS_BUTTON_AUTH } from "@/store/mutation-types"

const hasPermission = {
    install (Vue, options) {
        //console.log(options);
          Vue.directive('has', {
            inserted: (el, binding, vnode)=>{
                console.log("页面权限控制----");
                //console.time()
                //NodePermissionProcess，PermissionProcess
                if(!filterNodePermission(el, binding, vnode)){
                  filterGlobalPermission(el, binding, vnode);
                }
                //console.timeEnd() //
            }
          });
    }
};

/**
 * 流程节点Permission控制
 */
export function filterNodePermission(el, binding, vnode) {
  let permissionList = [];
  try {
    let obj = vnode.context.$props.formData;
    if (obj) {
      let bpmList = obj.permissionList;
      for (let bpm of bpmList) {
        if(bpm.type != '2') {
          permissionList.push(bpm);
        }
      }
    }else{
      return false;
    }
  } catch (e) {
    //console.log("PagePermissionException----", e);
  }
  if (permissionList === null || permissionList === "" || permissionList === undefined||permissionList.length<=0) {
    //el.parentNode.removeChild(el)
    return false;
  }

  console.log("流程节点页面权限--NODE--");
  let permissions = [];
  for (let item of permissionList) {
    if(item.type != '2') {
      permissions.push(item.action);
    }
  }
  //console.log("PagePermission----"+permissions);
  //console.log("PagePermission----"+binding.value);
  if (!permissions.includes(binding.value)) {
    //el.parentNode.removeChild(el)
    return false;
  }else{
    for (let item2 of permissionList) {
      if(binding.value === item2.action){
        return true;
      }
    }
  }
  return false;
}

/**
 * 全局Permission控制
 */
export function filterGlobalPermission(el, binding, vnode) {
  console.log("全局页面权限--Global--");

  let permissionList = [];
  let allPermissionList = [];

  //let authList = Vue.ls.get(USER_AUTH);
  let authList = JSON.parse(sessionStorage.getItem(USER_AUTH) || "[]");
  for (let auth of authList) {
    if(auth.type != '2') {
      permissionList.push(auth);
    }
  }
  //console.log("PagePermission--Global--",sessionStorage.getItem(SYS_BUTTON_AUTH));
  let allAuthList = JSON.parse(sessionStorage.getItem(SYS_BUTTON_AUTH) || "[]");
  for (let gauth of allAuthList) {
    if(gauth.type != '2') {
      allPermissionList.push(gauth);
    }
  }
  //SetConfigYesNoHas
  let invalidFlag = false;//None
  if(allPermissionList != null && allPermissionList != "" && allPermissionList != undefined && allPermissionList.length > 0){
    for (let itemG of allPermissionList) {
      if(binding.value === itemG.action){
        if(itemG.status == '0'){
          invalidFlag = true;
          break;
        }
      }
    }
  }
  if(invalidFlag){
    return;
  }
  if (permissionList === null || permissionList === "" || permissionList === undefined||permissionList.length<=0) {
    el.parentNode.removeChild(el);
    return;
  }
  let permissions = [];
  for (let item of permissionList) {
    if(item.type != '2'){
      permissions.push(item.action);
    }
  }
  if (!permissions.includes(binding.value)) {
    el.parentNode.removeChild(el);
  }
}

export default hasPermission;
