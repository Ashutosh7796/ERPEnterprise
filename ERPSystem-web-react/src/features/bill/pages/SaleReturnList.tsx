import React from 'react'
import { BillManager } from '../components/BillManager'

export const SaleReturnListPage: React.FC = () => {
  return (
    <BillManager
      type="入库"
      subType="销售退货"
      title="Sales Returns"
      prefixNo="XSTH"
      partnerType="customer"
      partnerLabel="Customer"
    />
  )
}
