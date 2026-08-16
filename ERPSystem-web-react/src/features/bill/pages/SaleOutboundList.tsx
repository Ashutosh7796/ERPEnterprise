import React from 'react'
import { BillManager } from '../components/BillManager'

export const SaleOutboundListPage: React.FC = () => {
  return (
    <BillManager
      type="出库"
      subType="销售出库"
      title="Sales Dispatch"
      prefixNo="XSCK"
      partnerType="customer"
      partnerLabel="Customer"
    />
  )
}
