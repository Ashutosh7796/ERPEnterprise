export const API_BASE = '/ERPSystem-boot'

export const ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE}/user/login`,
    LOGOUT: `${API_BASE}/user/logout`,
    RANDOM_IMAGE: `${API_BASE}/user/randomImage`,
    USER_SESSION: `${API_BASE}/user/getUserSession`,
    REGISTER: `${API_BASE}/user/registerUser`,
  },
  FUNCTION: {
    MENU_BY_P_NUMBER: `${API_BASE}/function/findMenuByPNumber`,
    LIST: `${API_BASE}/function/list`,
  },
  USER: {
    LIST: `${API_BASE}/user/list`,
    INFO: `${API_BASE}/user/info`,
    ADD: `${API_BASE}/user/addUser`,
    UPDATE: `${API_BASE}/user/updateUser`,
    RESET_PWD: `${API_BASE}/user/resetPwd`,
    USER_BTN: `${API_BASE}/user/getUserBtnByCurrentUser`,
  },
  ROLE: {
    LIST: `${API_BASE}/role/list`,
    TENANT_ROLE_LIST: `${API_BASE}/role/tenantRoleList`,
  },
  MATERIAL: {
    LIST: `${API_BASE}/material/list`,
    CATEGORY_LIST: `${API_BASE}/materialCategory/list`,
    UNIT_LIST: `${API_BASE}/unit/list`,
    PROPERTY_LIST: `${API_BASE}/materialProperty/list`,
  },
  BILL: {
    DEPOT_HEAD_LIST: `${API_BASE}/depotHead/list`,
    DEPOT_ITEM_LIST: `${API_BASE}/depotItem/list`,
    BUILD_NUMBER: `${API_BASE}/sequence/buildNumber`,
  },
  DEPOT: {
    LIST: `${API_BASE}/depot/list`,
    ALL_LIST: `${API_BASE}/depot/getAllList`,
  },
  SUPPLIER: {
    LIST: `${API_BASE}/supplier/list`,
    BY_SELECT_SUP: `${API_BASE}/supplier/findBySelect_sup`,
    BY_SELECT_CUS: `${API_BASE}/supplier/findBySelect_cus`,
  },
  ACCOUNT: {
    LIST: `${API_BASE}/account/list`,
    ALL_ACCOUNT: `${API_BASE}/account/getAccount`,
  },
  ACCOUNT_HEAD: {
    LIST: `${API_BASE}/accountHead/list`,
    ADD: `${API_BASE}/accountHead/add`,
    UPDATE: `${API_BASE}/accountHead/update`,
    DELETE: `${API_BASE}/accountHead/delete`,
    DELETE_BATCH: `${API_BASE}/accountHead/deleteBatch`,
  },
  SYSTEM: {
    PLATFORM_INFO: `${API_BASE}/platformConfig/getPlatform`,
    CONFIG_INFO: `${API_BASE}/systemConfig/getCurrentInfo`,
  },
  DASHBOARD: {
    CONTEXT: `${API_BASE}/dashboard/context`,
    SUMMARY: `${API_BASE}/dashboard/summary`,
    FINANCIAL: `${API_BASE}/dashboard/financial`,
    POSITION: `${API_BASE}/dashboard/position`,
    ACTIVITY: `${API_BASE}/dashboard/activity`,
  },
} as const
