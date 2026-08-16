const FormTypes = {
  normal: 'normal',
  input: 'input',
  inputNumber: 'inputNumber',
  checkbox: 'checkbox',
  select: 'select',
  date: 'date',
  datetime: 'datetime',
  upload: 'upload',
  file: 'file',
  image: 'image',
  popup:'popup',
  popupJsh:'popupJsh',
  list_multi:"list_multi",
  sel_search:"sel_search",
  radio:'radio',
  checkbox_meta:"checkbox_meta",
  input_pop:'input_pop',
  slot: 'slot',
  hidden: 'hidden'
}
const VALIDATE_NO_PASSED = Symbol()
export { FormTypes, VALIDATE_NO_PASSED }

/**
 * Get指定的 $refs 对象
 * 有时候可能会遇到组件未挂载到页面中的情况，导致无法Get $refs 中的某个对象
 * 这个方法可以等待挂载完成之后再返回 $refs 的对象，避免报错
 * @author sunjianlei
 **/
export function getRefPromise(vm, name) {
  return new Promise((resolve) => {
    (function next() {
      let ref = vm.$refs[name]
      if (ref) {
        resolve(ref)
      } else {
        setTimeout(() => {
          next()
        }, 10)
      }
    })()
  })
}

/**
 * 一次性验证主表单和所有的次表单
 * @param form 主表单 form 对象
 * @param cases 接收一个数组，每项都是一个JEditableTable实例
 * @returns {Promise<any>}
 * @author sunjianlei
 */
export function validateFormAndTables(form, cases) {

  if (!(form && typeof form.validateFields === 'function')) {
    throw `form 参数需要的是一个form对象，而传入的却是${typeof form}`
  }

  let options = {}
  return new Promise((resolve, reject) => {
    // Header table
    form.validateFields((err, values) => {
      err ? reject({ error: VALIDATE_NO_PASSED }) : resolve(values)
    })
  }).then(values => {
    Object.assign(options, { formValue: values })
    // HasDetail table
    return validateTables(cases)
  }).then(all => {
    Object.assign(options, { tablesValue: all })
    return Promise.resolve(options)
  }).catch(error => {
    return Promise.reject(error)
  })

}

/**
 * 验证并Get一个或多个表格的所有值
 * @param cases 接收一个数组，每项都是一个JEditableTable实例
 * @param deleteTempId 是否Delete临时ID，如果设fortrue，行编辑就不返回Add行的ID，ID需要后台生成
 * @author sunjianlei
 */
export function validateTables(cases, deleteTempId) {
  if (!(cases instanceof Array)) {
    throw `'validateTables'函数的'cases'参数需要的是一个数组，而传入的却是${typeof cases}`
  }
  return new Promise((resolve, reject) => {
    let tables = []
    let index = 0;
    if(!cases || cases.length==0){
      resolve()
    }
    (function next() {
      let vm = cases[index]
      vm.getAll(true, deleteTempId).then(all => {
        tables[index] = all
        // CheckValidateYesNoAllFinished，FinishedReturnSuccess，NoValidate
        if (++index === cases.length) {
          resolve(tables)
        } else (
          next()
        )
      }, error => {
        // Not，Validate，ReturnFailedRedirectTable
        if (error === VALIDATE_NO_PASSED) {
          reject({ error: VALIDATE_NO_PASSED, index })
        }
        reject(error)
      })
    })()
  })
}

/**
 * 一次性验证主表单和所有的次表单-只Validate单号
 * @param form 主表单 form 对象
 * @param cases 接收一个数组，每项都是一个JEditableTable实例
 * @returns {Promise<any>}
 * @author sunjianlei
 */
export function getListData(form, cases) {
  let options = {}
  return new Promise((resolve, reject) => {
    // Header table
    form.validateFields(['number'],(err, values) => {
      err ? reject({ error: VALIDATE_NO_PASSED }) : resolve(values)
    })
  }).then(values => {
    Object.assign(options, { formValue: values })
    // HasDetail table
    return getListTables(cases)
  }).then(all => {
    Object.assign(options, { tablesValue: all })
    return Promise.resolve(options)
  }).catch(error => {
    return Promise.reject(error)
  })
}

/**
 * 不验证直接Get一个或多个表格的所有值
 * @param cases 接收一个数组，每项都是一个JEditableTable实例
 * @param deleteTempId 是否Delete临时ID，如果设fortrue，行编辑就不返回Add行的ID，ID需要后台生成
 * @author sunjianlei
 */
export function getListTables(cases, deleteTempId) {
  if (!(cases instanceof Array)) {
    throw `'validateTables'函数的'cases'参数需要的是一个数组，而传入的却是${typeof cases}`
  }
  return new Promise((resolve, reject) => {
    let tables = []
    let index = 0;
    if(!cases || cases.length==0){
      resolve()
    }
    (function next() {
      let vm = cases[index]
      vm.getAll(false, deleteTempId).then(all => {
        tables[index] = all
        // CheckValidateYesNoAllFinished，FinishedReturnSuccess，NoValidate
        if (++index === cases.length) {
          resolve(tables)
        } else (
          next()
        )
      }, error => {
        // Not，Validate，ReturnFailedRedirectTable
        if (error === VALIDATE_NO_PASSED) {
          reject({ error: VALIDATE_NO_PASSED, index })
        }
        reject(error)
      })
    })()
  })
}