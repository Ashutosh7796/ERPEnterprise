import React from 'react'
import { BillManager } from '../components/BillManager'

export const SaleOrderListPage: React.FC = () => {
  return (
    <BillManager
      type="其它"
      subType="销售订单"
      title="Sales Orders"
      prefixNo="XSDD"
      partnerType="customer"
      partnerLabel="Customer"
    />
  )
}
