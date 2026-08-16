import { isURL } from '@/utils/validate'
import { downFilePost} from '@/api/manage'
import Vue from 'vue'
import introJs from 'intro.js'

export function timeFix() {
  const time = new Date()
  const hour = time.getHours()
  return hour < 9 ? '早上好' : (hour <= 11 ? '上午好' : (hour <= 13 ? '中午好' : (hour < 20 ? '下午好' : '晚上好')))
}

export function welcome() {
  const arr = ['休息一会儿吧', '准备吃什么呢?', '要不要打一把 DOTA', '我猜你可能累了']
  let index = Math.floor((Math.random()*arr.length))
  return arr[index]
}

/**
 * 触发 window.resize
 */
export function triggerWindowResizeEvent() {
  let event = document.createEvent('HTMLEvents')
  event.initEvent('resize', true, true)
  event.eventType = 'message'
  window.dispatchEvent(event)
}

/**
 * 过滤对象中for空的属性
 * @param obj
 * @returns {*}
 */
export function filterObj(obj) {
  if (!(typeof obj == 'object')) {
    return;
  }

  for ( let key in obj) {
    if (obj.hasOwnProperty(key)
      && (obj[key] == null || obj[key] == undefined || obj[key] === '')) {
      delete obj[key];
    }
  }
  return obj;
}

/**
 * Time格式化
 * @param value
 * @param fmt
 * @returns {*}
 */
export function formatDate(value, fmt) {
  let regPos = /^\d+(\.\d+)?$/;
  if(regPos.test(value)){
    //Yes
    let getDate = new Date(value);
    let o = {
      'M+': getDate.getMonth() + 1,
      'd+': getDate.getDate(),
      'h+': getDate.getHours(),
      'm+': getDate.getMinutes(),
      's+': getDate.getSeconds(),
      'q+': Math.floor((getDate.getMonth() + 3) / 3),
      'S': getDate.getMilliseconds()
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (getDate.getFullYear() + '').substr(4 - RegExp.$1.length))
    }
    for (let k in o) {
      if (new RegExp('(' + k + ')').test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)))
      }
    }
    return fmt;
  }else{
    //TODO
    value = value.trim();
    return value.substr(0,fmt.length);
  }
}

// 
export function generateIndexRouter(data) {
  let indexRouter = generateChildRouters(data)
  indexRouter.splice(0,0, {
    path: '/',
    name: '首页',
    component: () => import('@/components/layouts/TabLayout'),
    meta: {
      title: '首页',
      icon: 'icon-present',
      url: '/dashboard/analysis'
    },
    redirect: '/dashboard/analysis'
  })
  return indexRouter;
}

// （Child）

function generateChildRouters (data) {
  const routers = [];
  for (let item of data) {
    let componentPath = "";
    item.route = "1";
    if(item.component.indexOf("layouts")>=0){
      componentPath = () => import('@/components'+item.component);
    } else {
      componentPath = () => import('@/views'+item.component);
    }
    // eslint-disable-next-line
    let URL = (item.url|| '').replace(/{{([^}}]+)?}}/g, (s1, s2) => eval(s2)) // URLSupport{{ window.xxx }}
    if (isURL(URL)) {
      item.url = URL;
    }
    let componentName =''
    if(item.component) {
      let index = item.component.lastIndexOf("\/");
      componentName = item.component.substring(index + 1, item.component.length);
    }
    let menu = {
      path: item.url,
      name: item.text,
      meta: {
        id: item.id,
        title: item.text,
        icon: item.icon,
        url: item.url,
        componentName:componentName,
        internalOrExternal:true,
        keepAlive: true
      }
    }
    if(item.component.indexOf("IframePageView")>-1){
      //iframePage
      menu.iframeComponent = componentPath
    } else {
      menu.component = componentPath
    }
    if (item.children && item.children.length > 0) {
      menu.children = [...generateChildRouters( item.children)];
    }
    //--update-begin----author:scott---date:20190320------for:RootMenuConfig，CheckYesNoMenuField，YesNo（forSupportParametersURLMenu）------
    //CheckYesNo
    if(item.route && item.route === '0'){
      //console.log('  item.route：  '+item.route);
      //console.log('  item.path：  '+item.path);
    }else{
      routers.push(menu);
    }
    //--update-end----author:scott---date:20190320------for:RootMenuConfig，CheckYesNoMenuField，YesNo（forSupportParametersURLMenu）------
  }
  return routers
}

/**
 * 深度克隆对象、数组
 * @param obj 被克隆的对象
 * @return 克隆后的对象
 */
export function cloneObject(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Random生成数字
 *
 * 示例：生成长度for 12 的Random数：randomNumber(12)
 * 示例：生成 3~23 之间的Random数：randomNumber(3, 23)
 *
 * @param1 最小值 | 长度
 * @param2 最大值
 * @return int 生成后的数字
 */
export function randomNumber() {
  //     Random
  const random = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }
  if (arguments.length === 1) {
    let [length] = arguments
  // Random，Yes 0
    let nums = [...Array(length).keys()].map((i) => (i > 0 ? random(0, 9) : random(1, 9)))
    return parseInt(nums.join(''))
  } else if (arguments.length >= 2) {
    let [min, max] = arguments
    return random(min, max)
  } else {
    return Number.NaN
  }
}

/**
 * Random生成字符串
 * @param length 字符串的长度
 * @param chats 可选字符串区间（只会生成传入的字符串中的字符）
 * @return string 生成的字符串
 */
export function randomString(length, chats) {
  if (!length) length = 1
  if (!chats) chats = '0123456789qwertyuioplkjhgfdsazxcvbnm'
  let str = ''
  for (let i = 0; i < length; i++) {
    let num = randomNumber(0, chats.length - 1)
    str += chats[num]
  }
  return str
}

/**
 * Random生成uuid
 * @return string 生成的uuid
 */
export function randomUUID() {
  let chats = '0123456789abcdef'
  return randomString(32, chats)
}

/**
 * 下划线转驼峰
 * @param string
 * @returns {*}
 */
export function underLine2CamelCase(string){
  return string.replace( /_([a-z])/g, function( all, letter ) {
    return letter.toUpperCase();
  });
}

/**
 * 判断是否显示办理Button
 * @param bpmStatus
 * @returns {*}
 */
export function showDealBtn(bpmStatus){
  if(bpmStatus!="1"&&bpmStatus!="3"&&bpmStatus!="4"){
    return true;
  }
  return false;
}

/**
 * 增强CSS，可以在页面上输出全局css
 * @param css 要增强的css
 * @param id style标签的id，可以用来清除旧样式
 */
export function cssExpand(css, id) {
  let style = document.createElement('style')
  style.type = "text/css"
  style.innerHTML = `@charset "UTF-8"; ${css}`
  // Old
  if (id) {
    let $style = document.getElementById(id)
    if ($style != null) $style.outerHTML = ''
    style.id = id
  }
  // New
  document.head.appendChild(style)
}


/** js，JS， */
// options Parameters：
//    Parameters         Type            
//    vm             VueComponent    vue
//    event          Object          eventObject
//    jsCode         String          Pendingjs
//    errorMessage   String          Notice（）
export function jsExpand(options = {}) {

  // BindwindowkeyName
  let windowKeyName = 'J_CLICK_EVENT_OPTIONS'
  if (typeof window[windowKeyName] != 'object') {
    window[windowKeyName] = {}
  }

  // RandomJSid，Prevent
  let id = randomString(16, 'qwertyuioplkjhgfdsazxcvbnm'.toUpperCase())
  // Button
  let code = `
    (function (o_${id}) {
      try {
        (function (globalEvent, vm) {
          ${options.jsCode}
        })(o_${id}.event, o_${id}.vm)
      } catch (e) {
        o_${id}.error(e)
      }
      o_${id}.done()
    })(window['${windowKeyName}']['EVENT_${id}'])
  `
  // script
  const script = document.createElement('script')
  // NeedsParameterswindowObject
  window[windowKeyName]['EVENT_' + id] = {
    vm: options.vm,
    event: options.event,
    // Finished，None
    done() {
      // DeleteAdd script （Already）
      script.outerHTML = ''
      delete window[windowKeyName]['EVENT_' + id]
    },
    // js
    error(e) {
      console.group(`${options.errorMessage || '用户自定义JS增强代码运行出错'}（${new Date()}）`)
      console.error(e)
      console.groupEnd()
    }
  }
  // document
  script.innerHTML = code
  document.body.appendChild(script)
}

/**
 * 如果值不存在就 push 进数组，反之不处理
 * @param array 要操作的数据
 * @param value 要添加的值
 * @param key 可空，如果比较的是对象，可能存在地址不一样但值实际上是一样的情况，可以传此字段判断对象中唯一的字段，例如 id。不传则直接比较实际值
 * @returns {boolean} Success push 返回 true，不处理返回 false
 */
export function pushIfNotExist(array, value, key) {
  for (let item of array) {
    if (key && (item[key] === value[key])) {
      return false
    } else if (item === value) {
      return false
    }
  }
  array.push(value)
  return true
}

/**
 * 可用于判断是否Success
 * @type {symbol}
 */
export const succeedSymbol = Symbol()
/**
 * 可用于判断是否Failed
 * @type {symbol}
 */
export const failedSymbol = Symbol()

/**
 * 使 promise 无论如何都会 resolve，除非传入的Parameters不是一个Promise对象或返回Promise对象的方法
 * 一般用在 Promise.all 中
 *
 * @param promise 可传Promise对象或返回Promise对象的方法
 * @returns {Promise<any>}
 */
export function alwaysResolve(promise) {
  return new Promise((resolve, reject) => {
    let p = promise
    if (typeof promise === 'function') {
      p = promise()
    }
    if (p instanceof Promise) {
      p.then(data => {
        resolve({ type: succeedSymbol, data })
      }).catch(error => {
        resolve({ type: failedSymbol, error })
      })
    } else {
      reject('alwaysResolve: 传入的参数不是一个Promise对象或返回Promise对象的方法')
    }
  })
}

/**
 * 简单实现防抖方法
 *
 * 防抖(debounce)函数在第一次触发给定的函数时，不立即执行函数，而是给出一个期限值(delay)，比如100ms。
 * 如果100ms内再次执行函数，就重新开始计时，直到计时结束后再真正执行函数。
 * 这样do的好处是如果短Time内大量触发同一事件，只会执行一次函数。
 *
 * @param fn 要防抖的函数
 * @param delay 防抖的毫秒数
 * @returns {Function}
 */
export function simpleDebounce(fn, delay = 100) {
  let timer = null
  return function () {
    let args = arguments
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      fn.apply(null, args)
    }, delay)
  }
}

/**
 * 不用正则的方式替换所有值
 * @param text 被替换的字符串
 * @param checker  替换前的内容
 * @param replacer 替换后的内容
 * @returns {String} 替换后的字符串
 */
export function replaceAll(text, checker, replacer) {
  let lastText = text
  text = text.replace(checker, replacer)
  if (lastText !== text) {
    return replaceAll(text, checker, replacer)
  }
  return text
}

/**
 * 转换Material / Product扩展字段的格式
 * @param thisRows
 * @param checker
 * @param replacer
 * @returns {string}
 */
export function getMpListShort(thisRows, checker, replacer) {
  let mPropertyListShort = ''
  let anotherNameStr = ''
  for (let i = 0; i < thisRows.length; i++) {
    anotherNameStr += thisRows[i].anotherName + ",";
  }
  if (anotherNameStr) {
    mPropertyListShort = anotherNameStr.substring(0, anotherNameStr.length - 1);
  }
  return mPropertyListShort
}

/**
 * jsGet当前年份， 格式“yyyy”
 */
export function getNowFormatYear() {
  let date = new Date();
  return date.getFullYear();
}

/**
 * jsGet当前月份， 格式“yyyy-MM”
 */
export function getNowFormatMonth() {
  let date = new Date();
  let seperator1 = "-";
  let month = date.getMonth() + 1;
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  return date.getFullYear() + seperator1 + month;
}

/**
 * jsGet当前Date， 格式“yyyy-MM-dd”
 */
export function getFormatDate() {
  let date = new Date();
  let seperator1 = "-";
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let strDate = date.getDate();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  return year + seperator1 + month + seperator1 + strDate;
}

/**
 * jsGet当前Time， 格式“yyyy-MM-dd HH:MM:SS”
 */
export function getNowFormatDateTime() {
  let date = new Date();
  let seperator1 = "-";
  let seperator2 = ":";
  let month = date.getMonth() + 1;
  let strDate = date.getDate();
  let strHours = date.getHours();
  let strMinutes = date.getMinutes();
  let strSeconds = date.getSeconds();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  if (strHours >= 0 && strHours <= 9) {
    strHours = "0" + strHours;
  }
  if (strMinutes >= 0 && strMinutes <= 9) {
    strMinutes = "0" + strMinutes;
  }
  if (strSeconds >= 0 && strSeconds <= 9) {
    strSeconds = "0" + strSeconds;
  }
  return date.getFullYear() + seperator1 + month + seperator1 + strDate
    + " " + strHours + seperator2 + strMinutes
    + seperator2 + strSeconds;
}

/**
 * jsGet当前Time， 格式“yyyyMMddHHMMSS”
 */
export function getNowFormatStr() {
  let date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let strDate = date.getDate();
  let strHours = date.getHours();
  let strMinutes = date.getMinutes();
  let strSeconds = date.getSeconds();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  if (strHours >= 0 && strHours <= 9) {
    strHours = "0" + strHours;
  }
  if (strMinutes >= 0 && strMinutes <= 9) {
    strMinutes = "0" + strMinutes;
  }
  if (strSeconds >= 0 && strSeconds <= 9) {
    strSeconds = "0" + strSeconds;
  }
  return year +''+ month +''+ strDate +''+ strHours +''+ strMinutes +''+ strSeconds;
}

/**
 * jsGetN天前的Date， 格式“yyyy-MM-dd”
 */
export function getBeforeFormatDate(day) {
  let currentDate = new Date();
  let thirtyDaysAgo = new Date(currentDate.getTime() - day * 24 * 60 * 60 * 1000);
  let seperator1 = "-";
  let month = thirtyDaysAgo.getMonth() + 1;
  let strDate = thirtyDaysAgo.getDate();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  return thirtyDaysAgo.getFullYear() + seperator1 + month + seperator1 + strDate
}

/**
 * jsGetN月前的Date， 格式“yyyy-MM-dd”
 */
export function getPrevMonthFormatDate(monthNum) {
  let prevMonth = new Date(); // CurrentDate
  prevMonth.setMonth(prevMonth.getMonth() - monthNum); // Setfor
  let seperator1 = "-";
  let month = prevMonth.getMonth() + 1;
  let strDate = prevMonth.getDate();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  return prevMonth.getFullYear() + seperator1 + month + seperator1 + strDate
}

/**
 * 自定义大数加法函数，两个数字相加
 * @param a
 * @param b
 * @returns {string}
 */
export function addBigNumbers(a, b) {
  a = a.toString();
  b = b.toString();
  // ，
  let aRev = a.split('').reverse();
  let bRev = b.split('').reverse();
  const maxLength = Math.max(aRev.length, bRev.length);
  let result = [];
  let carry = 0;
  for (let i = 0; i < maxLength; i++) {
    const digitA = i < aRev.length ? parseInt(aRev[i]) : 0;
    const digitB = i < bRev.length ? parseInt(bRev[i]) : 0;
    const sum = digitA + digitB + carry;
    result.push(sum % 10);
    carry = Math.floor(sum / 10);
  }
  // Process
  if (carry > 0) {
    result.push(carry);
  }
  // 
  return result.reverse().join('');
}

/**
 * JS中根据指定值Delete数组中的元素
 * @param arrylist
 * @param val
 */
export function removeByVal(arrylist, val) {
  for(var i = 0; i < arrylist .length; i++) {
    if(arrylist [i] == val) {
      arrylist .splice(i, 1);
      break;
    }
  }
}

export function getCheckFlag(multiBillType, multiLevelApprovalFlag, prefixNo) {
  if(multiLevelApprovalFlag==='1') {
    //Enable
    if(multiBillType) {
      let multiBillTypeArr = multiBillType.split(',')
      return multiBillTypeArr.indexOf(prefixNo) <= -1
    } else {
      return true
    }
  } else {
    //Disable
    return true
  }
}

/**
 * 将字符串中单个Amount中的数值转for负数
 * @param str
 * @returns {Array}
 */
export function changeListFmtMinus(str) {
  let newArr = new Array()
  if(str) {
    let arr = []
    if(str.indexOf(',')>-1) {
      arr = str.split(',')
    } else {
      arr = str
    }
    for(let i=0; i<arr.length; i++) {
      if(arr[i] < 0){
        newArr.push((arr[i]-0).toString());
      }
      else {
        newArr.push((0 - arr[i]).toString());
      }
    }
  }
  return newArr;
}

// Data
export function mergeRecursive(source, target) {
  for (var p in target) {
    try {
      if (target[p].constructor == Object) {
        source[p] = mergeRecursive(source[p], target[p]);
      } else {
        source[p] = target[p];
      }
    } catch (e) {
      source[p] = target[p];
    }
  }
  return source;
}

//postExportExcel
export function exportXlsPost(fileName, title, head, tip, list) {
  if(!fileName || typeof fileName != "string"){
    fileName = "导出文件"
  }
  let paramObj = {'title': title, 'head': head, 'tip': tip, 'list': list}
  console.log("导出参数", paramObj)
  downFilePost(paramObj).then((data)=>{
    if (!data) {
      this.$message.warning("文件下载失败")
      return
    }
    if (typeof window.navigator.msSaveBlob !== 'undefined') {
      window.navigator.msSaveBlob(new Blob([data],{type: 'application/vnd.ms-excel'}), fileName+'.xls')
    }else{
      let url = window.URL.createObjectURL(new Blob([data],{type: 'application/vnd.ms-excel'}))
      let link = document.createElement('a')
      link.style.display = 'none'
      link.href = url
      link.setAttribute('download', fileName + '_' + getNowFormatStr()+'.xls')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link); //DownloadFinishedElement
      window.URL.revokeObjectURL(url); //blobObject
    }
  })
}

/**
 * 新手引导步骤
 * @param module 这个变量可以用来存取Version号， System更新时候改变相应值
 * @param cur_version 这个变量可以用来存取Version号， System更新时候改变相应值
 */
export function handleIntroJs(module, cur_version) {
  //PageSetDifferentCacheName，，HasNewVersion，Newcur_version
  //HasNewVersionNew， ， HasCacheCheck
  let introJsObj = introJs()
  if(module !== 'indexChart') {
    let idElement = '#' + module
    introJsObj = introJs(idElement)
  }
  if (Vue.ls.get('intro_cache_' + module) === cur_version) {
    return;
  }
  introJsObj.setOptions({
    prevLabel: '&larr; 上一步',
    nextLabel: '下一步 &rarr;',
    doneLabel: '知道了',
    exitOnOverlayClick: false //YesNoDisableNoticeComponent
  }).oncomplete(function(){
    //SkipButton(CorrespondingVersionCache,SetHasfor100）
    Vue.ls.set('intro_cache_' + module, cur_version, 100 * 24 * 60 * 60 * 1000);
  }).onexit(function(){
    //Button， 
    Vue.ls.set('intro_cache_' + module, cur_version, 100 * 24 * 60 * 60 * 1000);
  }).start()
}

/**
 * 回车后自动跳到下一个input
 */
export function autoJumpNextInput(domInfo) {
  let domIndex = 0
  let inputs = document.getElementById(domInfo).getElementsByTagName('input')
  inputs[domIndex].focus()
  document.getElementById(domInfo).addEventListener('keydown',function(e){
    if(e.keyCode === 13){
      domIndex++
      if(domIndex === inputs.length) {
        domIndex = 0
      }
      inputs[domIndex].focus()
    }
  })
  for(let i=0; i<inputs.length; i++){
    //indexYesdo，GetCurrentiYes
    inputs[i].index = i;
    inputs[i].onclick = function () {
      domIndex = this.index
    }
  }
}