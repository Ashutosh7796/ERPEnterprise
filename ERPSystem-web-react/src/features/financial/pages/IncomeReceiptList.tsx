import React from 'react'
import { FinancialBillManager } from '../components/FinancialBillManager'

export const IncomeReceiptListPage: React.FC = () => {
  return (
    <FinancialBillManager
      type="收入"
      title="Income Receipts"
      prefixNo="SR"
      partnerType="customer"
      partnerLabel="Customer / Partner"
    />
  )
}
