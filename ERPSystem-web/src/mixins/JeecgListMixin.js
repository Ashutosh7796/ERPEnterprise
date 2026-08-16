/**
 * AddUpdate完成调用 modalFormOk方法 编辑弹框组件ref定义formodalForm
 * 高级QueryButton调用 superQuery方法  高级Query组件ref定义forsuperQueryModal
 * data中url定义 listforQuery列表  deleteforDelete单条记录  deleteBatchforBatch delete
 */
import { filterObj, getMpListShort, getNowFormatStr } from '@/utils/util'
import { deleteAction, getAction, postAction, downFile, downFilePost, getFileAccessHttpUrl } from '@/api/manage'
import Vue from 'vue'
import VueDraggableResizable from 'vue-draggable-resizable'
import { ACCESS_TOKEN } from "@/store/mutation-types"
import {mixinDevice} from '@/utils/mixin.js'

export const JeecgListMixin = {
  mixins: [mixinDevice],
  components: {
    VueDraggableResizable
  },
  data(){
    return {
      //token header
      tokenHeader: {'X-Access-Token': Vue.ls.get(ACCESS_TOKEN)},
      /* */
      cardStyle: '',
      /* Query-queryParamProperty */
      queryParam: {},
      /* Data */
      dataSource:[],
      // 
      columns:[],
      // 
      settingDataIndex:[],
      /* Parameters */
      ipagination:{
        current: 1,
        pageSize: 10,
        pageSizeOptions: ['10', '20', '30', '50', '100'],
        showTotal: (total, range) => {
          return range[0] + "-" + range[1] + " 共" + total + "条"
        },
        showQuickJumper: true,
        showSizeChanger: true,
        total: 0
      },
      /* table */
      scroll: {},
      /* Parameters */
      isorter:{
        column: 'createTime',
        order: 'desc',
      },
      /* Parameters */
      filters: {},
      /* tableStatus */
      loading:false,
      /* tablekeys*/
      selectedRowKeys: [],
      /* tablerecords*/
      selectionRows: [],
      /* Query */
      toggleSearchStatus:false,
      /* QueryStatus */
      superQueryFlag:false,
      /* Query */
      superQueryParams: '',
      /** QueryConcatenate */
      superQueryMatchType: 'and',
      /** YesNo */
      disableMixinCreated: false,
      /* ButtonPermission */
      btnEnableList: '',
    }
  },
  created() {
    if(this.isDesktop()) {
      this.cardStyle = 'height:' + (document.documentElement.clientHeight-100) + 'px'
    }
    if(!this.disableMixinCreated){
      //console.log(' -- mixin created -- ')
      this.loadData();
      //InitializeDictionaryConfig Page
      this.initDictConfig();
      //InitializeButtonPermission
      this.initActiveBtnStr();
    }
  },
  mounted () {
    this.initScroll()
  },
  methods:{
    loadData(arg) {
      if(!this.url.list){
        this.$message.error("请设置url.list属性!")
        return
      }
      //Data Parameters1
      if (arg === 1) {
        this.ipagination.current = 1
      }
      let params = this.getQueryParams() //Query
      this.loading = true
      getAction(this.url.list, params).then((res) => {
        if (res && res.code===200) {
          this.dataSource = (res.data && res.data.rows) ? res.data.rows : []
          this.ipagination.total = (res.data && res.data.total) ? res.data.total : 0
          this.tableAddTotalRow(this.columns, this.dataSource)
        } else if(res && res.code===510){
          this.$message.warning(res.data)
        } else if(res && res.data && res.data.message) {
          this.$message.warning(res.data.message)
        }
      }).catch((err) => {
        console.error('loadData error:', err)
      }).finally(() => {
        this.loading = false
        this.onClearSelected()
      })
    },
    initDictConfig(){
      //console.log("--Yes!")
    },
    handleSuperQuery(params, matchType) {
      //Query
      if(!params){
        this.superQueryParams=''
        this.superQueryFlag = false
      }else{
        this.superQueryFlag = true
        this.superQueryParams=JSON.stringify(params)
        this.superQueryMatchType = matchType
      }
      this.loadData(1)
    },
    getQueryParams() {
      //GetQuery
      let sqp = {}
      if(this.superQueryParams){
        sqp['superQueryParams']=encodeURI(this.superQueryParams)
        sqp['superQueryMatchType'] = this.superQueryMatchType
      }
      let searchObj = {}
      searchObj.search = JSON.stringify(this.queryParam);
      var param = Object.assign(sqp, searchObj, this.isorter ,this.filters);
      param.field = this.getQueryField();
      param.currentPage = this.ipagination.current;
      param.pageSize = this.ipagination.pageSize;
      return filterObj(param);
    },
    getQueryField() {
      var fields = ["id"];
      this.columns.forEach(function (value) {
        if (value && value.dataIndex) {
          fields.push(value.dataIndex);
        }
      });
      return fields.join(",");
    },
    onSelectChange(selectedRowKeys, selectionRows) {
      this.selectedRowKeys = selectedRowKeys;
      this.selectionRows = selectionRows;
    },
    onClearSelected() {
      this.selectedRowKeys = []
      this.selectionRows = []
    },
    searchQuery() {
      this.loadData(1);
    },
    superQuery() {
      this.$refs.superQueryModal.show();
    },
    searchReset() {
      this.queryParam = {}
      this.loadData(1);
    },
    batchSetStatus: function (status) {
      if(!this.url.batchSetStatusUrl){
        this.$message.error("请设置url.batchSetStatusUrl属性!")
        return
      }
      if (this.selectedRowKeys.length <= 0) {
        this.$message.warning('请选择一条记录！');
        return;
      } else {
        var ids = "";
        for (var a = 0; a < this.selectedRowKeys.length; a++) {
          ids += this.selectedRowKeys[a] + ",";
        }
        var that = this;
        this.$confirm({
          title: "确认操作",
          content: "是否操作选中数据?",
          onOk: function () {
            that.loading = true;
            postAction(that.url.batchSetStatusUrl, {status: status, ids: ids}).then((res) => {
              if(res.code === 200){
                that.loadData()
              } else {
                that.$message.warning(res.data.message);
              }
            }).finally(() => {
              that.loading = false;
            });
          }
        });
      }
    },
    batchDel: function () {
      if(!this.url.deleteBatch){
        this.$message.error("请设置url.deleteBatch属性!")
        return
      }
      if (this.selectedRowKeys.length <= 0) {
        this.$message.warning('请选择一条记录！');
        return;
      } else {
        var ids = "";
        for (var a = 0; a < this.selectedRowKeys.length; a++) {
          ids += this.selectedRowKeys[a] + ",";
        }
        var that = this;
        this.$confirm({
          title: "确认删除",
          content: "是否删除选中数据?",
          onOk: function () {
            that.loading = true;
            deleteAction(that.url.deleteBatch, {ids: ids}).then((res) => {
              if(res.code === 200){
                that.loadData()
              } else {
                that.$message.warning(res.data.message);
              }
            }).finally(() => {
              that.loading = false;
            });
          }
        });
      }
    },
    handleDelete: function (id) {
      if(!this.url.delete){
        this.$message.error("请设置url.delete属性!")
        return
      }
      var that = this;
      deleteAction(that.url.delete, {id: id}).then((res) => {
        if(res.code === 200){
          that.loadData();
        } else {
          that.$message.warning(res.data.message);
        }
      });
    },
    handleEdit: function (record) {
      this.$refs.modalForm.edit(record);
      this.$refs.modalForm.title = "编辑";
      this.$refs.modalForm.disableSubmit = false;
    },
    handleAdd: function () {
      this.$refs.modalForm.add();
      this.$refs.modalForm.title = "新增";
      this.$refs.modalForm.disableSubmit = false;
    },
    handleTableChange(pagination, filters, sorter) {
      //、、
      if (Object.keys(sorter).length > 0) {
        if(sorter.order) {
          this.isorter.column = sorter.field
          this.isorter.order = 'ascend' === sorter.order ? 'asc' : 'desc'
        } else {
          this.isorter.column = 'createTime'
          this.isorter.order = 'desc'
        }
      }
      if(pagination && pagination.current) {
        this.ipagination = pagination;
      }
      this.loadData();
    },
    handleToggleSearch(){
      this.toggleSearchStatus = !this.toggleSearchStatus;
    },
    // popupQuery(QuerySupportField，OnlyReturnField)
    getPopupField(fields){
      return fields.split(',')[0]
    },
    modalFormOk() {
      // Add/Update Success，List
      this.loadData()
    },
    modalFormClose() {
      // DisablePage，List
      this.loadData()
    },
    handleDetail:function(record, type, prefixNo){
      this.$refs.modalDetail.show(record, type, prefixNo);
      this.$refs.modalDetail.title=type+"-详情";
    },
    //Initialize
    initColumnsSetting(){
      let columnsStr = Vue.ls.get(this.pageName)
      if(columnsStr && columnsStr.indexOf(',')>-1) {
        this.settingDataIndex = columnsStr.split(',')
      } else {
        this.settingDataIndex = this.defDataIndex
      }
      this.columns = this.defColumns.filter(item => {
        return this.settingDataIndex.includes(item.dataIndex)
      })
    },
    //Set
    onColChange (checkedValues) {
      this.columns = this.defColumns.filter(item => {
        return checkedValues.includes(item.dataIndex)
      })
      let columnsStr = checkedValues.join()
      Vue.ls.set(this.pageName, columnsStr)
    },
    //Default
    handleRestDefault() {
      Vue.ls.remove(this.pageName)
      this.initColumnsSetting()
    },
    /* Export */
    handleExportXls2(){
      let paramsStr = encodeURI(JSON.stringify(this.getQueryParams()));
      let url = `${window._CONFIG['domianURL']}/${this.url.exportXlsUrl}?paramsStr=${paramsStr}`;
      window.location.href = url;
    },
    //getExportExcel
    handleExportXls(fileName){
      if(!fileName || typeof fileName != "string"){
        fileName = "导出文件"
      }
      let param = {...this.queryParam};
      if(this.selectedRowKeys && this.selectedRowKeys.length>0){
        param['selections'] = this.selectedRowKeys.join(",")
      }
      console.log("导出参数",param)
      downFile(this.url.exportXlsUrl,param).then((data)=>{
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
    },
    //postExportExcel
    handleExportXlsPost(fileName, title, head, tip, list) {
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
    },
    /* Import */
    handleImportExcel(info){
      this.confirmLoading = true
      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === 'done') {
        if (info.file.response) {
          // this.$message.success(`${info.file.name} FileUploadSuccess`);
          if (info.file.response.code === 200) {
            this.$message.success(info.file.response.data || `${info.file.name} 文件上传成功`)
          } else {
            this.$message.warning(info.file.response.data, 8)
          }
          this.confirmLoading = false
          this.visible = false
          this.$emit('ok')
        } else {
          this.$message.error(`${info.file.name} ${info.file.response.data}.`);
          this.confirmLoading = false
        }
      } else if (info.file.status === 'error') {
        this.$message.error(`文件上传失败: ${info.file.msg} `)
        this.confirmLoading = false
      }
    },
    /* ImagePreview */
    getImgView(text){
      if(text && text.indexOf(",")>0){
        text = text.substring(0,text.indexOf(","))
      }
      return getFileAccessHttpUrl(text)
    },
    /* FileDownload */
    uploadFile(text){
      if(!text){
        this.$message.warning("未知的文件")
        return;
      }
      if(text.indexOf(",")>0){
        text = text.substring(0,text.indexOf(","))
      }
      let url = getFileAccessHttpUrl(text)
      window.open(url);
    },
    /* ButtonPermission */
    initActiveBtnStr() {
      let btnStrList = Vue.ls.get('winBtnStrList'); //ButtonFunctionList JSON
      this.btnEnableList = ""; //ButtonList
      if (this.urlPath && btnStrList) {
        for (let i = 0; i < btnStrList.length; i++) {
          if (btnStrList[i].url === this.urlPath) {
            if (btnStrList[i].btnStr) {
              this.btnEnableList = btnStrList[i].btnStr
            }
          }
        }
      }
    },
    /* InitializeTableor */
    initScroll() {
      if (this.isMobile()) {
        this.scroll.y = ''
      } else {
        let basicWidth = 150
        let basicLength = 274
        let searchWrapperDomLen=0, operatorDomLen=0
        //
        let searchWrapperDom = document.getElementsByClassName('table-page-search-wrapper')
        //Button
        let operatorDom = document.getElementsByClassName('table-operator')
        if(searchWrapperDom && searchWrapperDom[0]) {
          searchWrapperDomLen = searchWrapperDom[0].offsetHeight
        }
        if(operatorDom && operatorDom[0]) {
          operatorDomLen = operatorDom[0].offsetHeight+10
        }
        this.scroll.x = document.documentElement.clientWidth-basicWidth-64
        this.scroll.y = document.documentElement.clientHeight-searchWrapperDomLen-operatorDomLen-basicLength
      }
    },
    //Component
    handleDrag(column){
      return {
        header: {
          cell: (h, props, children) => {
            const { key, ...restProps } = props
            // ParentTableLogic
            const col = column.find((col) => {
              const k = col.dataIndex || col.key
              return k === key
            })
            if (!col || !col.width) {
              return h('th', { ...restProps }, children)
            }

            const dragProps = {
              key: col.dataIndex || col.key,
              class: 'table-draggable-handle',
              attrs: {
                w: 10,
                x: col.width,
                z: 1,
                axis: 'x',
                draggable: true,
                resizable: false,
              },
              on: {
                dragging: (x, y) => {
                  col.width = Math.max(x, 1)
                },
              },
            }
            const drag = h(VueDraggableResizable, { ...dragProps })
            return h('th', { ...restProps, class: 'resize-table-th' }, [children, drag])
          },
        }
      }
    },
    /** Table */
    tableAddTotalRow(columns, dataSource) {
      if(dataSource.length>0 && this.ipagination.pageSize%10===1) {
        //for11、21、31etc.
        let numKey = 'rowIndex'
        let totalRow = { [numKey]: '合计' }
        //Needs，Delete
        let parseCols = 'initialStock,currentStock,currentStockPrice,currentWeight,initialAmount,thisMonthAmount,currentAmount,inSum,inSumPrice,' +
          'inOutSumPrice,outSum,outSumPrice,outInSumPrice,operNumber,allPrice,numSum,priceSum,prevSum,thisSum,thisAllPrice,changeAmount,' +
          'allPrice,taxMoney,currentNumber,lowCritical,highCritical,preNeed,debtMoney,backMoney,allNeed,' +
          'needDebt,realNeedDebt,finishDebt,debt,'
        columns.forEach(column => {
          let { key, dataIndex } = column
          if (![key, dataIndex].includes(numKey)) {
            let total = 0
            dataSource.forEach(data => {
              if(parseCols.indexOf(dataIndex+',')>-1) {
                if(data[dataIndex]) {
                  total += Number.parseFloat(data[dataIndex])
                } else {
                  total += 0
                }
              } else {
                total = '-'
              }
            })
            if (total !== '-') {
              total = total.toFixed(2)
            }
            totalRow[dataIndex] = total
          }
        })
        dataSource.push(totalRow)
        //，Has，
        let size = Math.ceil(this.ipagination.total/(this.ipagination.pageSize-1))
        this.ipagination.total = this.ipagination.total + size
      }
    },
    //Extension / CustomField
    handleChangeOtherField(showQuery) {
      let mpStr = getMpListShort(Vue.ls.get('materialPropertyList'))
      if(mpStr) {
        let mpArr = mpStr.split(',')
        if(mpArr.length ===3) {
          if(showQuery) {
            this.queryTitle.mp1 = mpArr[0]
            this.queryTitle.mp2 = mpArr[1]
            this.queryTitle.mp3 = mpArr[2]
          }
          for (let i = 0; i < this.defColumns.length; i++) {
            if(this.defColumns[i].dataIndex === 'otherField1') {
              this.defColumns[i].title = mpArr[0]
            }
            if(this.defColumns[i].dataIndex === 'otherField2') {
              this.defColumns[i].title = mpArr[1]
            }
            if(this.defColumns[i].dataIndex === 'otherField3') {
              this.defColumns[i].title = mpArr[2]
            }
          }
        }
      }
    },
    paginationChange(page, pageSize) {
      this.ipagination.current = page
      this.ipagination.pageSize = pageSize
      this.loadData(this.ipagination.current);
    },
    paginationShowSizeChange(current, size) {
      this.ipagination.current = current
      this.ipagination.pageSize = size
      this.loadData(this.ipagination.current);
    }
  }

}