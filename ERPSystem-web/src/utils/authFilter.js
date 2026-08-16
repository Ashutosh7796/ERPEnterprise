import { USER_AUTH,SYS_BUTTON_AUTH } from "@/store/mutation-types"

export function disabledAuthFilter(code,formData) {
  if(nodeDisabledAuth(code,formData)){
    return true;
  }else{
    return globalDisabledAuth(code);
  }
}

function nodeDisabledAuth(code,formData){
  console.log("页面权限禁用--NODE--开始");
  let permissionList = [];
  try {
    console.log("页面权限禁用--NODE--开始",formData);
    if (formData) {
      let bpmList = formData.permissionList;
      permissionList = bpmList.filter(item=>item.type=='2')
      // for (let bpm of bpmList) {
      //   if(bpm.type == '2') {
      //     permissionList.push(bpm);
      //   }
      // }
    }else{
      return false;
    }
  } catch (e) {
    //console.log("PagePermissionException----", e);
  }
  if (permissionList.length ==  0) {
    return false;
  }

  console.log("流程节点页面权限禁用--NODE--开始");
  let permissions = [];
  for (let item of permissionList) {
    if(item.type == '2') {
      permissions.push(item.action);
    }
  }
  //console.log("PagePermission----"+code);
  if (!permissions.includes(code)) {
    return false;
  }else{
    for (let item2 of permissionList) {
      if(code === item2.action){
        console.log("流程节点页面权限禁用--NODE--生效");
        return true;
      }
    }
  }
  return false;
}

function globalDisabledAuth(code){
  console.log("全局页面禁用权限--Global--开始");

  let permissionList = [];
  let allPermissionList = [];

  //let authList = Vue.ls.get(USER_AUTH);
  let authList = JSON.parse(sessionStorage.getItem(USER_AUTH) || "[]");
  for (let auth of authList) {
    if(auth.type == '2') {
      permissionList.push(auth);
    }
  }
  //console.log("PageDisablePermission--Global--",sessionStorage.getItem(SYS_BUTTON_AUTH));
  let allAuthList = JSON.parse(sessionStorage.getItem(SYS_BUTTON_AUTH) || "[]");
  for (let gauth of allAuthList) {
    if(gauth.type == '2') {
      allPermissionList.push(gauth);
    }
  }
  //SetConfigYesNoHas
  let  gFlag = false;//Disable
  let invalidFlag = false;//None
  if(allPermissionList != null && allPermissionList != "" && allPermissionList != undefined && allPermissionList.length > 0){
    for (let itemG of allPermissionList) {
      if(code === itemG.action){
        if(itemG.status == '0'){
          invalidFlag = true;
          break;
        }else{
          gFlag = true;
          break;
        }
      }
    }
  }
  if(invalidFlag){
    return false;
  }
  if (permissionList === null || permissionList === "" || permissionList === undefined||permissionList.length<=0) {
    return gFlag;
  }
  let permissions = [];
  for (let item of permissionList) {
    if(item.type == '2') {
      permissions.push(item.action);
    }
  }
  //console.log("PageDisablePermission----"+code);
  if (!permissions.includes(code)) {
    return gFlag;
  }else{
    for (let item2 of permissionList) {
      if(code === item2.action){
        console.log("全局页面权限解除禁用--Global--生效");
        gFlag = false;
      }
    }
    return gFlag;
  }
}



export function colAuthFilter(columns,pre) {
  let authList = getNoAuthCols(pre);
  const cols = columns.filter(item => {
    if (hasColoum(item,authList)) {
      return true
    }
    return false
  })
  return cols
}

/**
 * 【子表行编辑】实现两个Function：
 * 1、隐藏JEditableTable无Permission的字段
 * 2、DisableJEditableTable无Permission的字段
 * @param columns
 * @param pre
 * @returns {*}
 */
export function colAuthFilterJEditableTable(columns,pre) {
  let authList = getAllShowAndDisabledAuthCols(pre);
  const cols = columns.filter(item => {
    let oneAuth = authList.find(auth => {
      return auth.action === pre + item.key;
    });
    if(!oneAuth){
      return true
    }

    //Process，PreventAuthorizeIdentifier，Config
    if(oneAuth instanceof Array){
      oneAuth = oneAuth[0]
    }

    //DisableLogic
    if (oneAuth.type == '2' && !oneAuth.isAuth) {
      item["disabled"] = true
      return true
    }
    //HideLogicLogic
    if (oneAuth.type == '1' && !oneAuth.isAuth) {
      return false
    }
    return true
  })
  return cols
}


function hasColoum(item,authList){
  if (authList.includes(item.dataIndex)) {
    return false
  }
  return true
}

//PermissionNonedo，Has，Can only DisplayDisplay
//RootAuthorizeGetNotAuthorizeInfo
function getNoAuthCols(pre){
  let permissionList = [];
  let allPermissionList = [];

  //let authList = Vue.ls.get(USER_AUTH);
  let authList = JSON.parse(sessionStorage.getItem(USER_AUTH) || "[]");
  for (let auth of authList) {
    //Display，HasStatus
    if(auth.type == '1'&&startWith(auth.action,pre)) {
      permissionList.push(substrPre(auth.action,pre));
    }
  }
  //console.log("PageDisablePermission--Global--",sessionStorage.getItem(SYS_BUTTON_AUTH));
  let allAuthList = JSON.parse(sessionStorage.getItem(SYS_BUTTON_AUTH) || "[]");
  for (let gauth of allAuthList) {
    //Display，HasStatus
    if(gauth.type == '1'&&gauth.status == '1'&&startWith(gauth.action,pre)) {
      allPermissionList.push(substrPre(gauth.action,pre));
    }
  }
  const cols = allPermissionList.filter(item => {
    if (permissionList.includes(item)) {
      return false;
    }
    return true;
  })
  return cols;
}



/**
 * 额外增加方法【用于行编辑组件】
 * date: 2020-04-05
 * author: scott
 * @param pre
 * @returns {*[]}
 */
function getAllShowAndDisabledAuthCols(pre){
  //UserHasPermission
  let userAuthList = JSON.parse(sessionStorage.getItem(USER_AUTH) || "[]");
  //AllPermissionConfig
  let allAuthList = JSON.parse(sessionStorage.getItem(SYS_BUTTON_AUTH) || "[]");

  let newAllAuthList = allAuthList.map(function (item, index) {
    let hasAuthArray = userAuthList.filter(u => u.action===item.action );
    if (hasAuthArray && hasAuthArray.length>0) {
      item["isAuth"] = true
    }
    return item;
  })

  return newAllAuthList;
}

function startWith(str,pre) {
  if (pre == null || pre == "" || str==null|| str==""|| str.length == 0 || pre.length > str.length)
    return false;
  if (str.substr(0, pre.length) == pre)
    return true;
  else
    return false;
}

function substrPre(str,pre) {
  return str.substr(pre.length);
}