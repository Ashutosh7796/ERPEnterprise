import React from 'react'
import { FinancialBillManager } from '../components/FinancialBillManager'

export const MoneyInListPage: React.FC = () => {
  return (
    <FinancialBillManager
      type="收款"
      title="Collection Notes"
      prefixNo="SK"
      partnerType="customer"
      partnerLabel="Customer"
    />
  )
}
