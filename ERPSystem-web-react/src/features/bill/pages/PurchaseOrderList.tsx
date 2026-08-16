import React from 'react'
import { PurchaseBillManager } from '../components/PurchaseBillManager'

export const PurchaseOrderListPage: React.FC = () => {
  return (
    <PurchaseBillManager
      type="其它"
      subType="采购订单"
      title="Purchase Orders"
      prefixNo="CGDD"
    />
  )
}
