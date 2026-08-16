import React from 'react'
import { FinancialBillManager } from '../components/FinancialBillManager'

export const GiroListPage: React.FC = () => {
  return (
    <FinancialBillManager
      type="转账"
      title="Transfer Notes"
      prefixNo="ZZ"
      partnerType="none"
    />
  )
}
