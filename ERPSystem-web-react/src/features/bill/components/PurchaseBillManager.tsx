import React from 'react'
import { BillManager, BillManagerProps } from './BillManager'

export type PurchaseBillManagerProps = BillManagerProps

export const PurchaseBillManager: React.FC<PurchaseBillManagerProps> = (props) => {
  return (
    <BillManager
      {...props}
      partnerType="vendor"
      partnerLabel="Vendor / Supplier"
    />
  )
}
