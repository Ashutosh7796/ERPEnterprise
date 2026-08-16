import Vue from "vue";
import * as dayjs from "dayjs";

Vue.filter('NumberFormat', function (value) {
  if (!value) {
    return '0'
  }
  let intPartFormat = value.toString().replace(/(\d)(?=(?:\d{3})+$)/g, '$1,') //
  return intPartFormat
})

Vue.filter('dayjs', function(dataStr, pattern = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(dataStr).format(pattern)
})

Vue.filter('moment', function(dataStr, pattern = 'YYYY-MM-DD HH:mm:ss') {
  return dayjs(dataStr).format(pattern)
})

/** Display */
Vue.filter('ellipsis', function (value, vlength = 25) {
  if(!value){
    return "";
  }
  console.log('vlength: '+ vlength);
  if (value.length > vlength) {
    return value.slice(0, vlength) + '...'
  }
  return value
})