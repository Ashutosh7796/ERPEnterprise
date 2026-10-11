import React from 'react'
import { BillManager } from '../../bill/components/BillManager'

export const StockTransferListPage: React.FC = () => {
  return (
    <BillManager
      type="出库"
      subType="调拨出库"
      title="Stock Transfer"
      prefixNo="DBCK"
      partnerType="none"
    />
  )
}
