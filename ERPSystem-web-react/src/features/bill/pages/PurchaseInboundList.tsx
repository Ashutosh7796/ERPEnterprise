import React from 'react'
import { PurchaseBillManager } from '../components/PurchaseBillManager'

export const PurchaseInboundListPage: React.FC = () => {
  return (
    <PurchaseBillManager
      type="入库"
      subType="采购入库"
      title="Purchase Receipt"
      prefixNo="CGRK"
    />
  )
}
