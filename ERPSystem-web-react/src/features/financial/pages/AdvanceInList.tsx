import React from 'react'
import { FinancialBillManager } from '../components/FinancialBillManager'

export const AdvanceInListPage: React.FC = () => {
  return (
    <FinancialBillManager
      type="收预付款"
      title="Advance Receipts"
      prefixNo="SYFK"
      partnerType="customer"
      partnerLabel="Customer"
    />
  )
}
