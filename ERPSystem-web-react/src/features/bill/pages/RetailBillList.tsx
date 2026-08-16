import React from 'react'
import { BillManager } from '../components/BillManager'

interface RetailBillProps {
  subType: '零售出库' | '零售退货'
  title: string
}

export const RetailBillListPage: React.FC<RetailBillProps> = ({ subType, title }) => {
  return (
    <BillManager
      type={subType === '零售出库' ? '出库' : '入库'}
      subType={subType}
      title={title}
      prefixNo={subType === '零售出库' ? 'LSCK' : 'LSTH'}
      partnerType="member"
      partnerLabel="Member / Customer"
    />
  )
}
