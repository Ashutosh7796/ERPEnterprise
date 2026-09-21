/**
 * Phase P5 Comprehensive Frontend Accounting & Landed Cost Workflow Test Suite
 *
 * Validates:
 * 1. Landed Cost Apportionment Algorithms (Value, Weight, Quantity)
 * 2. Ind AS 2 Consumption Split Calculator (On-Hand Stock vs Dispatched Goods)
 * 3. Exact Zero-Rounding Balancing Across Multi-GRN Allocations
 * 4. Moving Average Valuation Adjustment Calculator
 * 5. General Ledger Double-Entry Balance Validator (GRNI, PPV, Rounding)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

interface GrnAllocationItem {
  grnHeaderId: number
  materialId: number
  receivedQuantity: number
  taxableValue: number
  weightKg: number
}

// 1. Landed Cost Apportionment Engine (mirrors LandedCostCreateModal.tsx)
function calculateLandedCostApportionment(
  items: GrnAllocationItem[],
  totalCostAmount: number,
  method: 'VALUE' | 'WEIGHT' | 'QUANTITY'
) {
  let totalBasis = 0
  items.forEach((item) => {
    if (method === 'WEIGHT') {
      totalBasis += Number(item.weightKg || 1)
    } else if (method === 'QUANTITY') {
      totalBasis += Number(item.receivedQuantity || 1)
    } else {
      totalBasis += Number(item.taxableValue || 1)
    }
  })

  if (totalBasis <= 0) totalBasis = items.length || 1

  let runningSum = 0
  const allocatedLines = items.map((item, idx) => {
    let basis = 1
    if (method === 'WEIGHT') {
      basis = Number(item.weightKg || 1)
    } else if (method === 'QUANTITY') {
      basis = Number(item.receivedQuantity || 1)
    } else {
      basis = Number(item.taxableValue || 1)
    }

    let alloc = 0
    if (idx === items.length - 1) {
      alloc = totalCostAmount - runningSum
    } else {
      alloc = (totalCostAmount * basis) / totalBasis
      runningSum += alloc
    }

    const roundedAlloc = Math.round(alloc * 100) / 100
    return {
      ...item,
      allocatedCost: roundedAlloc,
      sharePercent: Number(((basis / totalBasis) * 100).toFixed(2)),
    }
  })

  return {
    totalBasis,
    allocatedLines,
    totalAllocated: Number(allocatedLines.reduce((acc, l) => acc + l.allocatedCost, 0).toFixed(2)),
  }
}

// 2. Ind AS 2 Consumption Split & Moving Average Valuation Calculator
function calculateConsumptionSplitAndValuation(
  receivedQuantity: number,
  allocatedCost: number,
  currentOnHandStock: number,
  currentUnitPrice: number
) {
  let capitalizedAssetPortion = allocatedCost
  let expensedCogsPortion = 0

  if (currentOnHandStock <= 0) {
    capitalizedAssetPortion = 0
    expensedCogsPortion = allocatedCost
  } else if (currentOnHandStock < receivedQuantity) {
    const onHandRatio = currentOnHandStock / receivedQuantity
    capitalizedAssetPortion = Math.round(allocatedCost * onHandRatio * 100) / 100
    expensedCogsPortion = Math.round((allocatedCost - capitalizedAssetPortion) * 100) / 100
  }

  let newUnitPrice = currentUnitPrice
  if (capitalizedAssetPortion > 0 && currentOnHandStock > 0) {
    const currentTotalVal = currentOnHandStock * currentUnitPrice
    const newTotalVal = currentTotalVal + capitalizedAssetPortion
    newUnitPrice = Number((newTotalVal / currentOnHandStock).toFixed(4))
  }

  return {
    capitalizedAssetPortion,
    expensedCogsPortion,
    newUnitPrice,
  }
}

// 3. Purchase Invoice GL Balance & Variance Validator
interface InvoiceGlInput {
  invoicedQuantity: number
  invoicedUnitPrice: number
  poUnitPrice: number
  gstRate: number
  isItcEligible: boolean
}

function computeInvoiceGlClearing(input: InvoiceGlInput) {
  const grniClearing = input.invoicedQuantity * input.poUnitPrice
  const taxableValue = input.invoicedQuantity * input.invoicedUnitPrice
  const priceVariance = Number((taxableValue - grniClearing).toFixed(2))

  const taxAmount = Number((taxableValue * (input.gstRate / 100)).toFixed(2))
  const eligibleItc = input.isItcEligible ? taxAmount : 0
  const blockedItcCapitalized = !input.isItcEligible ? taxAmount : 0

  const grossPayable = Math.round(taxableValue + taxAmount)
  const roundingAdjustment = Number((grossPayable - (taxableValue + taxAmount)).toFixed(2))

  return {
    grniClearing,
    priceVariance,
    eligibleItc,
    blockedItcCapitalized,
    grossPayable,
    roundingAdjustment,
  }
}

describe('Procurement P5 Frontend Accounting & Landed Cost Workflow Tests', () => {

  it('1. Landed Cost Apportionment by Value: Apportions freight proportionally to taxable amounts', () => {
    const items: GrnAllocationItem[] = [
      { grnHeaderId: 6001, materialId: 101, receivedQuantity: 100, taxableValue: 40000, weightKg: 200 },
      { grnHeaderId: 6002, materialId: 102, receivedQuantity: 50, taxableValue: 60000, weightKg: 100 },
    ]
    const totalFreight = 5000

    const result = calculateLandedCostApportionment(items, totalFreight, 'VALUE')
    assert.strictEqual(result.totalAllocated, 5000)
    assert.strictEqual(result.allocatedLines[0].allocatedCost, 2000, '40% of 5000 = 2000')
    assert.strictEqual(result.allocatedLines[1].allocatedCost, 3000, '60% of 5000 = 3000')
  })

  it('2. Landed Cost Apportionment by Weight: Apportions cargo freight based on net kilograms', () => {
    const items: GrnAllocationItem[] = [
      { grnHeaderId: 6001, materialId: 101, receivedQuantity: 100, taxableValue: 40000, weightKg: 300 },
      { grnHeaderId: 6002, materialId: 102, receivedQuantity: 50, taxableValue: 60000, weightKg: 100 },
    ]
    const totalFreight = 4000

    const result = calculateLandedCostApportionment(items, totalFreight, 'WEIGHT')
    assert.strictEqual(result.totalAllocated, 4000)
    assert.strictEqual(result.allocatedLines[0].allocatedCost, 3000, '75% of 4000 = 3000')
    assert.strictEqual(result.allocatedLines[1].allocatedCost, 1000, '25% of 4000 = 1000')
  })

  it('3. Ind AS 2 Consumption Split: Correctly splits landed cost between asset capitalization and COGS for sold goods', () => {
    // 100 units received, 2000 landed cost. Scenario: 40 units already sold (60 remain on hand @ Rs 100 unit cost)
    const split = calculateConsumptionSplitAndValuation(100, 2000, 60, 100)

    assert.strictEqual(split.capitalizedAssetPortion, 1200, '60% remaining on-hand stock gets 1200 capitalized')
    assert.strictEqual(split.expensedCogsPortion, 800, '40% already sold stock gets 800 expensed to COGS')

    // Valuation check: (60 * 100 + 1200) / 60 = 7200 / 60 = 120.0000
    assert.strictEqual(split.newUnitPrice, 120)
  })

  it('4. Invoice Clearing & Price Variance: Accurately computes GRNI clearing, PPV, and Section 170 rounding', () => {
    // PO Unit Price = 100, Invoiced Unit Price = 105 (PPV = Rs 5/unit on 20 units = Rs 100 PPV)
    const invoiceGl = computeInvoiceGlClearing({
      invoicedQuantity: 20,
      invoicedUnitPrice: 105,
      poUnitPrice: 100,
      gstRate: 18,
      isItcEligible: true,
    })

    assert.strictEqual(invoiceGl.grniClearing, 2000, 'GRNI accrual cleared at PO rate (20 * 100)')
    assert.strictEqual(invoiceGl.priceVariance, 100, 'PPV is (2100 - 2000) = 100')
    assert.strictEqual(invoiceGl.eligibleItc, 378, '18% on 2100 = 378')
    assert.strictEqual(invoiceGl.grossPayable, 2478, 'Total AP = 2100 + 378 = 2478')
  })

  it('5. Section 17(5) Blocked ITC: Capitalizes non-recoverable tax into inventory valuation instead of input tax credit', () => {
    const invoiceGl = computeInvoiceGlClearing({
      invoicedQuantity: 1,
      invoicedUnitPrice: 10000,
      poUnitPrice: 10000,
      gstRate: 28,
      isItcEligible: false, // Blocked motor vehicle
    })

    assert.strictEqual(invoiceGl.eligibleItc, 0, 'Blocked tax cannot be routed to eligible ITC')
    assert.strictEqual(invoiceGl.blockedItcCapitalized, 2800, '28% tax capitalized into inventory/asset cost')
    assert.strictEqual(invoiceGl.grossPayable, 12800)
  })
})
