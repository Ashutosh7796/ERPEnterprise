import {findBySelectSup,findBySelectCus,findBySelectRetail,findBySelectOrgan,getPlatformConfigByKey,getAccount,
  getPersonByType,findInOutItemByParam,getCurrentSystemConfig} from '@/api/api'
import { getAction } from '@/api/manage'
import { getCheckFlag, getNowFormatDateTime } from "@/utils/util"
import { USER_INFO } from "@/store/mutation-types"
import Vue from 'vue'

export const FinancialModalMixin = {
  data() {
    return {
      action: '',
      actionWithOrgan: false,
      supList: [],
      cusList: [],
      retailList: [],
      organList: [],
      personList: [],
      accountList: [],
      billStatus: '0',
      isCanCheck: true,
      quickBtn: {
        vendor: false,
        customer: false,
        account: false,
        person: false,
        inOutItem: false
      },
      /* ApproveYesNoEnable */
      checkFlag: true,
      setTimeFlag: null,
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
        this.handleOk()
        e.preventDefault()
      }
    },
    addInit(amountNum) {
      getAction('/sequence/buildNumber').then((res) => {
        if (res && res.code === 200) {
          this.form.setFieldsValue({'billNo':amountNum + res.data.defaultNumber})
        }
      })
      this.$nextTick(() => {
        this.form.setFieldsValue({'billTime':getNowFormatDateTime(), 'totalPrice': 0, 'discountMoney': 0, 'changeAmount': 0})
      })
      this.$nextTick(() => {
        getAccount({}).then((res)=>{
          if(res && res.code === 200) {
            for (const item of res.data.accountList) {
              if(item.isDefault){
                this.form.setFieldsValue({'accountId': item.id})
              }
            }
          }
        })
      })
    },
    initSystemConfig() {
      getCurrentSystemConfig().then((res) => {
        if(res.code === 200 && res.data){
          let multiBillType = res.data.multiBillType
          let multiLevelApprovalFlag = res.data.multiLevelApprovalFlag
          this.checkFlag = getCheckFlag(multiBillType, multiLevelApprovalFlag, this.prefixNo)
        }
      })
    },
    initSupplier() {
      let that = this;
      findBySelectSup({organId: this.model.organId, limit:1}).then((res)=>{
        if(res) {
          that.supList = res;
        }
      });
    },
    initCustomer() {
      let that = this;
      findBySelectCus({organId: this.model.organId, limit:1}).then((res)=>{
        if(res) {
          that.cusList = res;
        }
      });
    },
    initOrgan() {
      let that = this;
      findBySelectOrgan({organId: this.model.organId, limit:1}).then((res)=>{
        if(res) {
          that.organList = res;
        }
      });
    },
    initRetail() {
      let that = this;
      findBySelectRetail({organId: this.model.organId, limit:1}).then((res)=>{
        if(res) {
          that.retailList = res;
        }
      });
    },
    initPerson() {
      let that = this;
      getPersonByType({type:'财务员'}).then((res)=>{
        if(res && res.code === 200) {
          that.personList = res.data.personList;
        }
      })
    },
    initInOutItem(type) {
      let that = this;
      findInOutItemByParam({type:type}).then((res)=>{
        if(res) {
          for(let item of that.accountTable.columns){
            if(item.key == 'inOutItemId') {
              item.options = []
              for(let i=0; i<res.length; i++) {
                let inOutItemInfo = {};
                inOutItemInfo.value = res[i].id + '' //-valueforFormat
                inOutItemInfo.text = res[i].name
                inOutItemInfo.title = res[i].name
                item.options.push(inOutItemInfo)
              }
            }
          }
        }
      })
    },
    //-Header table
    initAccount(){
      let that = this;
      getAccount({}).then((res)=>{
        if(res && res.code === 200) {
          that.accountList = res.data.accountList;
        }
      })
    },
    //-Details
    initDetailAccount(){
      let that = this;
      getAccount({}).then((res)=>{
        if(res && res.code === 200) {
          let list = res.data.accountList;
          for(let item of that.accountTable.columns){
            if(item.key == 'accountId') {
              item.options = []
              for(let i=0; i<list.length; i++) {
                let accountInfo = {};
                accountInfo.value = list[i].id + '' //-valueforFormat
                accountInfo.text = list[i].name
                accountInfo.title = list[i].name
                item.options.push(accountInfo)
              }
            }
          }
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
    handleSearchOrgan(value) {
      let that = this
      if(this.setTimeFlag != null){
        clearTimeout(this.setTimeFlag);
      }
      this.setTimeFlag = setTimeout(()=>{
        findBySelectOrgan({key: value, limit:1}).then((res) => {
          if(res) {
            that.organList = res;
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
    //SupplierorCustomer
    onChangeOrgan(value) {
      this.accountTable.dataSource = []
    },
    addSupplier() {
      this.$refs.vendorModalForm.add();
      this.$refs.vendorModalForm.title = "新增";
      this.$refs.vendorModalForm.disableSubmit = false;
    },
    addCustomer() {
      this.$refs.customerModalForm.add();
      this.$refs.customerModalForm.title = "新增客户（提醒：如果找不到新添加的客户，请到用户管理检查是否分配了该客户权限）";
      this.$refs.customerModalForm.disableSubmit = false;
    },
    addAccount() {
      this.$refs.accountModalForm.add();
      this.$refs.accountModalForm.title = "新增结算账户";
      this.$refs.accountModalForm.disableSubmit = false;
    },
    addPerson() {
      this.$refs.personModalForm.add();
      this.$refs.personModalForm.title = "新增经手人";
      this.$refs.personModalForm.disableSubmit = false;
    },
    addInOutItem(type) {
      this.$refs.inOutItemModalForm.add(type);
      this.$refs.inOutItemModalForm.title = "新增收支项目";
      this.$refs.inOutItemModalForm.disableSubmit = false;
    },
    vendorModalFormOk() {
      this.initSupplier()
    },
    customerModalFormOk() {
      this.initCustomer()
    },
    accountModalFormOk() {
      this.initAccount()
    },
    personModalFormOk() {
      this.initPerson()
    },
    inOutItemModalFormOk(type) {
      this.initInOutItem(type)
    },
    workflowModalFormOk() {
      this.close()
    },
    waitNeedListOk(organType, organId, selectBillRows) {
      if(organId) {
        this.form.setFieldsValue({'organId': organId})
        if(organType === '供应商') {
          findBySelectSup({organId: organId, limit:1}).then((res)=> {
            this.supList = res && Array.isArray(res) ? res : [];
          })
        } else if(organType === '客户') {
          findBySelectCus({organId: organId, limit:1}).then((res)=> {
            this.cusList = res && Array.isArray(res) ? res : [];
          })
        }
      }
      if (selectBillRows && selectBillRows.length > 0) {
        this.requestSubTableDataEx(selectBillRows, this.accountTable);
      } else {
        this.selectBeginNeed(organType)
      }
    },
    onAdded(event) {
      let that = this
      const { row, target } = event
      //
      setTimeout(function(){
        that.$refs.accountDataTable.resetScrollTop((target.rows.length+1)*that.$refs.accountDataTable.rowHeight)
      },1000)
    },
    //Deleteor
    onDeleted(ids, target) {
      target.recalcAllStatisticsColumns()
      this.autoChangeAmount(target)
    },
    //
    onValueChange(event) {
      let that = this
      const { type, row, column, value, target } = event
      switch(column.key) {
        case "eachAmount":
          target.recalcAllStatisticsColumns()
          that.autoChangeAmount(target)
          break;
      }
    },
    //Debt
    autoChangeAmount(target) {
      let allEachAmount = target.statisticsColumns.eachAmount-0
      let discountMoney = this.form.getFieldValue('discountMoney')-0
      if(!discountMoney) {
        discountMoney = 0
      }
      let changeAmount = (allEachAmount-discountMoney).toFixed(2)
      this.$nextTick(() => {
        this.form.setFieldsValue({'totalPrice':allEachAmount, 'changeAmount':changeAmount})
      });
    },
    //Amount
    onChangeDiscountMoney(e) {
      const value = e.target.value-0
      let totalPrice = this.form.getFieldValue('totalPrice')-0
      let changeAmount = (totalPrice-value).toFixed(2)
      this.$nextTick(() => {
        this.form.setFieldsValue({'changeAmount':changeAmount})
      });
    },
    //DebtBill / Document
    debtBillListOk(selectBillRows) {
      if(selectBillRows && selectBillRows.length>0) {
        this.requestSubTableDataEx(selectBillRows, this.accountTable);
      }
    },
    /** QuerytabData,DetailsAmount */
    requestSubTableDataEx(selectBillRows, tab, success) {
      tab.loading = true
      let listEx = []
      let changeAmount = 0
      for(let i=0; i<selectBillRows.length; i++){
        let info = selectBillRows[i]
        info.billNumber = info.number
        info.needDebt = info.needDebt
        info.eachAmount = info.debt
        if(info.eachAmount != 0) {
          changeAmount += info.eachAmount-0
          listEx.push(info)
        }
      }
      tab.dataSource = listEx
      this.$nextTick(() => {
        this.form.setFieldsValue({'totalPrice':changeAmount.toFixed(2), 'changeAmount':changeAmount.toFixed(2)})
      });
      typeof success === 'function' ? success(res) : ''
      tab.loading = false
    },
    //Initial
    selectBeginNeed(type) {
      let that = this
      let info = type === '供应商'? '付款':'收款'
      let organId = this.form.getFieldValue('organId')
      if(organId){
        this.$confirm({
          title: "确认操作",
          content: "是否选择期初金额，对期初进行" + info + "?",
          onOk: function () {
            let listEx = []
            let info = {}
            info.billNumber = 'QiChu'
            getAction('/supplier/getBeginNeedByOrganId', {'organId': organId}).then((res)=>{
              if(res.code === 200){
                info.needDebt = res.data.needDebt?res.data.needDebt:0
                info.finishDebt = res.data.finishDebt
                info.eachAmount = res.data.eachAmount
                listEx.push(info)
                that.accountTable.dataSource = listEx
                let changeAmount = info.eachAmount
                if(changeAmount) {
                  changeAmount = changeAmount.toFixed(2)
                }
                that.$nextTick(() => {
                  that.form.setFieldsValue({'totalPrice':changeAmount, 'changeAmount':changeAmount})
                })
              }else{
                that.$message.info(res.data)
              }
            })
          }
        })
      } else {
        that.$message.warning('请选择' + type + '！');
      }
    },
    //-PendingorPending
    handleWaitNeed(type) {
      this.$refs.waitNeedList.show(type)
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
      if(this.model && this.model.billNo) {
        getPlatformConfigByKey({ "platformKey": "send_workflow_url" }).then((res) => {
          if (res && res.code === 200) {
            let sendWorkflowUrl = res.data.platformValue + '&no=' + this.model.billNo + '&type=2'
            this.$refs.modalWorkflow.show(this.model, sendWorkflowUrl, this.model.billNo, 2, 320)
            this.$refs.modalWorkflow.title = "发起流程"
          }
        })
      } else {
        this.$message.warning('请先保存单据后再提交流程！');
      }
    },
    //Button：Supplier、Customer、Settlement Account、
    initQuickBtn() {
      let btnStrList = Vue.ls.get('winBtnStrList') //ButtonFunctionList JSON
      if (btnStrList) {
        for (let i = 0; i < btnStrList.length; i++) {
          if (btnStrList[i].btnStr) {
            this.quickBtn.vendor = btnStrList[i].url === '/system/vendor'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.vendor
            this.quickBtn.customer = btnStrList[i].url === '/system/customer'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.customer
            this.quickBtn.account = btnStrList[i].url === '/system/account'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.account
            this.quickBtn.person = btnStrList[i].url === '/system/person'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.person
            this.quickBtn.inOutItem = btnStrList[i].url === '/system/in_out_item'?btnStrList[i].btnStr.indexOf(1)>-1:this.quickBtn.inOutItem
          }
        }
      }
    }
  }
}