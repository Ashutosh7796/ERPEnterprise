import { FormTypes, getListData } from '@/utils/JEditableTableUtil'
import { findBySelectCus, findBySelectRetail, findBySelectSup, findStockByDepotAndBarCode, getAccount,
  getBatchNumberList, getCurrentSystemConfig, getMaterialByBarCode, getPersonByNumType, getPlatformConfigByKey } from '@/api/api'
import { getAction } from '@/api/manage'
import { getCheckFlag, getMpListShort, getNowFormatDateTime } from '@/utils/util'
import { USER_INFO } from '@/store/mutation-types'
import Vue from 'vue'

export const BillModalMixin = {
  data() {
    return {
      action: '',
      manyAccountBtnStatus: false,
      supList: [],
      cusList: [],
      retailList: [],
      personList: {
        options: [],
        value: ''
      },
      currentSelectDepotId: '',
      transferParam: {},
      defaultDepotId: '',
      depotList: [],
      accountList: [],
      accountIdList: [],
      accountMoneyList: [],
      billUnitPirce: '',
      scanBarCode: '',
      scanStatus: true,
      billStatus: '0',
      minWidth: 1100,
      isCanCheck: true,
      quickBtn: {
        vendor: false,
        customer: false,
        member: false,
        account: false,
        depot: false
      },
      billPrintFlag: false,
      /* YesNoDisplayButton */
      isShowPrintBtn: true,
      /* ApproveYesNoEnable */
      checkFlag: true,
      //
      zeroChangeAmountFlag: false,
      //Material / ProductPrice
      materialPriceTaxFlag: false,
      setTimeFlag: null,
      validatorRules:{
        price:{
          rules: [
            { pattern: /^(([0-9][0-9]*)|([0]\.\d{0,4}|[0-9][0-9]*\.\d{0,4}))$/, message: '金额格式不正确!' }
          ]
        }
      },
      spans: {
        labelCol1: {span: 2},
        wrapperCol1: {span: 22},
        //1_5: for1.5（2/3）
        labelCol1_5: { span: 3 },
        wrapperCol1_5: { span: 21 },
        labelCol2: {span: 4},
        wrapperCol2: {span: 20},
        labelCol3: {span: 6},
        wrapperCol3: {span: 18},
        labelCol6: {span: 12},
        wrapperCol6: {span: 12}
      },
    };
  },
  created () {
    let realScreenWidth = window.screen.width
    this.width = realScreenWidth<1500?'1200px':'1550px'
    this.minWidth = realScreenWidth<1500?1150:1500
  },
  mounted() {
    document.getElementById(this.prefixNo).addEventListener('keydown', this.handleOkKey)
  },
  beforeDestroy() {
    document.getElementById(this.prefixNo).removeEventListener('keydown', this.handleOkKey)
  },
  computed: {
    readOnly: function() {
      return this.action !== "add" && this.action !== "edit";
    }
  },
  methods: {
    // 
    handleOkKey(e) {
      const key = window.event.keyCode ? window.event.keyCode : window.event.which
      if (key === 83 && e.ctrlKey) {
        // CTRL+S
        this.handleOkOnly()
        e.preventDefault()
      }
    },
    addInit(amountNum) {
      getAction('/sequence/buildNumber').then((res) => {
        if (res && res.code === 200) {
          this.model.defaultNumber = amountNum + res.data.defaultNumber
          this.form.setFieldsValue({'number':amountNum + res.data.defaultNumber})
        }
      })
      this.$nextTick(() => {
        this.form.setFieldsValue({'operTime':getNowFormatDateTime(), 'discount': 0,
          'discountMoney': 0, 'discountLastMoney': 0, 'otherMoney': 0, 'changeAmount': 0, 'debt': 0})
      })
      this.$nextTick(() => {
        getAccount({}).then((res)=>{
          if(res && res.code === 200) {
            for (const item of res.data.accountList) {
              if(item.isDefault){
                this.form.setFieldsValue({'accountId': item.id})
              }
            }
            //DataPage
            if(this.transferParam && this.transferParam.accountId) {
              this.form.setFieldsValue({'accountId': this.transferParam.accountId})
            }
          }
        })
      })
      this.accountIdList = []
      this.accountMoneyList = []
      this.manyAccountBtnStatus = false
    },
    copyAddInit(amountNum) {
      getAction('/sequence/buildNumber').then((res) => {
        if (res && res.code === 200) {
          this.form.setFieldsValue({'number':amountNum + res.data.defaultNumber})
        }
      })
      this.$nextTick(() => {
        this.form.setFieldsValue({'operTime':getNowFormatDateTime()})
      })
    },
    /** QuerytabData */
    requestSubTableData(url, params, tab, success) {
      tab.loading = true
      getAction(url, params).then(res => {
        if(res && res.code === 200){
          tab.dataSource = res.data.rows
          for(let i=0; i<tab.dataSource.length; i++){
            let info = tab.dataSource[i]
            info.isEdit = this.model.id?1:0
            this.changeColumnShow(info)
          }
          typeof success === 'function' ? success(res) : ''
        }
      }).finally(() => {
        tab.loading = false
      })
    },
    //FieldStatus，1-Display 0-Hide
    changeFormTypes(columns, key, type) {
      for(let i=0; i<columns.length; i++){
        if(columns[i].key === key) {
          if(type){
            if(key === 'snList' || key === 'batchNumber') {
              if(this.prefixNo === 'LSCK' || this.prefixNo === 'CGTH'  || this.prefixNo === 'XSCK' || this.prefixNo === 'QTCK' || this.prefixNo === 'DBCK') {
                columns[i].type = FormTypes.popupJsh //Display
              } else {
                if(key === 'snList') {
                  columns[i].type = FormTypes.popupJsh //Display
                } else {
                  columns[i].type = FormTypes.input //Display
                }
              }
            } else if(key === 'expirationDate') {
              if(this.prefixNo === 'LSTH' || this.prefixNo === 'CGRK' || this.prefixNo === 'XSTH' || this.prefixNo === 'QTRK') {
                columns[i].type = FormTypes.date //Display
              } else {
                columns[i].type = FormTypes.input //Display
              }
            } else {
              columns[i].type = FormTypes.normal //Display
            }
          } else {
            columns[i].type = FormTypes.hidden //Hide
          }
        }
      }
    },
    initSystemConfig() {
      getCurrentSystemConfig().then((res) => {
        if(res.code === 200 && res.data){
          let multiBillType = res.data.multiBillType
          let multiLevelApprovalFlag = res.data.multiLevelApprovalFlag
          this.checkFlag = getCheckFlag(multiBillType, multiLevelApprovalFlag, this.prefixNo)
          this.purchaseBySaleFlag = res.data.purchaseBySaleFlag==='1'?true:false
          this.inOutManageFlag = res.data.inOutManageFlag==='1'?true:false
          this.zeroChangeAmountFlag = res.data.zeroChangeAmountFlag==='1'?true:false
          this.materialPriceTaxFlag = res.data.materialPriceTaxFlag==='1'?true:false
          if(res.data.auditPrintFlag==='1') {
            if(this.model.status === '0' || this.model.status === '9') {
              this.isShowPrintBtn = false
            } else {
              this.isShowPrintBtn = true
            }
          } else {
            this.isShowPrintBtn = true
          }
        }
      })
    },
    initSupplier(isChecked) {
      let that = this;
      findBySelectSup({organId: this.model.organId, limit:1}).then((res)=>{
        if(res) {
          that.supList = res
          if(isChecked && res.length>0) {
            that.form.setFieldsValue({'organId': res[0].id})
          }
        }
      });
    },
    initCustomer(isChecked) {
      let that = this;
      findBySelectCus({organId: this.model.organId, limit:1}).then((res)=>{
        if(res) {
          that.cusList = res
          if(isChecked && res.length>0) {
            that.form.setFieldsValue({'organId': res[0].id})
          }
        }
      });
    },
    initRetail(isChecked) {
      let that = this;
      findBySelectRetail({organId: this.model.organId, limit:1}).then((res)=>{
        if(res) {
          that.retailList = res
          if(isChecked && res.length>0) {
            that.form.setFieldsValue({'organId': res[0].id})
          }
        }
      });
    },
    initSalesman() {
      let that = this;
      getPersonByNumType({type:1}).then((res)=>{
        if(res) {
          that.personList.options = res;
        }
      });
    },
    initDepot() {
      let that = this;
      getAction('/depot/findDepotByCurrentUser').then((res) => {
        if(res.code === 200){
          let arr = res.data
          for(let item of that.materialTable.columns){
            if(item.key == 'depotId' || item.key == 'anotherDepotId') {
              item.options = []
              for(let i=0; i<arr.length; i++) {
                let depotInfo = {};
                depotInfo.value = arr[i].id + '' //-valueforFormat
                depotInfo.text = arr[i].depotName
                depotInfo.title = arr[i].depotName
                item.options.push(depotInfo)
              }
            }
          }
        }
      })
    },
    initAccount(isChecked){
      let that = this;
      getAccount({}).then((res)=>{
        if(res && res.code === 200) {
          let list = res.data.accountList
          let lastId = list.length>0?list[0].id:''
          getCurrentSystemConfig().then((res) => {
            if (res.code === 200 && res.data) {
              let multiAccountFlag = res.data.multiAccountFlag
              if(multiAccountFlag==='1') {
                list.splice(0,0,{id: 0, name: '多账户'})
              }
            }
            that.accountList = list
            if(isChecked) {
              that.form.setFieldsValue({'accountId': lastId})
            }
          })
        }
      })
    },
    handleSearchSupplier(value) {
      let that = this
      if(this.setTimeFlag != null){
        clearTimeout(this.setTimeFlag);
      }
      this.setTimeFlag = setTimeout(()=>{
        findBySelectSup({key: value, limit:1}).then((res) => {
          if(res) {
            that.supList = res;
          }
        })
      },500)
    },
    handleSearchCustomer(value) {
      let that = this
      if(this.setTimeFlag != null){
        clearTimeout(this.setTimeFlag);
      }
      this.setTimeFlag = setTimeout(()=>{
        findBySelectCus({key: value, limit:1}).then((res) => {
          if(res) {
            that.cusList = res;
          }
        })
      },500)
    },
    handleSearchRetail(value) {
      let that = this
      if(this.setTimeFlag != null){
        clearTimeout(this.setTimeFlag);
      }
      this.setTimeFlag = setTimeout(()=>{
        findBySelectRetail({key: value, limit:1}).then((res) => {
          if(res) {
            that.retailList = res;
          }
        })
      },500)
    },
    handleManyAccount(){
      this.selectAccount(0)
    },
    selectAccount(value){
      if(value === 0) { //
        this.$refs.manyAccountModalForm.edit(this.accountIdList, this.accountMoneyList)
        this.$refs.manyAccountModalForm.title = "多账户结算"
        this.manyAccountBtnStatus = true
      } else {
        this.accountIdList = []
        this.accountMoneyList = []
        this.manyAccountBtnStatus = false
      }
    },
    manyAccountModalFormOk(idList, moneyList, allPrice) {
      this.accountIdList = idList
      this.accountMoneyList = moneyList
      let discountLastMoney = this.form.getFieldValue('discountLastMoney')-0
      let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
      let debt = (discountLastMoney + otherMoney - allPrice).toFixed(2)
      this.$nextTick(() => {
        this.form.setFieldsValue({'changeAmount':allPrice, 'debt':debt})
      });
    },
    addSupplier() {
      this.$refs.vendorModalForm.add();
      this.$refs.vendorModalForm.title = "新增供应商";
      this.$refs.vendorModalForm.disableSubmit = false;
    },
    addCustomer() {
      this.$refs.customerModalForm.add();
      this.$refs.customerModalForm.title = "新增客户（提醒：如果找不到新添加的客户，请到用户管理检查是否分配了该客户权限）";
      this.$refs.customerModalForm.disableSubmit = false;
    },
    addMember() {
      this.$refs.memberModalForm.add();
      this.$refs.memberModalForm.title = "新增会员";
      this.$refs.memberModalForm.disableSubmit = false;
    },
    handleBatchSetDepot() {
      this.$refs.batchSetDepotModalForm.add();
      this.$refs.batchSetDepotModalForm.title = "批量切换仓库";
      this.$refs.batchSetDepotModalForm.disableSubmit = false;
    },
    addDepot() {
      this.$refs.depotModalForm.add();
      this.$refs.depotModalForm.title = "新增仓库";
      this.$refs.depotModalForm.disableSubmit = false;
    },
    addAccount() {
      this.$refs.accountModalForm.add();
      this.$refs.accountModalForm.title = "新增结算账户";
      this.$refs.accountModalForm.disableSubmit = false;
    },
    vendorModalFormOk() {
      this.initSupplier(1)
    },
    customerModalFormOk() {
      this.initCustomer(1)
    },
    memberModalFormOk() {
      this.initRetail(1)
    },
    batchSetDepotModalFormOk(depotId) {
      this.getAllTable().then(tables => {
        return getListData(this.form, tables)
      }).then(allValues => {
        //GetBill / DocumentDetailsListInfo
        let detailArr = allValues.tablesValue[0].values
        let barCodes = ''
        for(let detail of detailArr){
          barCodes += detail.barCode + ','
        }
        if(barCodes) {
          barCodes = barCodes.substring(0, barCodes.length-1)
        }
        let param = {
          barCode: barCodes,
          organId: this.form.getFieldValue('organId'),
          depotId: depotId,
          mpList: getMpListShort(Vue.ls.get('materialPropertyList')),  //Extension / CustomProperty
          prefixNo: this.prefixNo
        }
        getMaterialByBarCode(param).then((res) => {
          if (res && res.code === 200) {
            let mList = res.data
            //NewList，StoreBill / DocumentDetailsInfo
            let newDetailArr = []
            if(mList && mList.length) {
              for (let i = 0; i < detailArr.length; i++) {
                let item = detailArr[i]
                item.depotId = depotId
                for (let j = 0; j < mList.length; j++) {
                  if(mList[j].mBarCode === item.barCode) {
                    item.stock = mList[j].stock
                  }
                }
                newDetailArr.push(item)
              }
            } else {
              for (let i = 0; i < detailArr.length; i++) {
                let item = detailArr[i]
                item.depotId = depotId
                newDetailArr.push(item)
              }
            }
            this.materialTable.dataSource = newDetailArr
          }
        })
      })
    },
    depotModalFormOk() {
      this.initDepot()
    },
    accountModalFormOk() {
      this.initAccount(1)
    },
    workflowModalFormOk() {
      this.close()
    },
    onAdded(event) {
      let that = this
      const { row, target } = event
      target.setValues([{rowKey: row.id, values: {operNumber:0}}])
      //
      setTimeout(function(){
        that.$refs.materialDataTable.resetScrollTop((target.rows.length+1)*that.$refs.materialDataTable.rowHeight)
      },1000)
      if(this.currentSelectDepotId) {
        //Bill / DocumentWarehouse，CurrentWarehouse
        target.setValues([{rowKey: row.id, values: {depotId: this.currentSelectDepotId}}])
      } else {
        getAction('/depot/findDepotByCurrentUser').then((res) => {
          if (res.code === 200) {
            let arr = res.data
            if(arr.length===1) {
              target.setValues([{rowKey: row.id, values: {depotId: arr[0].id+''}}])
            } else {
              for (let i = 0; i < arr.length; i++) {
                if(arr[i].isDefault){
                  target.setValues([{rowKey: row.id, values: {depotId: arr[i].id+''}}])
                }
              }
            }
          }
        })
      }
    },
    //
    onValueChange(event) {
      let that = this
      const { type, row, column, value, target } = event
      let param,snList,batchNumber,operNumber,unitPrice,allPrice,taxRate,taxMoney,taxLastMoney
      switch(column.key) {
        case "depotId":
          that.currentSelectDepotId = row.depotId
          if(row.barCode){
            that.getStockByDepotBarCode(row, target)
          }
          break;
        case "barCode":
          param = {
            barCode: value,
            organId: this.form.getFieldValue('organId'),
            mpList: getMpListShort(Vue.ls.get('materialPropertyList')),  //Extension / CustomProperty
            prefixNo: this.prefixNo
          }
          getMaterialByBarCode(param).then((res) => {
            if (res && res.code === 200) {
              let mList = res.data
              if (value.indexOf(',') > -1) {
                //Bar code
                this.$refs.materialDataTable.getValues((error, values) => {
                  values.pop()  //Data
                  let mArr = values
                  for (let i = 0; i < mList.length; i++) {
                    let mInfo = mList[i]
                    this.changeColumnShow(mInfo)
                    let mObj = this.parseInfoToObj(mInfo)
                    mObj.depotId = mInfo.depotId
                    mObj.stock = mInfo.stock
                    mObj.snList = ''
                    mObj.batchNumber = ''
                    mObj.expirationDate = ''
                    mArr.push(mObj)
                  }
                  let allPriceTotal = 0
                  let taxLastMoneyTotal = 0
                  for (let j = 0; j < mArr.length; j++) {
                    allPriceTotal += mArr[j].allPrice-0
                    taxLastMoneyTotal += mArr[j].taxLastMoney-0
                    //andBill / DocumentMaterial / ProductTypeNew
                    if(j===0) {
                      mArr[0].mType = '组合件'
                    } else {
                      mArr[j].mType = '普通子件'
                    }
                  }
                  this.materialTable.dataSource = mArr
                  if(this.prefixNo ==='LSCK' || this.prefixNo ==='LSTH') {
                    target.statisticsColumns.allPrice = allPriceTotal
                  } else {
                    target.statisticsColumns.taxLastMoney = taxLastMoneyTotal
                  }
                  that.autoChangePrice(target)
                  //
                  target.$forceUpdate()
                })
              } else {
                //SingleBar code
                let depotIdSelected = this.prefixNo !== 'CGDD' && this.prefixNo !== 'XSDD'? row.depotId: ''
                findStockByDepotAndBarCode({ depotId: depotIdSelected, barCode: row.barCode }).then((res) => {
                  if (res && res.code === 200) {
                    let mArr = []
                    let mInfo = mList[0]
                    this.changeColumnShow(mInfo)
                    let mInfoEx = this.parseInfoToObj(mInfo)
                    mInfoEx.stock = res.data.stock
                    mInfoEx.snList = ''
                    mInfoEx.batchNumber = ''
                    mInfoEx.expirationDate = ''
                    let mObj = {
                      rowKey: row.id,
                      values: mInfoEx
                    }
                    mArr.push(mObj)
                    target.setValues(mArr);
                    target.recalcAllStatisticsColumns()
                    that.autoChangePrice(target)
                    target.autoSelectBySpecialKey('operNumber', row.orderNum)
                    //
                    target.$forceUpdate()
                  }
                })
              }
            }
          });
          break;
        case "snList":
          snList = value
          if(snList) {
            snList = snList.replaceAll('，',',')
            let snArr = snList.split(',')
            operNumber = snArr.length
            taxRate = row.taxRate-0 //
            unitPrice = row.unitPrice-0 //
            allPrice = (unitPrice*operNumber).toFixed(2)-0
            if(this.materialPriceTaxFlag) {
              let realAllPrice = (allPrice/(1+taxRate*0.01)).toFixed(2)-0
              taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
              taxLastMoney = allPrice
            } else {
              taxMoney =((taxRate*0.01)*allPrice).toFixed(2)-0
              taxLastMoney = (allPrice + taxMoney).toFixed(2)-0
            }
            target.setValues([{rowKey: row.id, values: {operNumber: operNumber, allPrice: allPrice, taxMoney: taxMoney, taxLastMoney: taxLastMoney}}])
            target.recalcAllStatisticsColumns()
            that.autoChangePrice(target)
          }
          break;
        case "batchNumber":
          //OnlyRetailOutbound、SalesOutbound、Purchase、OtherOutbound
          if(this.prefixNo === 'LSCK' || this.prefixNo === 'XSCK' || this.prefixNo === 'CGTH' || this.prefixNo === 'QTCK') {
            batchNumber = value
            let depotItemId = ''
            if(this.model.id) {
              //OnlyHasPageGetDetailsid
              let rowId = row.id
              if(rowId.length<=19) {
                depotItemId = rowId-0
              }
            }
            getBatchNumberList({name:'', depotItemId: depotItemId, depotId: row.depotId, barCode: row.barCode, batchNumber: batchNumber}).then((res) => {
              if (res && res.code === 200) {
                if(res.data && res.data.rows) {
                  let info = res.data.rows[0]
                  let preNumber = row.preNumber-0 //Quantity
                  let finishNumber = row.finishNumber-0 //AlreadyOutbound
                  let totalNum = info.totalNum-0 //BatchQuantity
                  if(preNumber > 0) {
                    if(totalNum > preNumber - finishNumber) {
                      operNumber = preNumber - finishNumber
                    } else {
                      operNumber = totalNum
                    }
                  } else {
                    operNumber = totalNum
                  }
                  taxRate = row.taxRate-0 //
                  unitPrice = row.unitPrice-0 //
                  allPrice = (unitPrice*operNumber).toFixed(2)-0
                  if(this.materialPriceTaxFlag) {
                    let realAllPrice = (allPrice/(1+taxRate*0.01)).toFixed(2)-0
                    taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
                    taxLastMoney = allPrice
                  } else {
                    taxMoney =((taxRate*0.01)*allPrice).toFixed(2)-0
                    taxLastMoney = (allPrice + taxMoney).toFixed(2)-0
                  }
                  target.setValues([{rowKey: row.id, values: {expirationDate: info.expirationDateStr, operNumber: operNumber,
                      allPrice: allPrice, taxMoney: taxMoney, taxLastMoney: taxLastMoney}}])
                  target.recalcAllStatisticsColumns()
                  that.autoChangePrice(target)
                }
              }
            })
          }
          break;
        case "operNumber":
          operNumber = value-0
          taxRate = row.taxRate-0 //
          unitPrice = row.unitPrice-0 //
          allPrice = (unitPrice*operNumber).toFixed(2)-0
          if(this.materialPriceTaxFlag) {
            let realAllPrice = (allPrice/(1+taxRate*0.01)).toFixed(2)-0
            taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
            taxLastMoney = allPrice
          } else {
            taxMoney =((taxRate*0.01)*allPrice).toFixed(2)-0
            taxLastMoney = (allPrice + taxMoney).toFixed(2)-0
          }
          target.setValues([{rowKey: row.id, values: {allPrice: allPrice, taxMoney: taxMoney, taxLastMoney: taxLastMoney}}])
          target.recalcAllStatisticsColumns()
          that.autoChangePrice(target)
          break;
        case "unitPrice":
          operNumber = row.operNumber-0 //Quantity
          unitPrice = value-0 //
          taxRate = row.taxRate-0 //
          allPrice = (unitPrice*operNumber).toFixed(2)-0
          if(this.materialPriceTaxFlag) {
            let realAllPrice = (allPrice/(1+taxRate*0.01)).toFixed(2)-0
            taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
            taxLastMoney = allPrice
          } else {
            taxMoney =((taxRate*0.01)*allPrice).toFixed(2)-0
            taxLastMoney = (allPrice + taxMoney).toFixed(2)-0
          }
          target.setValues([{rowKey: row.id, values: {allPrice: allPrice, taxMoney: taxMoney, taxLastMoney: taxLastMoney}}])
          target.recalcAllStatisticsColumns()
          that.autoChangePrice(target)
          break;
        case "allPrice":
          operNumber = row.operNumber-0 //Quantity
          taxRate = row.taxRate-0 //
          allPrice = value-0
          unitPrice = (allPrice/operNumber).toFixed(4)-0 //
          if(this.materialPriceTaxFlag) {
            let realAllPrice = (allPrice/(1+taxRate*0.01)).toFixed(2)-0
            taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
            taxLastMoney = allPrice
          } else {
            taxMoney =((taxRate*0.01)*allPrice).toFixed(2)-0
            taxLastMoney = (allPrice + taxMoney).toFixed(2)-0
          }
          target.setValues([{rowKey: row.id, values: {unitPrice: unitPrice, taxMoney: taxMoney, taxLastMoney: taxLastMoney}}])
          target.recalcAllStatisticsColumns()
          that.autoChangePrice(target)
          break;
        case "taxRate":
          operNumber = row.operNumber-0 //Quantity
          allPrice = row.allPrice-0
          unitPrice = row.unitPrice-0
          taxRate = value-0 //
          if(this.materialPriceTaxFlag) {
            let realAllPrice = (allPrice/(1+taxRate*0.01)).toFixed(2)-0
            taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
            taxLastMoney = allPrice
          } else {
            taxMoney =((taxRate*0.01)*allPrice).toFixed(2)-0
            taxLastMoney = (allPrice + taxMoney).toFixed(2)-0
          }
          target.setValues([{rowKey: row.id, values: {taxMoney: taxMoney, taxLastMoney: taxLastMoney}}])
          target.recalcAllStatisticsColumns()
          that.autoChangePrice(target)
          break;
        case "taxLastMoney":
          operNumber = row.operNumber-0 //Quantity
          taxLastMoney = value-0
          taxRate = row.taxRate-0 //
          if(this.materialPriceTaxFlag) {
            allPrice = taxLastMoney
            unitPrice = (taxLastMoney/operNumber).toFixed(4)-0
            if(taxRate) {
              let realAllPrice = (allPrice/(1+taxRate*0.01)).toFixed(2)-0
              taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
            } else {
              //for0，Process
              taxMoney = 0
            }
          } else {
            if(taxRate) {
              unitPrice = (taxLastMoney/operNumber/(1+taxRate*0.01)).toFixed(4)-0
              allPrice = (unitPrice*operNumber).toFixed(2)-0
              taxMoney =(taxLastMoney-allPrice).toFixed(2)-0
            } else {
              //for0，Process
              allPrice = taxLastMoney
              unitPrice = (allPrice/operNumber).toFixed(4)-0 //
              taxMoney = 0
            }
          }
          target.setValues([{rowKey: row.id, values: {unitPrice: unitPrice, allPrice: allPrice, taxMoney: taxMoney}}])
          target.recalcAllStatisticsColumns()
          that.autoChangePrice(target)
          break;
      }
    },
    //forMaterial / ProductObject
    parseInfoToObj(mInfo) {
      return {
        barCode: mInfo.mBarCode,
        name: mInfo.name,
        standard: mInfo.standard,
        model: mInfo.model,
        color: mInfo.color,
        brand: mInfo.brand,
        mfrs: mInfo.mfrs,
        otherField1: mInfo.otherField1,
        otherField2: mInfo.otherField2,
        otherField3: mInfo.otherField3,
        unit: mInfo.commodityUnit,
        sku: mInfo.sku,
        operNumber: 1,
        unitPrice: mInfo.billPrice,
        allPrice: mInfo.billPrice,
        taxRate: mInfo.taxRate,
        taxMoney: mInfo.taxMoney,
        taxLastMoney: mInfo.taxLastMoney
      }
    },
    //、、Extension / CustomInfo、skuetc.forHide
    changeColumnHide() {
      this.changeFormTypes(this.materialTable.columns, 'model', 0)
      this.changeFormTypes(this.materialTable.columns, 'color', 0)
      this.changeFormTypes(this.materialTable.columns, 'brand', 0)
      this.changeFormTypes(this.materialTable.columns, 'mfrs', 0)
      this.changeFormTypes(this.materialTable.columns, 'otherField1', 0)
      this.changeFormTypes(this.materialTable.columns, 'otherField2', 0)
      this.changeFormTypes(this.materialTable.columns, 'otherField3', 0)
      this.changeFormTypes(this.materialTable.columns, 'sku', 0)
    },
    //sku、Serial Number、、etc.forDisplay
    changeColumnShow(info) {
      if(info.model) {
        this.changeFormTypes(this.materialTable.columns, 'model', 1)
      }
      if(info.color) {
        this.changeFormTypes(this.materialTable.columns, 'color', 1)
      }
      if(info.brand) {
        this.changeFormTypes(this.materialTable.columns, 'brand', 1)
      }
      if(info.mfrs) {
        this.changeFormTypes(this.materialTable.columns, 'mfrs', 1)
      }
      if(info.otherField1) {
        this.changeFormTypes(this.materialTable.columns, 'otherField1', 1)
      }
      if(info.otherField2) {
        this.changeFormTypes(this.materialTable.columns, 'otherField2', 1)
      }
      if(info.otherField3) {
        this.changeFormTypes(this.materialTable.columns, 'otherField3', 1)
      }
      if(info.sku) {
        this.changeFormTypes(this.materialTable.columns, 'sku', 1)
      }
      if(info.enableSerialNumber === "1") {
        //EnableInbound，Typeetc.Purchase、Purchase、Sales、Sales，Skip
        if(this.inOutManageFlag && (this.prefixNo === 'CGRK' || this.prefixNo === 'CGTH' || this.prefixNo === 'XSCK' || this.prefixNo === 'XSTH')) {
          //Skip
        } else {
          this.changeFormTypes(this.materialTable.columns, 'snList', 1)
        }
      }
      if(info.enableBatchNumber === "1") {
        //EnableInbound，Typeetc.Purchase、Purchase、Sales、Sales，Skip
        if(this.inOutManageFlag && (this.prefixNo === 'CGRK' || this.prefixNo === 'CGTH' || this.prefixNo === 'XSCK' || this.prefixNo === 'XSTH')) {
          //Skip
        } else {
          this.changeFormTypes(this.materialTable.columns, 'batchNumber', 1)
          this.changeFormTypes(this.materialTable.columns, 'expirationDate', 1)
        }
      }
    },
    //Deleteor
    onDeleted(ids, target) {
      target.recalcAllStatisticsColumns()
      this.autoChangePrice(target)
    },
    //RootWarehouseandBar codeQueryInventory / Stock
    getStockByDepotBarCode(row, target){
      findStockByDepotAndBarCode({ depotId: row.depotId, barCode: row.barCode }).then((res) => {
        if (res && res.code === 200) {
          target.setValues([{rowKey: row.id, values: {stock: res.data.stock}}])
          target.recalcAllStatisticsColumns()
        }
      })
    },
    //、、Debt
    autoChangePrice(target) {
      let allTaxLastMoney = target.statisticsColumns.taxLastMoney-0
      let discount = this.form.getFieldValue('discount')-0
      let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
      let deposit = this.form.getFieldValue('deposit')
      let discountMoney = (discount*0.01*allTaxLastMoney).toFixed(2)-0
      let discountLastMoney = (allTaxLastMoney-discountMoney).toFixed(2)-0
      let changeAmountNew = (discountLastMoney + otherMoney).toFixed(2)-0
      if(deposit) {
        changeAmountNew = (changeAmountNew - deposit).toFixed(2)-0
      }
      this.$nextTick(() => {
        changeAmountNew = this.prefixNo === 'CGDD' || this.prefixNo === 'XSDD'?0:changeAmountNew
        this.form.setFieldsValue({'discount':discount,'discountMoney':discountMoney,'discountLastMoney':discountLastMoney,
          'changeAmount':changeAmountNew,'debt':0})
        this.setZeroChangeAmount()
      });
    },
    //
    onChangeDiscount(e) {
      const value = e.target.value-0
      let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
      let deposit = this.form.getFieldValue('deposit')
      let allTaxLastMoney = this.$refs.materialDataTable.statisticsColumns.taxLastMoney-0
      let discountMoneyNew = (allTaxLastMoney*value*0.01).toFixed(2)-0
      let discountLastMoneyNew = (allTaxLastMoney - discountMoneyNew).toFixed(2)-0
      let changeAmountNew = (discountLastMoneyNew + otherMoney).toFixed(2)-0
      if(deposit) {
        changeAmountNew = (changeAmountNew - deposit).toFixed(2)-0
      }
      this.$nextTick(() => {
        changeAmountNew = this.prefixNo === 'CGDD' || this.prefixNo === 'XSDD'?0:changeAmountNew
        this.form.setFieldsValue({'discountMoney':discountMoneyNew,'discountLastMoney':discountLastMoneyNew,
          'changeAmount':changeAmountNew,'debt':0})
        this.setZeroChangeAmount()
      });
    },
    //
    onChangeDiscountMoney(e) {
      const value = e.target.value-0
      let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
      let deposit = this.form.getFieldValue('deposit')
      let allTaxLastMoney = this.$refs.materialDataTable.statisticsColumns.taxLastMoney-0
      let discountNew = (value/allTaxLastMoney*100).toFixed(2)-0
      let discountLastMoneyNew = (allTaxLastMoney - value).toFixed(2)-0
      let changeAmountNew = (discountLastMoneyNew + otherMoney).toFixed(2)-0
      if(deposit) {
        changeAmountNew = (changeAmountNew - deposit).toFixed(2)-0
      }
      this.$nextTick(() => {
        changeAmountNew = this.prefixNo === 'CGDD' || this.prefixNo === 'XSDD'?0:changeAmountNew
        this.form.setFieldsValue({'discount':discountNew,'discountLastMoney':discountLastMoneyNew,
          'changeAmount':changeAmountNew,'debt':0})
        this.setZeroChangeAmount()
      });
    },
    //Other
    onChangeOtherMoney(e) {
      const value = e.target.value-0
      let discountLastMoney = this.form.getFieldValue('discountLastMoney')-0
      let deposit = this.form.getFieldValue('deposit')
      let changeAmountNew = (discountLastMoney + value).toFixed(2)-0
      if(deposit) {
        changeAmountNew = (changeAmountNew - deposit).toFixed(2)-0
      }
      this.$nextTick(() => {
        this.form.setFieldsValue({'changeAmount':changeAmountNew, 'debt':0})
        this.setZeroChangeAmount()
      });
    },
    //Deposit
    onChangeDeposit(e){
      const value = e.target.value-0
      let discountLastMoney = this.form.getFieldValue('discountLastMoney')-0
      let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
      let changeAmountNew = (discountLastMoney + otherMoney).toFixed(2)-0
      if(value) {
        changeAmountNew = (changeAmountNew - value).toFixed(2)-0
      }
      this.$nextTick(() => {
        this.form.setFieldsValue({'changeAmount':changeAmountNew, 'debt':0})
        this.setZeroChangeAmount()
      });
    },
    //
    onChangeChangeAmount(e) {
      const value = e.target.value-0
      let discountLastMoney = this.form.getFieldValue('discountLastMoney')-0
      let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
      let deposit = this.form.getFieldValue('deposit')
      let debtNew = (discountLastMoney + otherMoney - value).toFixed(2)-0
      if(deposit) {
        debtNew = (debtNew - deposit).toFixed(2)-0
      }
      this.$nextTick(() => {
        this.form.setFieldsValue({'debt':debtNew})
      });
    },
    //SwitchCustomerInfoMaterial / Product
    handleOrganChange(value) {
      let organId = value
      this.getAllTable().then(tables => {
        return getListData(this.form, tables)
      }).then(allValues => {
        let detailArr = allValues.tablesValue[0].values
        let barCodeStr = ''
        for(let detail of detailArr){
          if(detail.barCode) {
            barCodeStr += detail.barCode + ','
          }
        }
        if(barCodeStr) {
          let param = {
            barCode: barCodeStr,
            organId: organId,
            mpList: getMpListShort(Vue.ls.get('materialPropertyList')),  //Extension / CustomProperty
            prefixNo: this.prefixNo
          }
          getMaterialByBarCode(param).then((res) => {
            if (res && res.code === 200) {
              let allLastMoney = 0
              let allTaxLastMoney = 0
              //GetBill / DocumentDetailsListInfo
              let detailArr = allValues.tablesValue[0].values
              //NewList，StoreBill / DocumentDetailsInfo
              let newDetailArr = []
              for(let detail of detailArr){
                if(detail.barCode) {
                  //Bar code，Quantity1
                  let mList = res.data
                  for (let i = 0; i < mList.length; i++) {
                    if(detail.barCode === mList[i].mBarCode) {
                      //Material / Product，NeedsNewAmountand
                      let taxRate = detail.taxRate-0 //
                      detail.unitPrice = mList[i].billPrice-0 //
                      detail.allPrice = (detail.unitPrice*detail.operNumber).toFixed(2)-0
                      if(this.materialPriceTaxFlag) {
                        let realAllPrice = (detail.allPrice/(1+taxRate*0.01)).toFixed(2)-0
                        detail.taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
                        detail.taxLastMoney = detail.allPrice
                      } else {
                        detail.taxMoney = ((taxRate*0.01)*detail.allPrice).toFixed(2)-0
                        detail.taxLastMoney = (detail.allPrice + detail.taxMoney).toFixed(2)-0
                      }
                    }
                  }
                  newDetailArr.push(detail)
                }
              }
              this.materialTable.dataSource = newDetailArr
              //NewAmount、etc.Info
              for(let newDetail of newDetailArr){
                allLastMoney = allLastMoney + (newDetail.allPrice-0)
                allTaxLastMoney = allTaxLastMoney + (newDetail.taxLastMoney-0)
              }
              let discount = this.form.getFieldValue('discount')-0
              let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
              let deposit = this.form.getFieldValue('deposit')
              let discountMoney = (discount*0.01*allTaxLastMoney).toFixed(2)-0
              let discountLastMoney = (allTaxLastMoney-discountMoney).toFixed(2)-0
              let changeAmountNew = (discountLastMoney + otherMoney).toFixed(2)-0
              if(deposit) {
                changeAmountNew = (changeAmountNew - deposit).toFixed(2)-0
              }
              this.$nextTick(() => {
                changeAmountNew = this.prefixNo === 'XSDD'?0:changeAmountNew
                this.form.setFieldsValue({'discount':discount,'discountMoney':discountMoney,'discountLastMoney':discountLastMoney,
                  'changeAmount':changeAmountNew,'debt':0})
                this.setZeroChangeAmount()
              });
            }
          })
        }
      })
    },
    //SwitchAmountfor0
    setZeroChangeAmount() {
      if(this.prefixNo === 'CGRK'||this.prefixNo === 'CGTH'||this.prefixNo === 'XSCK'||this.prefixNo === 'XSTH') {
        if(this.zeroChangeAmountFlag) {
          let oldChangeAmount = this.form.getFieldValue('changeAmount')-0
          this.form.setFieldsValue({'changeAmount':0, 'debt':oldChangeAmount})
        }
      }
    },
    scanEnter() {
      this.scanStatus = false
      this.$nextTick(() => {
        this.$refs.scanBarCode.focus()
      })
    },
    //
    scanPressEnter() {
      let that = this
      if(this.scanBarCode) {
        this.getAllTable().then(tables => {
          return getListData(this.form, tables)
        }).then(allValues => {
          let param = {
            barCode: this.scanBarCode.trim(),
            organId: this.form.getFieldValue('organId'),
            mpList: getMpListShort(Vue.ls.get('materialPropertyList')),  //Extension / CustomProperty
            prefixNo: this.prefixNo
          }
          getMaterialByBarCode(param).then((res) => {
            if (res && res.code === 200) {
              let hasFinished = false
              let allLastMoney = 0
              let allTaxLastMoney = 0
              //GetBill / DocumentDetailsListInfo
              let detailArr = allValues.tablesValue[0].values
              //NewList，StoreBill / DocumentDetailsInfo
              let newDetailArr = []
              let hasAdd = false
              for(let detail of detailArr){
                if(detail.barCode) {
                  //andBar code，Quantity1
                  if(detail.barCode === this.scanBarCode.trim() && !hasAdd) {
                    detail.operNumber = (detail.operNumber-0)+1
                    //Material / ProductQuantity，NeedsNewAmountand
                    let taxRate = detail.taxRate-0 //
                    let unitPrice = detail.unitPrice-0 //
                    detail.allPrice = (unitPrice*detail.operNumber).toFixed(2)-0
                    if(this.materialPriceTaxFlag) {
                      let realAllPrice = (detail.allPrice/(1+taxRate*0.01)).toFixed(2)-0
                      detail.taxMoney = (realAllPrice*taxRate*0.01).toFixed(2)-0
                      detail.taxLastMoney = detail.allPrice
                    } else {
                      detail.taxMoney = ((taxRate*0.01)*detail.allPrice).toFixed(2)-0
                      detail.taxLastMoney = (detail.allPrice + detail.taxMoney).toFixed(2)-0
                    }
                    hasFinished = true
                    hasAdd = true
                  }
                  //andSerial Number，Skip
                  if(detail.snList === this.scanBarCode.trim()) {
                    this.$message.warning('抱歉，已经扫描过该序列号！');
                    hasFinished = true
                  }
                  newDetailArr.push(detail)
                }
              }
              if(!hasFinished) {
                //Bar codeCorrespondingMaterial / ProductList
                let item = {}
                let mList = res.data
                if(mList && mList.length>0) {
                  let mInfo = mList[0]
                  this.changeColumnShow(mInfo)
                  item.depotId = mInfo.depotId
                  item.barCode = mInfo.mBarCode
                  item.name = mInfo.name
                  item.standard = mInfo.standard
                  item.model = mInfo.model
                  item.color = mInfo.color
                  item.materialOther = mInfo.materialOther
                  item.stock = mInfo.stock
                  item.unit = mInfo.commodityUnit
                  item.sku = mInfo.sku
                  if(mInfo.mBarCode !== this.scanBarCode.trim()) {
                    if(this.prefixNo ==='LSCK' || this.prefixNo ==='CGTH' || this.prefixNo ==='XSCK' || this.prefixNo ==='QTCK') {
                      //Serial Number
                      item.snList = this.scanBarCode.trim()
                    }
                  }
                  item.operNumber = 1
                  item.unitPrice = mInfo.billPrice
                  item.allPrice = mInfo.billPrice
                  item.taxRate = mInfo.taxRate
                  item.taxMoney = mInfo.taxMoney
                  item.taxLastMoney = mInfo.taxLastMoney
                  newDetailArr.push(item)
                } else {
                  this.$message.warning('抱歉，此条码不存在商品信息！');
                }
              }
              //andBill / DocumentMaterial / ProductTypeNew
              for(let i=0; i< newDetailArr.length; i++) {
                if(i===0) {
                  newDetailArr[0].mType = '组合件'
                } else {
                  newDetailArr[i].mType = '普通子件'
                }
              }
              this.materialTable.dataSource = newDetailArr
              //NewAmount、etc.Info
              for(let newDetail of newDetailArr){
                allLastMoney = allLastMoney + (newDetail.allPrice-0)
                allTaxLastMoney = allTaxLastMoney + (newDetail.taxLastMoney-0)
              }
              let discount = this.form.getFieldValue('discount')-0
              let otherMoney = this.form.getFieldValue('otherMoney')?this.form.getFieldValue('otherMoney')-0:0
              let deposit = this.form.getFieldValue('deposit')
              let discountMoney = (discount*0.01*allTaxLastMoney).toFixed(2)-0
              let discountLastMoney = (allTaxLastMoney-discountMoney).toFixed(2)-0
              let changeAmountNew = (discountLastMoney + otherMoney).toFixed(2)-0
              if(deposit) {
                changeAmountNew = (changeAmountNew - deposit).toFixed(2)-0
              }
              if(this.prefixNo === 'LSCK' || this.prefixNo === 'LSTH') {
                this.$nextTick(() => {
                  this.form.setFieldsValue({'changeAmount':allLastMoney,'getAmount':allLastMoney,'backAmount':0})
                });
              } else {
                this.$nextTick(() => {
                  changeAmountNew = this.prefixNo === 'CGDD' || this.prefixNo === 'XSDD'?0:changeAmountNew
                  this.form.setFieldsValue({'discount':discount,'discountMoney':discountMoney,'discountLastMoney':discountLastMoney,
                    'changeAmount':changeAmountNew,'debt':0})
                });
              }
              //
              this.scanBarCode = ''
              this.$refs.scanBarCode.focus()
              //
              setTimeout(function(){
                that.$refs.materialDataTable.resetScrollTop((newDetailArr.length+1)*that.$refs.materialDataTable.rowHeight)
              },1000)
            }
          })
        })
      }
    },
    stopScan() {
      this.scanStatus = true
      this.scanBarCode = ''
    },
    onImport(prefixNo) {
      this.$refs.importItemModalForm.add(prefixNo);
    },
    importItemModalFormOk(data) {
      this.materialTable.dataSource = data
      this.$nextTick(() => {
        let discountLastMoney = 0
        for (let i = 0; i < data.length; i++) {
          discountLastMoney += data[i].taxLastMoney
          this.changeColumnShow(data[i])
        }
        let changeAmount = 0
        let debt = 0
        if(this.prefixNo === 'CGRK' || this.prefixNo === 'XSCK') {
          if(this.zeroChangeAmountFlag) {
            changeAmount = 0
            debt = discountLastMoney
          } else {
            changeAmount = discountLastMoney
            debt = 0
          }
        }
        this.form.setFieldsValue({'discountLastMoney':discountLastMoney, 'changeAmount':changeAmount, 'debt': debt})
      });
    },
    //Approve
    handleOkAndCheck() {
      this.billStatus = '1'
      this.handleOk()
    },
    //
    handleOkOnly() {
      this.billStatus = '0'
      this.handleOk()
    },
    //
    handleWorkflow() {
      if(this.model && this.model.number) {
        getPlatformConfigByKey({ "platformKey": "send_workflow_url" }).then((res) => {
          if (res && res.code === 200) {
            let sendWorkflowUrl = res.data.platformValue + '&no=' + this.model.number + '&type=1'
            this.$refs.modalWorkflow.show(this.model, sendWorkflowUrl, this.model.number, 1, 320)
            this.$refs.modalWorkflow.title = "发起流程"
          }
        })
      } else {
        this.$message.warning('请先保存单据后再提交流程！');
      }
    },
    //New
    handlePrintPro(billType) {
      if(this.model.id) {
        getPlatformConfigByKey({"platformKey": "bill_print_pro_url"}).then((res)=> {
          if (res && res.code === 200) {
            let billPrintUrl = res.data.platformValue + '&no=' + this.model.number
            let billPrintHeight = document.documentElement.clientHeight - 260
            this.$refs.modalPrintPro.show(this.model, billPrintUrl, billPrintHeight)
            this.$refs.modalPrintPro.title = billType + "-三联打印-新版"
          }
        })
      } else {
        this.$message.warning('请先保存单据后再打印！');
      }
    },
    //
    handlePrint(billType) {
      if(this.model.id) {
        getPlatformConfigByKey({"platformKey": "bill_print_url"}).then((res)=> {
          if (res && res.code === 200) {
            let billPrintUrl = res.data.platformValue + '&no=' + this.model.number
            let billPrintHeight = this.materialTable.dataSource.length*50 + 600
            this.$refs.modalPrint.show(this.model, billPrintUrl, billPrintHeight)
            this.$refs.modalPrint.title = billType + "-三联打印"
          }
        })
      } else {
        this.$message.warning('请先保存单据后再打印！');
      }
    },
    //PlatformConfigInfo
    initPlatform() {
      getPlatformConfigByKey({"platformKey": "bill_print_flag"}).then((res)=> {
        if (res && res.code === 200) {
          this.billPrintFlag = res.data.platformValue==='1'?true:false
        }
      })
    },
    //Button：Supplier、Customer、Member、Settlement Account、Warehouse
    initQuickBtn() {
      let btnStrList = Vue.ls.get('winBtnStrList') //ButtonFunctionList JSON
      if (btnStrList) {
        for (let i = 0; i < btnStrList.length; i++) {
          if (btnStrList[i].btnStr) {
            this.quickBtn.vendor = btnStrList[i].url === '/system/vendor'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.vendor
            this.quickBtn.customer = btnStrList[i].url === '/system/customer'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.customer
            this.quickBtn.member = btnStrList[i].url === '/system/member'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.member
            this.quickBtn.account = btnStrList[i].url === '/system/account'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.account
            this.quickBtn.depot = btnStrList[i].url === '/system/depot'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.depot
          }
        }
      }
    },
    //Extension / CustomField
    handleChangeOtherField() {
      let mpStr = getMpListShort(Vue.ls.get('materialPropertyList'))
      if(mpStr) {
        let mpArr = mpStr.split(',')
        if(mpArr.length ===3) {
          for (let i = 0; i < this.materialTable.columns.length; i++) {
            if(this.materialTable.columns[i].key === 'otherField1') {
              this.materialTable.columns[i].title = mpArr[0]
            }
            if(this.materialTable.columns[i].key === 'otherField2') {
              this.materialTable.columns[i].title = mpArr[1]
            }
            if(this.materialTable.columns[i].key === 'otherField3') {
              this.materialTable.columns[i].title = mpArr[2]
            }
          }
        }
      }
    }
  }
}