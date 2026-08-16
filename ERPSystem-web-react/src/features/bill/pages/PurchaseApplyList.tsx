import React from 'react'
import { PurchaseBillManager } from '../components/PurchaseBillManager'

export const PurchaseApplyListPage: React.FC = () => {
  return (
    <PurchaseBillManager
      type="其它"
      subType="请购单"
      title="Purchase Requisitions"
      prefixNo="QGD"
    />
  )
}
