/**
 * Indian Statutory GST & Tax Engine for Enterprise ERP
 * Compliant with GST Act, Central Goods & Services Tax Rules, and Income Tax Provisions (TDS/TCS).
 */

export interface GSTCalculationResult {
  taxableAmount: number
  gstRate: number
  isInterState: boolean
  cgstRate: number
  cgstAmount: number
  sgstRate: number
  sgstAmount: number
  igstRate: number
  igstAmount: number
  totalTax: number
  grossTotal: number
}

export interface TDSCalculationResult {
  section: string
  tdsRate: number
  taxableAmount: number
  tdsAmount: number
  netPayable: number
}

export const GST_SLABS = [
  { label: '0% (Exempt / Nil Rated)', value: 0 },
  { label: '5% (Essential Goods / Transport)', value: 5 },
  { label: '12% (Standard Lower Slab)', value: 12 },
  { label: '18% (Standard Enterprise Rate)', value: 18 },
  { label: '28% (Luxury / De-merit Goods)', value: 28 },
]

export const COMMON_TDS_SECTIONS = [
  { label: 'None (No TDS)', value: 'NONE', rate: 0 },
  { label: 'Sec 194C - Contractor Payments (Individual: 1%)', value: '194C_IND', rate: 1.0 },
  { label: 'Sec 194C - Contractor Payments (Company/Firm: 2%)', value: '194C_CORP', rate: 2.0 },
  { label: 'Sec 194J - Technical / Professional Services (2%)', value: '194J_TECH', rate: 2.0 },
  { label: 'Sec 194J - Professional Fees (10%)', value: '194J_PROF', rate: 10.0 },
  { label: 'Sec 194I - Rent on Plant & Machinery (2%)', value: '194I_PLANT', rate: 2.0 },
  { label: 'Sec 194I - Rent on Land/Building (10%)', value: '194I_BLDG', rate: 10.0 },
  { label: 'Sec 194Q - Purchase of Goods > ₹50L (0.1%)', value: '194Q', rate: 0.1 },
]

/**
 * Format any numerical value into standard Indian Currency format (₹ Lakhs & Crores)
 * e.g. 1500000 -> "₹ 15,00,000.00"
 */
export function formatINR(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '₹ 0.00'
  const num = typeof val === 'string' ? parseFloat(val) : val
  if (isNaN(num)) return '₹ 0.00'

  const isNegative = num < 0
  const absNum = Math.abs(num)
  const [integerPart, decimalPart] = absNum.toFixed(2).split('.')

  // Indian format regex: last 3 digits, then groups of 2 digits
  const lastThree = integerPart.substring(integerPart.length - 3)
  const otherNumbers = integerPart.substring(0, integerPart.length - 3)
  const formattedInteger =
    otherNumbers !== ''
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree

  return `${isNegative ? '-' : ''}₹ ${formattedInteger}.${decimalPart}`
}

/**
 * Helper for UI preview only.
 * IMPORTANT: All statutory, financial, and accounting calculations MUST call
 * backend gstApi.calculateTax() to ensure effective-dated rule and POS compliance.
 */
export function calculateGST(params: {
  taxableAmount: number
  gstRate: number
  isInterState?: boolean
}): GSTCalculationResult {
  const { taxableAmount = 0, gstRate = 0, isInterState = false } = params
  const safeTaxable = Math.max(0, taxableAmount)

  if (isInterState) {
    // Inter-State: 100% IGST
    const igstAmount = (safeTaxable * gstRate) / 100
    return {
      taxableAmount: safeTaxable,
      gstRate,
      isInterState: true,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: gstRate,
      igstAmount: Number(igstAmount.toFixed(2)),
      totalTax: Number(igstAmount.toFixed(2)),
      grossTotal: Number((safeTaxable + igstAmount).toFixed(2)),
    }
  } else {
    // Intra-State: Split into CGST (50%) + SGST (50%)
    const splitRate = gstRate / 2
    const cgstAmount = (safeTaxable * splitRate) / 100
    const sgstAmount = (safeTaxable * splitRate) / 100
    const totalTax = cgstAmount + sgstAmount

    return {
      taxableAmount: safeTaxable,
      gstRate,
      isInterState: false,
      cgstRate: splitRate,
      cgstAmount: Number(cgstAmount.toFixed(2)),
      sgstRate: splitRate,
      sgstAmount: Number(sgstAmount.toFixed(2)),
      igstRate: 0,
      igstAmount: 0,
      totalTax: Number(totalTax.toFixed(2)),
      grossTotal: Number((safeTaxable + totalTax).toFixed(2)),
    }
  }
}

/**
 * Compute TDS Deductions
 */
export function calculateTDS(taxableAmount: number, tdsRate: number, section: string): TDSCalculationResult {
  const safeTaxable = Math.max(0, taxableAmount)
  const tdsAmount = Number(((safeTaxable * tdsRate) / 100).toFixed(2))
  const netPayable = Number((safeTaxable - tdsAmount).toFixed(2))

  return {
    section,
    tdsRate,
    taxableAmount: safeTaxable,
    tdsAmount,
    netPayable,
  }
}

export const formatCurrency = formatINR

export function formatIndianDate(date: string | Date | undefined | null): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * Converts a numerical currency amount to Indian English Words (Rupees ... Only)
 * e.g. 224200 -> "Rupees Two Lakh Twenty-Four Thousand Two Hundred Only"
 */
export function numberToIndianWords(amount: number): string {
  if (!amount || isNaN(amount) || amount <= 0) return 'Rupees Zero Only'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  const numToWordsLessThanThousand = (num: number): string => {
    let str = ''
    if (num >= 100) {
      str += ones[Math.floor(num / 100)] + ' Hundred '
      num %= 100
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '') + ' '
    } else if (num > 0) {
      str += ones[num] + ' '
    }
    return str.trim()
  }

  const [rupeesStr, paiseStr] = Math.abs(amount).toFixed(2).split('.')
  let rupees = parseInt(rupeesStr, 10)
  const paise = parseInt(paiseStr, 10)

  let result = ''

  const crore = Math.floor(rupees / 10000000)
  rupees %= 10000000
  if (crore > 0) {
    result += numToWordsLessThanThousand(crore) + ' Crore '
  }

  const lakh = Math.floor(rupees / 100000)
  rupees %= 100000
  if (lakh > 0) {
    result += numToWordsLessThanThousand(lakh) + ' Lakh '
  }

  const thousand = Math.floor(rupees / 1000)
  rupees %= 1000
  if (thousand > 0) {
    result += numToWordsLessThanThousand(thousand) + ' Thousand '
  }

  const hundred = Math.floor(rupees / 100)
  rupees %= 100
  if (hundred > 0) {
    result += ones[hundred] + ' Hundred '
  }

  if (rupees > 0) {
    if (rupees >= 20) {
      result += tens[Math.floor(rupees / 10)] + (rupees % 10 ? '-' + ones[rupees % 10] : '') + ' '
    } else {
      result += ones[rupees] + ' '
    }
  }

  result = result.trim()
  let words = result ? `Rupees ${result}` : 'Rupees Zero'

  if (paise > 0) {
    let paiseText = ''
    if (paise >= 20) {
      paiseText = tens[Math.floor(paise / 10)] + (paise % 10 ? '-' + ones[paise % 10] : '')
    } else {
      paiseText = ones[paise]
    }
    words += ` and ${paiseText} Paise`
  }

  return `${words} Only`
}

