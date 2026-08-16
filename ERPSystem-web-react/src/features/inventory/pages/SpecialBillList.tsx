import React from 'react'
import { BillManager } from '../../bill/components/BillManager'

interface SpecialBillProps {
  type: '入库' | '出库'
  subType: '其它入库' | '其它出库' | '组装单' | '拆卸单'
  title: string
}

export const SpecialBillListPage: React.FC<SpecialBillProps> = ({ type, subType, title }) => {
  const getPrefix = () => {
    switch (subType) {
      case '其它入库':
        return 'QTRK'
      case '其它出库':
        return 'QTCK'
      case '组装单':
        return 'ZZD'
      case '拆卸单':
        return 'CXD'
      default:
        return 'BILL'
    }
  }

  return (
    <BillManager
      type={type}
      subType={subType}
      title={title}
      prefixNo={getPrefix()}
      partnerType="none"
    />
  )
}
