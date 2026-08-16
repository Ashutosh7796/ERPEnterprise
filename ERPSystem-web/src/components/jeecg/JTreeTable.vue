<template>
  <a-table
    :rowKey="rowKey"
    :columns="columns"
    :dataSource="dataSource"
    :expandedRowKeys="expandedRowKeys"
    v-bind="tableAttrs"
    v-on="$listeners"
    @expand="handleExpand"
    @expandedRowsChange="expandedRowKeys=$event">

    <template v-for="(slotItem) of slots" :slot="slotItem" slot-scope="text, record, index">
      <slot :name="slotItem" v-bind="{text,record,index}"></slot>
    </template>

  </a-table>
</template>

<script>
  import { getAction } from '@/api/manage'

  export default {
    name: 'JTreeTable',
    props: {
      rowKey: {
        type: String,
        default: 'id'
      },
      // RootQuery， id Root id Query
      queryKey: {
        type: String,
        default: 'parentId'
      },
      queryParams: {
        type: Object,
        default: () => ({})
      },
      // Query，for0，0
      topValue: {
        type: String,
        default: null
      },
      columns: {
        type: Array,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      childrenUrl: {
        type: String,
        default: null
      },
      tableProps: {
        type: Object,
        default: () => ({})
      },
      /** YesNoComponentQueryData */
      immediateRequest: {
        type: Boolean,
        default: true
      },
      condition:{
        type:String,
        default:'',
        required:false
      }
    },
    data() {
      return {
        dataSource: [],
        expandedRowKeys: []
      }
    },
    computed: {
      getChildrenUrl() {
        if (this.childrenUrl) {
          return this.childrenUrl
        } else {
          return this.url
        }
      },
      slots() {
        let slots = []
        for (let column of this.columns) {
          if (column.scopedSlots && column.scopedSlots.customRender) {
            slots.push(column.scopedSlots.customRender)
          }
        }
        return slots
      },
      tableAttrs() {
        return Object.assign(this.$attrs, this.tableProps)
      }
    },
    watch: {
      queryParams: {
        deep: true,
        handler() {
          this.loadData()
        }
      }
    },
    created() {
      if (this.immediateRequest) this.loadData()
    },
    methods: {

      /** Data*/
      loadData(id = this.topValue, first = true, url = this.url) {
        this.$emit('requestBefore', { first })

        if (first) {
          this.expandedRowKeys = []
        }

        let params = Object.assign({}, this.queryParams || {})
        params[this.queryKey] = id
        if(this.condition && this.condition.length>0){
          params['condition'] = this.condition
        }

        return getAction(url, params).then(res => {
          let list = []
          if (res.result instanceof Array) {
            list = res.result
          } else if (res.result.records instanceof Array) {
            list = res.result.records
          } else {
            throw '返回数据类型不识别'
          }
          let dataSource = list.map(item => {
            // CheckYesNoHasChild
            if (item.hasChildren === true) {
              // HasdataIndex
              let firstColumn
              for (let column of this.columns) {
                firstColumn = column.dataIndex
                if (firstColumn) break
              }
              // DefaultDisplayloadingChild，ChildDataOnly
              let loadChild = { id: `${item.id}_loadChild`, [firstColumn]: 'loading...', isLoading: true }
              item.children = [loadChild]
            }
            return item
          })
          if (first) {
            this.dataSource = dataSource
          }
          this.$emit('requestSuccess', { first, dataSource, res })
          return Promise.resolve(dataSource)
        }).finally(() => this.$emit('requestFinally', { first }))
      },

      /** Icon */
      handleExpand(expanded, record) {
        // CheckYesNoYesStatus
        if (expanded) {
          // CheckChildYesNoYes“”，YesData
          if (record.children[0].isLoading === true) {
            this.loadData(record.id, false, this.getChildrenUrl).then(dataSource => {
              // ProcessDatachildren
              if (dataSource.length === 0) {
                record.children = null
              } else {
                record.children = dataSource
              }
            })
          }
        }
      }

    }
  }
</script>

<style scoped>

</style>