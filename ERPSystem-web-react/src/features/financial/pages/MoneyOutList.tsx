import React from 'react'
import { FinancialBillManager } from '../components/FinancialBillManager'

export const MoneyOutListPage: React.FC = () => {
  return (
    <FinancialBillManager
      type="付款"
      title="Payment Notes"
      prefixNo="FK"
      partnerType="vendor"
      partnerLabel="Vendor"
    />
  )
}
