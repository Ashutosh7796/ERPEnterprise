import { http } from '@core/api/client'

export interface Gstr1Summary {
  gstin: string
  fp: string
  grossTurnover: number
  totalTaxableValue: number
  totalCgst: number
  totalSgst: number
  totalIgst: number
  totalCess: number
  totalTaxAmount: number
  b2bCount: number
  b2bTaxable: number
  b2bTax: number
  b2clCount: number
  b2clTaxable: number
  b2clTax: number
  b2csCount: number
  b2csTaxable: number
  b2csTax: number
  exportCount: number
  exportTaxable: number
  exportTax: number
  cdnrCount: number
  cdnrTaxable: number
  cdnrTax: number
  hsnCount: number
  docTotalIssued: number
  b2bList?: any[]
  b2clList?: any[]
  b2csList?: any[]
  exportList?: any[]
  cdnrList?: any[]
  hsnList?: any[]
  docList?: any[]
  gstnOfficialJsonPayload?: any
  validationErrors?: string[]
}

export interface Gstr3bSummary {
  gstin: string
  returnPeriod: string
  table31aTaxable: number
  table31aIgst: number
  table31aCgst: number
  table31aSgst: number
  table31aCess: number
  table31bTaxable: number
  table31bIgst: number
  totalGrossTaxLiability: number
  itcAllOtherIgst: number
  itcAllOtherCgst: number
  itcAllOtherSgst: number
  itcAllOtherCess: number
  itcReversedIgst: number
  itcReversedCgst: number
  itcReversedSgst: number
  netItcIgst: number
  netItcCgst: number
  netItcSgst: number
  totalNetItcAvailable: number
  offsetResult?: {
    igstPayable: number
    cgstPayable: number
    sgstPayable: number
    igstPaidByIgstCredit: number
    cgstPaidByIgstCredit: number
    sgstPaidByIgstCredit: number
    cgstPaidByCgstCredit: number
    sgstPaidBySgstCredit: number
    igstCashPayable: number
    cgstCashPayable: number
    sgstCashPayable: number
    totalCashPayable: number
    closingIgstCredit: number
    closingCgstCredit: number
    closingSgstCredit: number
  }
}

export interface Gstr2bReconciliationResult {
  gstin: string
  returnPeriod: string
  total2bRecords: number
  totalErpRecords: number
  amountTolerance: number
  dateToleranceDays: number
  exactMatchCount: number
  exactMatchTaxable: number
  exactMatchItc: number
  matchedBlockedItcCount: number
  valueMismatchCount: number
  dateMismatchCount: number
  missingInErpCount: number
  missingIn2bCount: number
  totalEligibleItcClaimable: number
  totalIneligibleBlockedItc: number
  items?: any[]
}

export const gstrComplianceApi = {
  getGstr1Summary: (returnPeriod: string) =>
    http.get<Gstr1Summary>('/gst/compliance/gstr1/summary?returnPeriod=' + returnPeriod),

  getGstr3bSummary: (returnPeriod: string) =>
    http.get<Gstr3bSummary>('/gst/compliance/gstr3b/summary?returnPeriod=' + returnPeriod),

  runGstr2bReconciliation: (returnPeriod: string) =>
    http.post<Gstr2bReconciliationResult>('/gst/compliance/gstr2b/reconcile?returnPeriod=' + returnPeriod),
}
