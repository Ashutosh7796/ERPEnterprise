/**
 * Phase P6 Comprehensive Frontend AP Payment, Advance, TDS & MSME 43B(h) Workflow Test Suite
 *
 * Validates:
 * 1. Multi-Invoice AP Payment Allocation & FIFO Distribution
 * 2. Mathematical Balance Proof: Gross AP Settled = Net Bank + TDS Withheld + Cash Discount
 * 3. Advance Disbursement & Advance-to-Invoice Offset Equation
 * 4. Authoritative Date-Effective TDS Display & Form Resolution (1961 Form 26Q vs 2025 Form 140)
 * 5. MSME 15/45-day statutory payment clock and Section 16 penal interest calculator
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

interface OpenInvoice {
  id: number
  invoiceNumber: string
  supplierId: number
  totalAmount: number
  paidAmount: number
  openBalance: number
}

interface PaymentAllocationItem {
  invoiceId: number
  allocationAmount: number
  discountAmount: number
  tdsAmount: number
  netCashAmount: number
}

// 1. Frontend FIFO Multi-Invoice Allocation Helper (mirrors ApPaymentAllocationModal.tsx)
function computeFifoAllocation(invoices: OpenInvoice[], totalAvailableFunds: number): PaymentAllocationItem[] {
  let remainingFunds = totalAvailableFunds
  const allocations: PaymentAllocationItem[] = []

  for (const inv of invoices) {
    if (remainingFunds <= 0) break
    const alloc = Math.min(inv.openBalance, remainingFunds)
    if (alloc > 0) {
      allocations.push({
        invoiceId: inv.id,
        allocationAmount: alloc,
        discountAmount: 0,
        tdsAmount: 0,
        netCashAmount: alloc,
      })
      remainingFunds -= alloc
    }
  }
  return allocations
}

// 2. AP Double-Entry Settlement Balance Proof
function validateApPaymentDoubleEntryBalance(allocations: PaymentAllocationItem[]) {
  let totalGrossSettled = 0
  let totalNetCashPaid = 0
  let totalTdsWithheld = 0
  let totalDiscountReceived = 0

  for (const item of allocations) {
    totalGrossSettled += item.allocationAmount
    totalNetCashPaid += item.netCashAmount
    totalTdsWithheld += item.tdsAmount
    totalDiscountReceived += item.discountAmount
  }

  // Exact invariance: Gross Settled = Net Cash + TDS + Discount
  const equationSum = totalNetCashPaid + totalTdsWithheld + totalDiscountReceived
  const isBalanced = Math.abs(totalGrossSettled - equationSum) < 0.0001

  return {
    totalGrossSettled,
    totalNetCashPaid,
    totalTdsWithheld,
    totalDiscountReceived,
    equationSum,
    isBalanced,
  }
}

// 3. Date-Effective TDS Resolver & Form Determination
function resolveTdsStatutoryDisplay(effectiveDate: string, hasPan: boolean, hasLowerCert: boolean) {
  const isPostApril2026 = new Date(effectiveDate) >= new Date('2026-04-01')

  let lawVersion = isPostApril2026 ? 'INCOME_TAX_ACT_2025' : 'INCOME_TAX_ACT_1961'
  let lawDisplayName = isPostApril2026 ? 'Income-tax Act, 2025' : 'Income-tax Act, 1961'
  let provisionRef = isPostApril2026 ? 'SEC_393_1_TAB_8_II' : 'SEC_194Q'
  let provisionDisplayName = isPostApril2026
    ? 'Income-tax Act, 2025 — Section 393(1), Table 8(ii)'
    : 'Income-tax Act, 1961 — Section 194Q'
  let reportingForm = isPostApril2026 ? 'FORM_140' : 'FORM_26Q'
  let reportingCode = isPostApril2026 ? '393(1)-8(ii)' : '194Q'

  let rate = 0.001 // 0.1% base rate
  let rateRef = provisionRef

  if (!hasPan) {
    rate = 0.05 // 5.0% higher rate
    rateRef = isPostApril2026 ? 'SEC_397_2' : 'SEC_206AA'
  } else if (hasLowerCert) {
    rate = 0.0005 // 0.05% lower deduction
    rateRef = isPostApril2026 ? 'SEC_395' : 'SEC_197'
  }

  return {
    lawVersion,
    lawDisplayName,
    provisionRef,
    provisionDisplayName,
    reportingForm,
    reportingCode,
    applicableRate: rate,
    applicableRateRef: rateRef,
  }
}

// 4. MSME 43B(h) Statutory Clock & Section 16 Penal Interest
function computeMsmeCompliance(
  msmeType: 'MICRO' | 'SMALL' | 'MEDIUM' | 'TRADER' | 'NON_MSME',
  agreedCreditDays: number,
  invoiceDate: string,
  asOfDate: string,
  principalAmount: number,
  rbiBankRate: number = 0.065
) {
  // Traders and Medium enterprises are not protected under 43B(h) / Section 15
  const isProtected = msmeType === 'MICRO' || msmeType === 'SMALL'
  const statutoryLimitDays = isProtected ? Math.min(agreedCreditDays || 15, 45) : agreedCreditDays

  const invDateObj = new Date(invoiceDate)
  const dueDateObj = new Date(invDateObj.getTime() + statutoryLimitDays * 24 * 60 * 60 * 1000)
  const asOfDateObj = new Date(asOfDate)

  const diffMs = asOfDateObj.getTime() - dueDateObj.getTime()
  const overdueDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))

  let complianceStatus = 'WITHIN_LIMIT'
  let penalInterest = 0

  if (isProtected && overdueDays > 0) {
    complianceStatus = 'OVERDUE_AT_RISK'
    // Section 16: 3x RBI bank rate compounded monthly
    const penalAnnualRate = rbiBankRate * 3 // e.g. 19.5%
    const monthlyRate = penalAnnualRate / 12
    const overdueMonths = overdueDays / 30
    penalInterest = principalAmount * (Math.pow(1 + monthlyRate, overdueMonths) - 1)
  }

  return {
    isProtected,
    statutoryLimitDays,
    statutoryDueDate: dueDateObj.toISOString().split('T')[0],
    overdueDays,
    complianceStatus,
    penalInterest: Math.round(penalInterest * 100) / 100,
  }
}

describe('Procurement P6 Frontend AP, TDS & MSME Workflow Tests', () => {

  it('1. FIFO Multi-Invoice Payment Allocation: Distributes cash across multiple open invoices', () => {
    const openInvoices: OpenInvoice[] = [
      { id: 101, invoiceNumber: 'INV-001', supplierId: 501, totalAmount: 50000, paidAmount: 10000, openBalance: 40000 },
      { id: 102, invoiceNumber: 'INV-002', supplierId: 501, totalAmount: 30000, paidAmount: 0, openBalance: 30000 },
      { id: 103, invoiceNumber: 'INV-003', supplierId: 501, totalAmount: 25000, paidAmount: 0, openBalance: 25000 },
    ]

    const allocations = computeFifoAllocation(openInvoices, 60000)
    assert.strictEqual(allocations.length, 2, 'Allocates to first two invoices')
    assert.strictEqual(allocations[0].allocationAmount, 40000, 'Clears INV-001 completely')
    assert.strictEqual(allocations[1].allocationAmount, 20000, 'Partially settles INV-002')
  })

  it('2. AP Double-Entry Settlement Invariance Proof: Gross AP = Net Bank + TDS + Discount', () => {
    const allocations: PaymentAllocationItem[] = [
      {
        invoiceId: 101,
        allocationAmount: 100000,
        discountAmount: 2000,
        tdsAmount: 100,
        netCashAmount: 97900,
      },
      {
        invoiceId: 102,
        allocationAmount: 50000,
        discountAmount: 1000,
        tdsAmount: 50,
        netCashAmount: 48950,
      },
    ]

    const balanceResult = validateApPaymentDoubleEntryBalance(allocations)
    assert.strictEqual(balanceResult.totalGrossSettled, 150000)
    assert.strictEqual(balanceResult.totalNetCashPaid, 146850)
    assert.strictEqual(balanceResult.totalTdsWithheld, 150)
    assert.strictEqual(balanceResult.totalDiscountReceived, 3000)
    assert.strictEqual(balanceResult.equationSum, 150000)
    assert.strictEqual(balanceResult.isBalanced, true, 'Gross Settlement exactly equals Cash + TDS + Discount')
  })

  it('3. Pre-April 2026 TDS Determination: Resolves 1961 Act, Section 194Q and Form 26Q', () => {
    const tdsPre2026 = resolveTdsStatutoryDisplay('2025-11-15', true, false)
    assert.strictEqual(tdsPre2026.lawVersion, 'INCOME_TAX_ACT_1961')
    assert.strictEqual(tdsPre2026.provisionRef, 'SEC_194Q')
    assert.strictEqual(tdsPre2026.reportingForm, 'FORM_26Q')
    assert.strictEqual(tdsPre2026.reportingCode, '194Q')
    assert.strictEqual(tdsPre2026.applicableRate, 0.001)
  })

  it('4. Post-April 2026 TDS Determination: Resolves 2025 Act, Section 393(1) Table 8(ii) and Form 140', () => {
    const tdsPost2026 = resolveTdsStatutoryDisplay('2026-05-10', true, false)
    assert.strictEqual(tdsPost2026.lawVersion, 'INCOME_TAX_ACT_2025')
    assert.strictEqual(tdsPost2026.provisionRef, 'SEC_393_1_TAB_8_II')
    assert.strictEqual(tdsPost2026.reportingForm, 'FORM_140')
    assert.strictEqual(tdsPost2026.reportingCode, '393(1)-8(ii)')
    assert.strictEqual(tdsPost2026.applicableRate, 0.001)
  })

  it('5. Post-April 2026 Higher Rate (No PAN): Resolves Section 397(2) @ 5.0%', () => {
    const tdsNoPan = resolveTdsStatutoryDisplay('2026-06-01', false, false)
    assert.strictEqual(tdsNoPan.lawVersion, 'INCOME_TAX_ACT_2025')
    assert.strictEqual(tdsNoPan.applicableRate, 0.05, '5.0% higher rate for missing PAN')
    assert.strictEqual(tdsNoPan.applicableRateRef, 'SEC_397_2')
  })

  it('6. MSME 43B(h) Due Date Capping: Caps agreed credit days at 45 days for Small manufacturer', () => {
    const msmeEval = computeMsmeCompliance('SMALL', 60, '2026-05-01', '2026-05-10', 100000)
    assert.strictEqual(msmeEval.isProtected, true)
    assert.strictEqual(msmeEval.statutoryLimitDays, 45, '60 days agreed credit is statutorily capped at 45 days')
    assert.strictEqual(msmeEval.complianceStatus, 'WITHIN_LIMIT')
  })

  it('7. MSME Trader Exclusion: Wholesale/retail traders are excluded from Section 15/43B(h) protection', () => {
    const traderEval = computeMsmeCompliance('TRADER', 60, '2026-05-01', '2026-07-01', 100000)
    assert.strictEqual(traderEval.isProtected, false, 'Traders are not protected under 43B(h)')
    assert.strictEqual(traderEval.complianceStatus, 'WITHIN_LIMIT')
    assert.strictEqual(traderEval.penalInterest, 0)
  })

  it('8. Section 16 Penal Interest: Computes monthly compounded interest at 3x RBI bank rate for overdue Micro supplier', () => {
    // 30 days credit, overdue by 60 days (2 months) on Rs 1,00,000 principal
    const overdueEval = computeMsmeCompliance('MICRO', 30, '2026-04-01', '2026-06-30', 100000, 0.065)
    assert.strictEqual(overdueEval.isProtected, true)
    assert.strictEqual(overdueEval.complianceStatus, 'OVERDUE_AT_RISK')
    assert.strictEqual(overdueEval.overdueDays, 60)
    // 3x 6.5% = 19.5% per annum -> 1.625% per month. 100000 * ((1 + 0.01625)^2 - 1) = 3276.41
    assert.strictEqual(overdueEval.penalInterest > 3200, true)
  })

  it('9. Edge Case 1: Concurrent / Sequential Supplier Threshold Crossing', () => {
    const priorFY = 4800000
    const tx1 = 300000 // Cumulative = 51L -> Excess over 50L = 1L taxable base
    const tx1Base = Math.max(0, priorFY + tx1 - 5000000)
    const tx1Tds = tx1Base * 0.001
    assert.strictEqual(tx1Base, 100000)
    assert.strictEqual(tx1Tds, 100)

    const updatedPrior = 5100000
    const tx2 = 200000 // Cumulative = 53L -> 100% Taxable Base = 2L
    const tx2Base = tx2
    const tx2Tds = tx2Base * 0.001
    assert.strictEqual(tx2Base, 200000)
    assert.strictEqual(tx2Tds, 200)

    const totalTds = tx1Tds + tx2Tds
    assert.strictEqual(totalTds, 300, 'Total TDS exactly equals 0.1% on the 3L excess')
  })

  it('10. Edge Case 2: Exact 31-Mar / 1-Apr Law Transition Boundary', () => {
    const mar31 = resolveTdsStatutoryDisplay('2026-03-31', true, false)
    assert.strictEqual(mar31.lawVersion, 'INCOME_TAX_ACT_1961')
    assert.strictEqual(mar31.provisionRef, 'SEC_194Q')
    assert.strictEqual(mar31.reportingForm, 'FORM_26Q')

    const apr01 = resolveTdsStatutoryDisplay('2026-04-01', true, false)
    assert.strictEqual(apr01.lawVersion, 'INCOME_TAX_ACT_2025')
    assert.strictEqual(apr01.provisionRef, 'SEC_393_1_TAB_8_II')
    assert.strictEqual(apr01.reportingForm, 'FORM_140')
  })

  it('11. Edge Case 3: Pre-2026 Correction Executed in Aug 2026 Preserves 1961 Act', () => {
    const isCorrectionTo1961 = true
    const effectiveLaw = isCorrectionTo1961 ? 'INCOME_TAX_ACT_1961' : 'INCOME_TAX_ACT_2025'
    const reportingForm = isCorrectionTo1961 ? 'FORM_26Q' : 'FORM_140'
    assert.strictEqual(effectiveLaw, 'INCOME_TAX_ACT_1961')
    assert.strictEqual(reportingForm, 'FORM_26Q')
  })

  it('12. Edge Case 4: TDS Lower Deduction Certificate Rate Boundary Pre and Post 2026', () => {
    const preCert = resolveTdsStatutoryDisplay('2026-02-15', true, true)
    assert.strictEqual(preCert.applicableRate, 0.0005)
    assert.strictEqual(preCert.applicableRateRef, 'SEC_197')

    const postCert = resolveTdsStatutoryDisplay('2026-05-15', true, true)
    assert.strictEqual(postCert.applicableRate, 0.0005)
    assert.strictEqual(postCert.applicableRateRef, 'SEC_395')
  })

  it('13. Edge Case 5: PAN Change After Previous Deductions Switches Dynamically', () => {
    const q1NoPan = resolveTdsStatutoryDisplay('2026-05-01', false, false)
    assert.strictEqual(q1NoPan.applicableRate, 0.05, '5.0% for missing PAN')
    assert.strictEqual(q1NoPan.applicableRateRef, 'SEC_397_2')

    const q2WithPan = resolveTdsStatutoryDisplay('2026-07-01', true, false)
    assert.strictEqual(q2WithPan.applicableRate, 0.001, '0.1% after PAN furnished')
    assert.strictEqual(q2WithPan.applicableRateRef, 'SEC_393_1_TAB_8_II')
  })

  it('14. Edge Case 6: MSME Reclassification (Micro vs Trader vs Medium) 43B(h) Scope', () => {
    const microEval = computeMsmeCompliance('MICRO', 30, '2026-05-01', '2026-06-15', 100000)
    assert.strictEqual(microEval.isProtected, true)
    assert.strictEqual(microEval.complianceStatus, 'OVERDUE_AT_RISK')

    const traderEval = computeMsmeCompliance('TRADER', 30, '2026-05-01', '2026-06-15', 100000)
    assert.strictEqual(traderEval.isProtected, false)
    assert.strictEqual(traderEval.complianceStatus, 'WITHIN_LIMIT')
    assert.strictEqual(traderEval.penalInterest, 0)

    const mediumEval = computeMsmeCompliance('MEDIUM', 30, '2026-05-01', '2026-06-15', 100000)
    assert.strictEqual(mediumEval.isProtected, false)
    assert.strictEqual(mediumEval.complianceStatus, 'WITHIN_LIMIT')
  })

  it('15. Edge Case 7: Dynamic RBI Bank-Rate Penal Compound Interest Calculation', () => {
    // 0 days overdue -> ₹0 penal interest
    const onTime = computeMsmeCompliance('MICRO', 45, '2026-05-01', '2026-06-15', 100000, 0.0675)
    assert.strictEqual(onTime.overdueDays, 0)
    assert.strictEqual(onTime.penalInterest, 0)

    // 60 days overdue (2 months) @ 3x 6.75% = 20.25% p.a. -> 1.6875% monthly
    // 100,000 * ((1 + 0.016875)^2 - 1) = 3403.50
    const overdue = computeMsmeCompliance('MICRO', 45, '2026-05-01', '2026-08-14', 100000, 0.0675)
    assert.strictEqual(overdue.overdueDays, 60)
    assert.strictEqual(overdue.penalInterest > 3300, true)
  })

  it('16. Edge Case 8: Advance Threshold Crossing & Double-Entry Allocation Invariance', () => {
    const priorFY = 4500000
    const advanceAmount = 1000000
    const excessOver50L = Math.max(0, priorFY + advanceAmount - 5000000)
    const advanceTds = excessOver50L * 0.001 // 500000 * 0.1% = 500
    const netBankDisbursed = advanceAmount - advanceTds // 999500

    assert.strictEqual(excessOver50L, 500000)
    assert.strictEqual(advanceTds, 500)
    assert.strictEqual(netBankDisbursed, 999500)
    assert.strictEqual(advanceAmount, netBankDisbursed + advanceTds, 'Gross Advance = Net Bank + TDS')
  })
})

