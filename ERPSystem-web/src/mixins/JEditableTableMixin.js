import JEditableTable from '@/components/jeecg/JEditableTable'
import { VALIDATE_NO_PASSED, getRefPromise, validateFormAndTables } from '@/utils/JEditableTableUtil'
import { httpAction, getAction } from '@/api/manage'

export const JEditableTableMixin = {
  components: {
    JEditableTable
  },
  data() {
    return {
      title: '操作',
      visible: false,
      form: this.$form.createForm(this),
      confirmLoading: false,
      model: {},
      labelCol: {
        xs: { span: 24 },
        sm: { span: 6 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 18 }
      }
    }
  },
  methods: {

    /** GetHaseditableTable */
    getAllTable() {
      if (!(this.refKeys instanceof Array)) {
        throw this.throwNotArray('refKeys')
      }
      let values = this.refKeys.map(key => getRefPromise(this, key))
      return Promise.all(values)
    },

    /** HasJEditableTable */
    eachAllTable(callback) {
      // 
      this.getAllTable().then(tables => {
        tables.forEach((item, index) => {
          if (typeof callback === 'function') {
            callback(item, index)
          }
        })
      })
    },

    /** AddButton */
    add() {
      if (typeof this.addBefore === 'function') this.addBefore()
      // DefaultAddData
      let rowNum = this.addDefaultRowNum
      if (typeof rowNum !== 'number') {
        rowNum = 1
        console.warn('由于你没有在 data 中定义 addDefaultRowNum 或 addDefaultRowNum 不是数字，所以默认添加一条空数据，如果不想默认添加空数据，请将定义 addDefaultRowNum 为 0')
      }
      this.eachAllTable((item) => {
        item.add(rowNum)
      })
      if (typeof this.addAfter === 'function') this.addAfter(this.model)
      this.edit({})
    },
    /** （Update）Button */
    edit(record) {
      if (typeof this.editBefore === 'function') this.editBefore(record)
      this.visible = true
      this.activeKey = this.refKeys[0]
      this.form.resetFields()
      this.model = Object.assign({}, record)
      if (typeof this.editAfter === 'function') this.editAfter(this.model)
    },
    /** Disable，HasJEditableTableStatus */
    close() {
      this.visible = false
      this.eachAllTable((item) => {
        item.initialize()
      })
      this.$emit('close')
    },

    /** QuerytabData */
    requestSubTableData(url, params, tab, success) {
      tab.loading = true
      getAction(url, params).then(res => {
        if(res && res.code === 200){
          tab.dataSource = res.data.rows
          typeof success === 'function' ? success(res) : ''
        }
      }).finally(() => {
        tab.loading = false
      })
    },
    /** Request，CheckYesAddYesUpdate */
    request(formData) {
      let url = this.url.add, method = 'post'
      if (this.model.id) {
        url = this.url.edit
        method = 'put'
      }
      this.confirmLoading = true
      httpAction(url, formData, method).then((res) => {
        if(res.code === 200){
          this.$emit('ok')
          this.confirmLoading = false
          this.close()
        } else {
          this.$message.warning(res.data.message);
          this.confirmLoading = false
        }
      }).finally(() => {
      })
    },

    /* --- handle  --- */

    /** ATab Switch */
    handleChangeTabs(key) {
      // ResetscrollTopStatus，Prevent
      getRefPromise(this, key).then(editableTable => {
        editableTable.resetScrollTop()
      })
    },
    /** DisableButton */
    handleCancel() {
      this.close()
    },
    /** Button */
    handleOk() {
      /**  */
      this.getAllTable().then(tables => {
        /** Header tableandHas */
        return validateFormAndTables(this.form, tables)
      }).then(allValues => {
        if (typeof this.classifyIntoFormData !== 'function') {
          throw this.throwNotFunction('classifyIntoFormData')
        }
        let formData = this.classifyIntoFormData(allValues)
        // Request
        return this.request(formData)
      }).catch(e => {
        if (e.error === VALIDATE_NO_PASSED) {
          // HasNotDetail table，Redirecttab
          this.activeKey = e.index == null ? this.activeKey : this.refKeys[e.index]
        } else {
          console.error(e)
        }
      })
    },

    /* --- throw --- */

    /** not a function */
    throwNotFunction(name) {
      return `${name} 未定义或不是一个函数`
    },

    /** not a array */
    throwNotArray(name) {
      return `${name} 未定义或不是一个数组`
    }

  }
}