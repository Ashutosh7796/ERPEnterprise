import React from 'react'
import { PurchaseBillManager } from '../components/PurchaseBillManager'

export const PurchaseReturnListPage: React.FC = () => {
  return (
    <PurchaseBillManager
      type="出库"
      subType="采购退货"
      title="Purchase Returns"
      prefixNo="CGTH"
    />
  )
}
