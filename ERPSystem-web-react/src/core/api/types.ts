export interface BaseResponseInfo<T = any> {
  code: number
  data: T
  msg?: string
}

export interface TableDataInfo<T = any> {
  total: number
  rows: T[]
  code?: number
  msg?: string
}

export interface UserSessionDTO {
  id: number
  loginName: string
  userName: string
  tenantId: number
  roleId?: number
  roleName?: string
  leaderStatus?: string
  orgId?: number
}

export interface MenuFunctionDTO {
  id: number
  number: string
  name: string
  pNumber: string
  url: string
  icon?: string
  component?: string
  type?: string
  pushBtn?: string
  children?: MenuFunctionDTO[]
}

export interface CaptchaResponseDTO {
  token: string
  image: string
}
