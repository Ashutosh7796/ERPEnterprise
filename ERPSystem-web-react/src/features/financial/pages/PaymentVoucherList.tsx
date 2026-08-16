import React from 'react'
import { FinancialBillManager } from '../components/FinancialBillManager'

export const PaymentVoucherListPage: React.FC = () => {
  return (
    <FinancialBillManager
      type="支出"
      title="Payment Vouchers"
      prefixNo="ZC"
      partnerType="vendor"
      partnerLabel="Vendor / Partner"
    />
  )
}
