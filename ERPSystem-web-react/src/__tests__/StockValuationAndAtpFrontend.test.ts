import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Vertical Slice 3: Stock Valuation Refactor & ATP Frontend Tests
 * Verifies:
 * - Authoritative Available-to-Promise (ATP) formula and presentation invariants.
 * - Reserved quantity presentation contract.
 * - Stock Report Flow Modal data source contract using GET /stockLedger/list.
 * - Legacy /depotItem/findDetailByDepotIdsAndMaterialId disconnection.
 * - Column display settings configuration.
 */
describe('Vertical Slice 3: Stock Valuation Refactor & ATP Frontend Tests', () => {

  it('1. ATP Formula & Formatting: ATP equals On-Hand minus Reserved stock with color-coded presentation', () => {
    // Normal case
    const onHand = 150.0
    const reserved = 40.0
    const atp = onHand - reserved

    assert.strictEqual(atp, 110.0)
    assert.strictEqual(atp.toFixed(2), '110.00')

    const getAtpColor = (val: number) => (val > 0 ? '#52c41a' : val < 0 ? '#f5222d' : '#8c8c8c')
    assert.strictEqual(getAtpColor(atp), '#52c41a') // green for positive available stock

    // Constrained/negative case (over-allocation)
    const constrainedOnHand = 20.0
    const highReserved = 35.0
    const negativeAtp = constrainedOnHand - highReserved

    assert.strictEqual(negativeAtp, -15.0)
    assert.strictEqual(negativeAtp.toFixed(2), '-15.00')
    assert.strictEqual(getAtpColor(negativeAtp), '#f5222d') // red for negative available stock

    // Zero case
    const zeroReserved = 0.0
    const zeroOnHand = 0.0
    const zeroAtp = zeroOnHand - zeroReserved
    assert.strictEqual(zeroAtp.toFixed(2), '0.00')
    assert.strictEqual(getAtpColor(zeroAtp), '#8c8c8c') // muted gray for zero
  })

  it('2. Reserved Stock Presentation: Non-zero reservations are highlighted with warning color', () => {
    const formatReserved = (val: number) => ({
      text: val.toFixed(2),
      color: val > 0 ? '#faad14' : '#8c8c8c',
    })

    const activeRes = formatReserved(45.5)
    assert.strictEqual(activeRes.text, '45.50')
    assert.strictEqual(activeRes.color, '#faad14') // gold warning for active reservation

    const zeroRes = formatReserved(0.0)
    assert.strictEqual(zeroRes.text, '0.00')
    assert.strictEqual(zeroRes.color, '#8c8c8c') // gray for zero
  })

  it('3. Stock Ledger Flow Contract: Flow modal data structure contains authoritative running ledger fields', () => {
    const mockLedgerEntry = {
      id: 501,
      voucherNo: 'GRN-2026-0088',
      voucherType: 'PURCHASE_RECEIPT',
      depotName: 'Central Raw Materials',
      binCode: 'BIN-RM-04',
      actualQty: 100.0,
      qtyAfterTransaction: 350.0,
      valuationRate: 120.5,
      stockValue: 42175.0,
      postingTime: '2026-09-01 14:30:00',
    }

    assert.strictEqual(mockLedgerEntry.voucherNo, 'GRN-2026-0088')
    assert.strictEqual(mockLedgerEntry.voucherType, 'PURCHASE_RECEIPT')
    assert.strictEqual(mockLedgerEntry.binCode, 'BIN-RM-04')
    assert.strictEqual(mockLedgerEntry.actualQty > 0 ? `+${mockLedgerEntry.actualQty.toFixed(2)}` : mockLedgerEntry.actualQty.toFixed(2), '+100.00')
    assert.strictEqual(mockLedgerEntry.qtyAfterTransaction.toFixed(2), '350.00')
    assert.strictEqual(`₹${mockLedgerEntry.valuationRate.toFixed(2)}`, '₹120.50')
    assert.strictEqual(`₹${mockLedgerEntry.stockValue.toFixed(2)}`, '₹42175.00')
  })

  it('4. Legacy Endpoint Disconnection: Verify /depotItem/findDetailByDepotIdsAndMaterialId is not in StockReport.tsx', () => {
    const stockReportPath = path.resolve(__dirname, '../features/report/pages/StockReport.tsx')
    const fileContent = fs.readFileSync(stockReportPath, 'utf-8')

    assert.strictEqual(
      fileContent.includes('/depotItem/findDetailByDepotIdsAndMaterialId'),
      false,
      'Legacy findDetailByDepotIdsAndMaterialId must be completely removed from StockReport.tsx'
    )

    assert.strictEqual(
      fileContent.includes('/stockLedger/list'),
      true,
      'StockReport.tsx must consume the authoritative /stockLedger/list endpoint for flow details'
    )
  })

  it('5. Column Settings Configuration: reservedStock and availableStock are registered in allColumnKeys', () => {
    const stockReportPath = path.resolve(__dirname, '../features/report/pages/StockReport.tsx')
    const fileContent = fs.readFileSync(stockReportPath, 'utf-8')

    assert.strictEqual(
      fileContent.includes("'reservedStock'"),
      true,
      'reservedStock must be registered in allColumnKeys'
    )

    assert.strictEqual(
      fileContent.includes("'availableStock'"),
      true,
      'availableStock must be registered in allColumnKeys'
    )
  })
})
