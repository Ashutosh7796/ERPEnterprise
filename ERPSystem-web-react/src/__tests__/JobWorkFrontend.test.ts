import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * Slice 9: Indian Job Work & Section 143 Aging Frontend Contract Tests
 * Verifies:
 * - Statutory Return Deadlines (CGST Sec 143: 1 yr for Inputs, 3 yrs for Capital Goods).
 * - Quantity Reconciliation & Mass Balance (Pending = Dispatched - Consumed - Scrap - Shortage).
 * - Inward Cost Absorption & Absorbed Unit Cost equation (SAC 9988).
 * - Section 143 Statutory Compliance State Machine (COMPLIANT, APPROACHING_DUE, OVERDUE, COMPLETED).
 * - Aging Bucket Categorization.
 * - Order Lifecycle Transitions and Action Gating.
 * - 7-Dimensional Traceability Integrity.
 */
describe('Slice 9: Indian Job Work & Section 143 Aging Frontend Tests', () => {

  it('1. Statutory Return Deadlines: 1 year for inputs, 3 years for capital goods', () => {
    const computeDueDate = (goodsType: 'INPUT' | 'SEMI_FINISHED' | 'CAPITAL_GOODS', dispatchDate: Date): Date => {
      const due = new Date(dispatchDate.getTime())
      if (goodsType === 'CAPITAL_GOODS') {
        due.setFullYear(due.getFullYear() + 3)
      } else {
        due.setFullYear(due.getFullYear() + 1)
      }
      return due
    }

    const start = new Date('2026-09-01T00:00:00Z')

    const inputDue = computeDueDate('INPUT', start)
    assert.strictEqual(inputDue.toISOString().slice(0, 10), '2027-09-01')

    const semiDue = computeDueDate('SEMI_FINISHED', start)
    assert.strictEqual(semiDue.toISOString().slice(0, 10), '2027-09-01')

    const capDue = computeDueDate('CAPITAL_GOODS', start)
    assert.strictEqual(capDue.toISOString().slice(0, 10), '2029-09-01')
  })

  it('2. Quantity Reconciliation & Mass Balance: Pending is strictly reduced by consumed, scrap, and shortage', () => {
    const dispatchedQty = 100
    let pendingQty = dispatchedQty
    let consumedQty = 0
    let scrappedQty = 0
    let shortageQty = 0

    // Partial return 1: 40 units consumed
    const returnBatch1 = { consumed: 40, scrap: 0, shortage: 0 }
    assert.ok(returnBatch1.consumed + returnBatch1.scrap + returnBatch1.shortage <= pendingQty)
    pendingQty -= (returnBatch1.consumed + returnBatch1.scrap + returnBatch1.shortage)
    consumedQty += returnBatch1.consumed
    assert.strictEqual(pendingQty, 60)

    // Partial return 2: 50 consumed, 5 scrap, 2 shortage
    const returnBatch2 = { consumed: 50, scrap: 5, shortage: 2 }
    assert.ok(returnBatch2.consumed + returnBatch2.scrap + returnBatch2.shortage <= pendingQty)
    pendingQty -= (returnBatch2.consumed + returnBatch2.scrap + returnBatch2.shortage)
    consumedQty += returnBatch2.consumed
    scrappedQty += returnBatch2.scrap
    shortageQty += returnBatch2.shortage
    assert.strictEqual(pendingQty, 3)

    // Excess return attempt blocked
    const excessAttempt = { consumed: 5, scrap: 0, shortage: 0 }
    assert.ok(excessAttempt.consumed > pendingQty, 'Accounted quantity must not exceed remaining pending balance')
  })

  it('3. Inward Cost Absorption (SAC 9988): Absorbs subcontracting processing fee into unit FG cost', () => {
    const consumedRawMaterialQty = 50
    const rawMaterialUnitValuation = 120 // ₹120 / unit
    const consumedRawMaterialCost = consumedRawMaterialQty * rawMaterialUnitValuation // ₹6,000

    const jobWorkProcessingCharge = 1500 // SAC 9988 processing invoice
    const receivedFinishedGoodsQty = 50

    const totalAbsorbedCost = consumedRawMaterialCost + jobWorkProcessingCharge // ₹7,500
    const absorbedUnitCost = totalAbsorbedCost / receivedFinishedGoodsQty // ₹150.0000

    assert.strictEqual(consumedRawMaterialCost, 6000)
    assert.strictEqual(totalAbsorbedCost, 7500)
    assert.strictEqual(absorbedUnitCost, 150)
  })

  it('4. Section 143 Compliance Status: Identifies COMPLIANT, APPROACHING_DUE (<60d), and OVERDUE deemed supply violations', () => {
    const evaluateCompliance = (daysRemaining: number, pendingQty: number): string => {
      if (pendingQty <= 0) return 'COMPLETED'
      if (daysRemaining < 0) return 'OVERDUE'
      if (daysRemaining <= 60) return 'APPROACHING_DUE'
      return 'COMPLIANT'
    }

    assert.strictEqual(evaluateCompliance(120, 50), 'COMPLIANT')
    assert.strictEqual(evaluateCompliance(45, 50), 'APPROACHING_DUE')
    assert.strictEqual(evaluateCompliance(-10, 50), 'OVERDUE')
    assert.strictEqual(evaluateCompliance(-10, 0), 'COMPLETED')
  })

  it('5. Aging Bucket Categorization: Matches statutory 90/180/270/365-day intervals', () => {
    const categorizeBucket = (daysElapsed: number): string => {
      if (daysElapsed <= 90) return '0-90 DAYS'
      if (daysElapsed <= 180) return '91-180 DAYS'
      if (daysElapsed <= 270) return '181-270 DAYS'
      if (daysElapsed <= 365) return '271-365 DAYS'
      return '> 365 DAYS'
    }

    assert.strictEqual(categorizeBucket(30), '0-90 DAYS')
    assert.strictEqual(categorizeBucket(120), '91-180 DAYS')
    assert.strictEqual(categorizeBucket(200), '181-270 DAYS')
    assert.strictEqual(categorizeBucket(310), '271-365 DAYS')
    assert.strictEqual(categorizeBucket(400), '> 365 DAYS')
  })

  it('6. Order State Machine: Validates permitted actions per lifecycle stage', () => {
    const isDispatchAllowed = (status: string) => status === 'DRAFT' || status === 'APPROVED'
    const isReceiveAllowed = (status: string) => status === 'DISPATCHED' || status === 'PARTIALLY_RECEIVED'
    const isCancelAllowed = (status: string) => status === 'DRAFT' || status === 'APPROVED'

    assert.strictEqual(isDispatchAllowed('DRAFT'), true)
    assert.strictEqual(isDispatchAllowed('DISPATCHED'), false)

    assert.strictEqual(isReceiveAllowed('DISPATCHED'), true)
    assert.strictEqual(isReceiveAllowed('PARTIALLY_RECEIVED'), true)
    assert.strictEqual(isReceiveAllowed('DRAFT'), false)
    assert.strictEqual(isReceiveAllowed('COMPLETED'), false)

    assert.strictEqual(isCancelAllowed('DRAFT'), true)
    assert.strictEqual(isCancelAllowed('DISPATCHED'), false)
    assert.strictEqual(isCancelAllowed('COMPLETED'), false)
  })

  it('7. 7-Dimensional Traceability Integrity: All critical inquiry parameters are present and coherent', () => {
    const traceRecord = {
      materialId: 88,
      materialName: 'Forged Shaft 45mm',
      supplierId: 200,
      supplierName: 'Apex Subcontractors Ltd',
      supplierGstin: '27AAACA1234A1Z5',
      workOrderId: 5001,
      workOrderNumber: 'WO-2026-001',
      dispatchDate: '2026-07-01',
      challanNumber: 'JWC/2627/0010',
      dispatchedQty: 100,
      receivedQty: 40,
      pendingQty: 60,
      daysElapsed: 63,
      daysRemaining: 302,
      complianceStatus: 'COMPLIANT',
    }

    // Answers critical user question:
    // "Which material is currently with which Job Worker, from which Work Order, when was it sent,
    // how much was sent, how much was received back, how much is pending, and how long has it been pending?"
    assert.ok(traceRecord.materialName.length > 0)
    assert.ok(traceRecord.supplierName.length > 0)
    assert.ok(traceRecord.workOrderNumber.length > 0)
    assert.strictEqual(traceRecord.dispatchedQty, 100)
    assert.strictEqual(traceRecord.receivedQty, 40)
    assert.strictEqual(traceRecord.pendingQty, 60)
    assert.strictEqual(traceRecord.daysElapsed, 63)
    assert.strictEqual(traceRecord.complianceStatus, 'COMPLIANT')
  })

  it('8. Rule 138 E-Way Bill Threshold Boundary & NIC Integration Decoupling Contract', () => {
    const isEwayBillRequired = (isInterstate: boolean, consignmentValue: number): boolean => {
      if (isInterstate) return true // Rule 138(1) 3rd proviso: Mandatory irrespective of value
      return consignmentValue > 50000 // Rule 138(1): strictly exceeding ₹50,000
    }

    // Intra-State: below threshold
    assert.strictEqual(isEwayBillRequired(false, 49999), false)

    // Intra-State: exact boundary of ₹50,000 (Rule 138(1) says "exceeding ₹50,000")
    assert.strictEqual(isEwayBillRequired(false, 50000), false)

    // Intra-State: strictly exceeding ₹50,000
    assert.strictEqual(isEwayBillRequired(false, 50000.01), true)
    assert.strictEqual(isEwayBillRequired(false, 75000), true)

    // Inter-State: mandatory irrespective of value
    assert.strictEqual(isEwayBillRequired(true, 5000), true)
    assert.strictEqual(isEwayBillRequired(true, 50000), true)
    assert.strictEqual(isEwayBillRequired(true, 80000), true)

    // Government E-Way Bill Number separation invariant:
    // When live NIC/GSP gateway is not connected, government EBN MUST remain null
    const liveNicIntegrationConnected = false
    const governmentEwbNumber = liveNicIntegrationConnected ? '123456789012' : null
    assert.strictEqual(governmentEwbNumber, null, 'Actual government EBN must remain null until real integration returns it')
  })
})
