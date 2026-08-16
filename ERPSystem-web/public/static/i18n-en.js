/**
 * jshERP Custom i18n Engine — Exhaustive Chinese to English Translation
 * Self-contained DOM text replacement with MutationObserver + fast interval polling.
 * Zero external services, no page reloads, works across all tabs and dynamic Vue views.
 */
(function() {
  'use strict';

  var dict = {
  "管伊佳ERP": "jshERP Pro",
  "管伊佳": "jshERP",
  "公司test": "Acme Enterprise",
  "测试用户": "Test User",
  "首页": "Dashboard",
  "零售管理": "Retail",
  "采购管理": "Purchasing",
  "销售管理": "Sales",
  "仓库管理": "Inventory",
  "财务管理": "Finance",
  "报表查询": "Reports",
  "商品管理": "Products",
  "基础资料": "Master Data",
  "基础数据": "Master Data",
  "系统管理": "System",
  "零售出库": "Retail Dispatch",
  "零售退货": "Retail Returns",
  "请购单": "Purchase Requisitions",
  "采购订单": "Purchase Orders",
  "采购入库": "Purchase Receipt",
  "采购退货": "Purchase Returns",
  "采购退货出库": "Purchase Return Outbound",
  "销售订单": "Sales Orders",
  "销售出库": "Sales Dispatch",
  "销售退货": "Sales Returns",
  "其它入库": "Other Inbound",
  "其它出库": "Other Outbound",
  "调拨出库": "Stock Transfer",
  "组装单": "Assembly",
  "拆卸单": "Disassembly",
  "收入单": "Income Receipt",
  "支出单": "Payment Voucher",
  "收款单": "Collection Note",
  "付款单": "Payment Note",
  "转账单": "Transfer Note",
  "收预付款": "Advance Receipt",
  "商品库存": "Stock Valuation",
  "进销存统计": "Inventory Flow",
  "入库明细": "Inbound Details",
  "出库明细": "Outbound Details",
  "调拨明细": "Transfer Details",
  "Transfer明细": "Transfer Details",
  "入库汇总": "Inbound Summary",
  "出库汇总": "Outbound Summary",
  "客户对账": "Customer Statement",
  "供应商对账": "Vendor Statement",
  "零售统计": "Retail Trends",
  "采购统计": "Purchase Trends",
  "销售统计": "Sales Trends",
  "账户统计": "Account Stats",
  "商品预警": "Stock Warning",
  "库存预警": "Stock Warning",
  "Stock预警": "Stock Warning",
  "财务统计": "Financial Stats",
  "会员管理": "Members",
  "字典管理": "Dictionaries",
  "商品信息": "Product Info",
  "商品类别": "Categories",
  "计量单位": "Units of Measure",
  "商品单位": "Units of Measure",
  "多属性": "Attributes",
  "仓库信息": "Warehouses",
  "收支项目": "Income/Expense Items",
  "结算账户": "Settlement Account",
  "经手人管理": "Handlers",
  "供应商信息": "Vendors",
  "客户信息": "Customers",
  "会员信息": "Members",
  "经手人信息": "Handlers",
  "用户管理": "Users",
  "角色管理": "Roles",
  "机构管理": "Organizations",
  "部门管理": "Departments",
  "租户管理": "Tenants",
  "日志管理": "Logs",
  "操作日志": "Audit Logs",
  "功能管理": "Functions",
  "系统配置": "System Config",
  "平台配置": "Platform Config",
  "产品审核": "Approval Workflow",
  "今日销售": "Today Sales",
  "今日零售": "Today Retail",
  "今日采购": "Today Purchases",
  "本月累计销售": "MTD Sales",
  "本月累计零售": "MTD Retail",
  "本月累计采购": "MTD Purchases",
  "昨日销售": "Yest. Sales",
  "昨日零售": "Yest. Retail",
  "昨日采购": "Yest. Purchases",
  "今年累计销售": "YTD Sales",
  "今年累计零售": "YTD Retail",
  "今年累计采购": "YTD Purchases",
  "操作": "Action",
  "供应商": "Vendor",
  "客户": "Customer",
  "仓库": "Warehouse",
  "单据编号": "Doc Number",
  "单据日期": "Doc Date",
  "关联单据": "Linked Doc",
  "操作员": "Operator",
  "经手人": "Handler",
  "账户流水": "Account Flow",
  "流水": "Flow",
  "名称": "Name",
  "编号": "Code",
  "条码": "Barcode",
  "商品条码": "Product Barcode",
  "规格": "Spec",
  "型号": "Model",
  "颜色": "Color",
  "品牌": "Brand",
  "制造商": "Mfr.",
  "单位": "Unit",
  "基本单位": "Base Unit",
  "副单位": "Alt Unit",
  "数量": "Qty",
  "单价": "Unit Price",
  "含税单价": "Tax-Incl. Price",
  "金额": "Amount",
  "金额合计": "Total Amount",
  "含税合计": "Tax-Incl. Total",
  "税率": "Tax Rate",
  "税额": "Tax Amount",
  "价税合计": "Total w/ Tax",
  "优惠率": "Discount %",
  "优惠金额": "Discount Amount",
  "退款优惠": "Refund Discount",
  "付款优惠": "Payment Discount",
  "其它费用": "Other Charges",
  "待退金额": "Pending Refund",
  "本次退款": "This Refund",
  "本次欠款": "This Debt",
  "本次付款": "This Payment",
  "本次收款": "This Receipt",
  "账户名称": "Account Name",
  "期初金额": "Opening Bal.",
  "本月发生额": "Monthly Activity",
  "当前余额": "Current Bal.",
  "零售数量": "Retail Qty",
  "零售金额": "Retail Amount",
  "退货数量": "Return Qty",
  "退货金额": "Return Amount",
  "实际零售金额": "Actual Retail Amount",
  "采购数量": "Purchase Qty",
  "采购金额": "Purchase Amount",
  "实际采购金额": "Actual Purchase Amount",
  "销售数量": "Sales Qty",
  "销售金额": "Sales Amount",
  "实际销售金额": "Actual Sales Amount",
  "安全库存": "Safety Stock",
  "库存数量": "Stock Qty",
  "库存": "Stock",
  "初始库存": "Initial Stock",
  "总库存": "Total Stock",
  "可用库存": "Available Stock",
  "重量": "Weight",
  "保质期": "Shelf Life",
  "助记码": "Mnemonic",
  "系统SKU": "System SKU",
  "商品属性": "Properties",
  "自定义": "Custom",
  "批号": "Batch No.",
  "序列号": "Serial No.",
  "启用序列号": "Serial No. Enabled",
  "启用批号": "Batch No. Enabled",
  "上级类别": "Parent Category",
  "类别排序": "Sort Order",
  "状态": "Status",
  "单据状态": "Doc Status",
  "备注": "Remarks",
  "单据备注": "Doc Remarks",
  "序号": "No.",
  "描述": "Description",
  "类型": "Type",
  "创建时间": "Created At",
  "更新时间": "Updated At",
  "创建人": "Created By",
  "合计": "Total",
  "总计": "Grand Total",
  "新增": "Add New",
  "编辑": "Edit",
  "删除": "Delete",
  "批量删除": "Batch Delete",
  "批量操作": "Batch Actions",
  "查询": "Search",
  "重置": "Reset",
  "确定": "OK",
  "取消": "Cancel",
  "保存": "Save",
  "关闭": "Close",
  "查看": "View",
  "复制": "Copy",
  "详情": "Details",
  "导入": "Import",
  "导出": "Export",
  "打印": "Print",
  "刷新": "Refresh",
  "返回": "Back",
  "展开": "Expand",
  "收起": "Collapse",
  "强制结单": "Force Close",
  "列设置": "Column Settings",
  "恢复默认": "Restore Default",
  "恢复默认列配置": "Restore Default Columns",
  "审核": "Approve",
  "反审核": "Unapprove",
  "全选": "Select All",
  "清除": "Clear",
  "上传": "Upload",
  "下载": "Download",
  "提交": "Submit",
  "确认": "Confirm",
  "批量审核": "Batch Approve",
  "批量反审核": "Batch Unapprove",
  "高级查询": "Advanced Search",
  "添加": "Add",
  "选择": "Select",
  "未审核": "Pending",
  "已审核": "Approved",
  "审核中": "Under Review",
  "部分出库": "Partial Outbound",
  "完成出库": "Completed Outbound",
  "部分入库": "Partial Inbound",
  "完成入库": "Completed Inbound",
  "启用": "Active",
  "禁用": "Disabled",
  "已启用": "Enabled",
  "已禁用": "Disabled",
  "是": "Yes",
  "否": "No",
  "默认": "Default",
  "出库": "Outbound",
  "入库": "Inbound",
  "退货": "Return",
  "换货": "Exchange",
  "调拨": "Transfer",
  "盘点": "Audit",
  "组装": "Assemble",
  "拆卸": "Disassemble",
  "收入": "Income",
  "支出": "Expense",
  "转账": "Transfer",
  "请输入单据编号": "Enter doc number...",
  "请输入商品信息": "Enter product info...",
  "请输入条码、名称、助记码、...": "Enter barcode, name, mnemonic...",
  "请输入条码、名称、规格、型号": "Enter barcode, name, spec, model...",
  "请输入供应商": "Enter vendor...",
  "请输入客户": "Enter customer...",
  "请输入仓库": "Enter warehouse...",
  "请输入名称": "Enter name...",
  "请输入编号": "Enter code...",
  "请输入用户名": "Enter username",
  "请输入密码": "Enter password",
  "请输入验证码": "Enter captcha",
  "请选择单据状态": "Select status...",
  "请输入单据备注": "Enter remarks...",
  "请选择": "Please select...",
  "请输入": "Please enter...",
  "确定删除吗": "Are you sure to delete?",
  "确认要删除吗": "Are you sure you want to delete?",
  "恢复默认列配置：": "Reset Columns: ",
  "本月发生总额": "Monthly Total",
  "当前总余额": "Total Balance",
  "登录": "Sign In",
  "记住我": "Remember me",
  "注册租户": "Register Tenant",
  "欢迎": "Welcome",
  "欢迎回来": "Welcome back",
  "退出登录": "Sign Out",
  "部门切换": "Switch Dept.",
  "系统设置": "Settings",
  "界面设置": "UI Settings",
  "修改密码": "Change Password",
  "个人中心": "User Center",
  "用户名": "Username",
  "登录名": "Login Name",
  "用户姓名": "Full Name",
  "手机号码": "Phone",
  "电子邮箱": "Email",
  "职位": "Position",
  "角色": "Role",
  "角色名称": "Role Name",
  "角色描述": "Role Desc.",
  "机构名称": "Org Name",
  "机构简称": "Org Abbr.",
  "上级机构": "Parent Org",
  "租户": "Tenant",
  "租户登录名": "Tenant Login",
  "用户数量限制": "User Limit",
  "企业名称": "Company Name",
  "联系人": "Contact Person",
  "到期时间": "Expiry Date",
  "服务到期": "SLA Expiry",
  "授权用户": "Licensed Users",
  "条记录": "records",
  "共": "Total",
  "条": "items",
  "每页": "per page",
  "条/页": "/page",
  "上一页": "Previous",
  "下一页": "Next",
  "提示": "Notice",
  "系统提示": "System Notice",
  "操作成功": "Operation successful",
  "操作失败": "Operation failed",
  "友情提醒": "Reminder",
  "密码过于简单，请尽快修改": "Password too simple, please change soon",
  "用户不存在": "User not found",
  "用户密码不正确": "Wrong password",
  "用户被禁用": "User disabled",
  "试用期已结束，请联系客服续费": "Trial expired, contact support",
  "网络版": "Cloud Edition",
  "加载中": "Loading...",
  "暂无数据": "No data"
};

  var keys = Object.keys(dict).sort(function(a, b) { return b.length - a.length; });
  var escaped = keys.map(function(k) {
    return k.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
  });
  var regex = new RegExp('(' + escaped.join('|') + ')', 'g');

  function translateText(text) {
    if (!text || typeof text !== 'string') return text;
    if (!/[\u4e00-\u9fff]/.test(text)) return text;
    regex.lastIndex = 0;
    return text.replace(regex, function(match) {
      return dict[match] || match;
    });
  }

  function translateNode(node) {
    if (!node) return;
    // 1. Text node
    if (node.nodeType === 3) {
      var original = node.nodeValue;
      if (original && /[\u4e00-\u9fff]/.test(original)) {
        var translated = translateText(original);
        if (translated !== original) {
          node.nodeValue = translated;
        }
      }
      return;
    }
    // 2. Element node
    if (node.nodeType === 1) {
      var tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;

      // Attributes
      if (node.placeholder && /[\u4e00-\u9fff]/.test(node.placeholder)) {
        node.placeholder = translateText(node.placeholder);
      }
      if (node.title && /[\u4e00-\u9fff]/.test(node.title)) {
        node.title = translateText(node.title);
      }
      if (node.getAttribute && node.getAttribute('aria-label') && /[\u4e00-\u9fff]/.test(node.getAttribute('aria-label'))) {
        node.setAttribute('aria-label', translateText(node.getAttribute('aria-label')));
      }

      // Recurse child nodes
      var children = node.childNodes;
      for (var i = 0; i < children.length; i++) {
        translateNode(children[i]);
      }
    }
  }

  function translatePage() {
    if (!jshI18n.isEnglish()) return;
    if (document.body) {
      translateNode(document.body);
    }
    if (document.title && /[\u4e00-\u9fff]/.test(document.title)) {
      document.title = translateText(document.title);
    }
  }

  // ========== MUTATION OBSERVER & SWEEP ==========
  var observer = null;
  var sweepTimer = null;

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) {
            translateNode(m.addedNodes[j]);
          }
        } else if (m.type === 'characterData') {
          translateNode(m.target);
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Continuous lightweight periodic sweep (every 400ms) to catch any virtual DOM overwrites
    if (!sweepTimer) {
      sweepTimer = setInterval(function() {
        if (jshI18n.isEnglish()) {
          translatePage();
        }
      }, 400);
    }
  }

  // ========== PUBLIC API & COMPATIBILITY SHIM ==========
  var jshI18n = {
    isEnglish: function() {
      return localStorage.getItem('jsh_app_language') !== 'chinese_simplified';
    },
    enable: function() {
      localStorage.setItem('jsh_app_language', 'english');
      translatePage();
      startObserver();
    },
    disable: function() {
      localStorage.setItem('jsh_app_language', 'chinese_simplified');
      if (observer) { observer.disconnect(); observer = null; }
      if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
      location.reload();
    },
    translatePage: translatePage,
    dict: dict
  };

  window.jshI18n = jshI18n;

  window.translate = {
    language: {
      getCurrent: function() {
        return localStorage.getItem('jsh_app_language') || 'english';
      },
      getLocal: function() { return 'chinese_simplified'; },
      setLocal: function() {}
    },
    service: { use: function() {} },
    nomenclature: { append: function() {} },
    listener: { start: function() {} },
    selectLanguageTag: { show: false },
    changeLanguage: function(lang) {
      if (lang === 'english') {
        jshI18n.enable();
      } else {
        jshI18n.disable();
      }
    },
    execute: function() { translatePage(); }
  };

  // ========== AUTO INITIALIZATION ==========
  if (jshI18n.isEnglish()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        translatePage();
        startObserver();
      });
    } else {
      translatePage();
      startObserver();
    }
  }
})();
