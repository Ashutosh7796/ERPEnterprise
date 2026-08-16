/*
*
* 这里填写User自定义的表达式
* 可用在Online表单的默认值表达式中使用
* 需要外部使用的变量或方法一定要 export，否则无法识别
* 示例：
*   export const name = '张三'; // const YesConstants
*   export let age = 17; //  export const Yes let ，
*   export function content(arg) { // export ，Parameters，，return，ReturnPromise
*     return 'content' + arg;
*   }
*   export const address = (arg) => content(arg) + ' | 北京市'; // export 
*
*/

/** FieldDefault：Get */
export function demoFieldDefVal_getAddress(arg) {
  if (!arg) {
    arg = '朝阳区'
  }
  return `北京市 ${arg}`
}