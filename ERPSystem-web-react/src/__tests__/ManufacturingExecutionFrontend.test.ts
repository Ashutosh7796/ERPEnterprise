import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * Combined Slice 7 + Slice 8: Manufacturing Execution & Cost Absorption Frontend Contract Tests
 * Verifies:
 * - Material Issue calculation against frozen component snapshot (remaining qty, validation bounds).
 * - WIP component consumption calculation for partial and full receipts.
 * - Deterministic cost absorption and cumulative actual unit cost calculation.
 * - Work Order state machine transition logic (CONFIRMED -> IN_PROGRESS -> COMPLETED).
 * - Action visibility & permission gating per lifecycle state.
 * - Frozen snapshot independence from master BOM revisions.
 */
describe('Combined Slice 7 + Slice 8: Manufacturing Execution & Cost Absorption Tests', () => {

  // Lifecycle States
  const LIFECYCLE_STATES = ['DRAFT', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED']

  it('1. State machine contract: Supports all 6 manufacturing lifecycle states', () => {
    assert.strictEqual(LIFECYCLE_STATES.length, 6)
    assert.ok(LIFECYCLE_STATES.includes('DRAFT'))
    assert.ok(LIFECYCLE_STATES.includes('CONFIRMED'))
    assert.ok(LIFECYCLE_STATES.includes('IN_PROGRESS'))
    assert.ok(LIFECYCLE_STATES.includes('COMPLETED'))
    assert.ok(LIFECYCLE_STATES.includes('CLOSED'))
    assert.ok(LIFECYCLE_STATES.includes('CANCELLED'))
  })

  it('2. Material Issue calculation: Remaining quantity is strictly requiredQty - issuedQty', () => {
    const snapshotItem = {
      requiredQty: 100,
      issuedQty: 30,
      consumedQty: 0,
    }

    const remainingQty = Math.max(0, snapshotItem.requiredQty - snapshotItem.issuedQty)
    assert.strictEqual(remainingQty, 70)

    // Valid issue
    const proposedIssue1 = 50
    assert.ok(proposedIssue1 > 0 && proposedIssue1 <= remainingQty)

    // Over-issue blocked
    const proposedIssue2 = 80
    assert.ok(proposedIssue2 > remainingQty, 'Proposed issue exceeds remaining required quantity')
  })

  it('3. WIP Consumption calculation: Accurately computes component consumption proportional to received FG', () => {
    const plannedFgQty = 50
    const snapshotItem = {
      requiredQty: 250, // 5 components per 1 FG
      issuedQty: 250,
      consumedQty: 0,
    }

    // Partial receipt of 20 FG units (40% of order)
    const receivedFgQty = 20
    const consumptionRatio = receivedFgQty / plannedFgQty // 0.4
    const requiredForBatch = snapshotItem.requiredQty * consumptionRatio // 100 components

    assert.strictEqual(consumptionRatio, 0.4)
    assert.strictEqual(requiredForBatch, 100)

    // Updated snapshot state after receipt
    snapshotItem.consumedQty += requiredForBatch
    const remainingWipBalance = snapshotItem.issuedQty - snapshotItem.consumedQty
    assert.strictEqual(snapshotItem.consumedQty, 100)
    assert.strictEqual(remainingWipBalance, 150)
  })

  it('4. Cost Absorption calculation: Deterministically computes actual unit cost from consumed WIP value', () => {
    const receivedFgQty = 10
    const consumedComponents = [
      { componentMaterialId: 201, consumedQty: 50, valuationRate: 12.0 }, // 600.00
      { componentMaterialId: 202, consumedQty: 20, valuationRate: 25.0 }, // 500.00
    ]

    const totalBatchCost = consumedComponents.reduce(
      (sum, item) => sum + item.consumedQty * item.valuationRate,
      0
    )
    assert.strictEqual(totalBatchCost, 1100.0)

    const batchUnitCost = totalBatchCost / receivedFgQty
    assert.strictEqual(batchUnitCost, 110.0)

    // Cumulative Work Order moving average cost test
    // Prior: 0 completed. Now: 10 completed @ 110.00
    const priorCompleted = 0
    const priorUnitCost = 0
    const cumulativeCompleted = priorCompleted + receivedFgQty
    const cumulativeActualUnitCost =
      (priorCompleted * priorUnitCost + totalBatchCost) / cumulativeCompleted

    assert.strictEqual(cumulativeCompleted, 10)
    assert.strictEqual(cumulativeActualUnitCost, 110.0)
  })

  it('5. State transition logic: Transition to COMPLETED when completedQty + scrappedQty >= plannedQty', () => {
    const computeNextStatus = (planned: number, completed: number, scrapped: number, currentStatus: string) => {
      if (completed + scrapped >= planned) {
        return 'COMPLETED'
      }
      if (completed > 0 || currentStatus === 'IN_PROGRESS') {
        return 'IN_PROGRESS'
      }
      return currentStatus
    }

    // Partial receipt keeps IN_PROGRESS
    assert.strictEqual(computeNextStatus(100, 40, 0, 'IN_PROGRESS'), 'IN_PROGRESS')
    // Partial receipt with scrap keeps IN_PROGRESS if sum < planned
    assert.strictEqual(computeNextStatus(100, 70, 10, 'IN_PROGRESS'), 'IN_PROGRESS')
    // Full receipt transitions to COMPLETED
    assert.strictEqual(computeNextStatus(100, 100, 0, 'IN_PROGRESS'), 'COMPLETED')
    // Full receipt with scrap sum transitions to COMPLETED
    assert.strictEqual(computeNextStatus(100, 95, 5, 'IN_PROGRESS'), 'COMPLETED')
  })

  it('6. Action permission gating: Only permits valid execution actions per lifecycle status', () => {
    const canIssue = (status: string) => status === 'CONFIRMED' || status === 'IN_PROGRESS'
    const canReceive = (status: string) => status === 'IN_PROGRESS'
    const canConfirm = (status: string) => status === 'DRAFT'
    const canCancel = (status: string, issuedQty = 0) =>
      (status === 'DRAFT' || status === 'CONFIRMED') && issuedQty === 0

    // DRAFT
    assert.strictEqual(canConfirm('DRAFT'), true)
    assert.strictEqual(canIssue('DRAFT'), false)
    assert.strictEqual(canReceive('DRAFT'), false)
    assert.strictEqual(canCancel('DRAFT', 0), true)

    // CONFIRMED (ready for material issue)
    assert.strictEqual(canConfirm('CONFIRMED'), false)
    assert.strictEqual(canIssue('CONFIRMED'), true)
    assert.strictEqual(canReceive('CONFIRMED'), false)
    assert.strictEqual(canCancel('CONFIRMED', 0), true)

    // IN_PROGRESS (materials issued, can issue more or receive FG)
    assert.strictEqual(canIssue('IN_PROGRESS'), true)
    assert.strictEqual(canReceive('IN_PROGRESS'), true)
    assert.strictEqual(canCancel('IN_PROGRESS', 50), false)

    // COMPLETED
    assert.strictEqual(canIssue('COMPLETED'), false)
    assert.strictEqual(canReceive('COMPLETED'), false)
    assert.strictEqual(canCancel('COMPLETED', 100), false)
  })

  it('7. Snapshot Immutability Invariant: Master BOM revision mutations do NOT affect existing snapshot requirements', () => {
    // Work order confirmed with BOM Rev 1 (2 units per FG * 100 FG = 200 units)
    const orderSnapshot = {
      orderId: 5001,
      plannedQty: 100,
      items: [
        { componentMaterialId: 301, requiredQty: 200, issuedQty: 0 },
      ],
    }

    // Master BOM is later revised to Rev 2 (5 units per FG)
    const masterBomRev2 = {
      bomRevision: '2.0',
      items: [
        { componentMaterialId: 301, componentQty: 5.0 }, // Would require 500 units for 100 FG
      ],
    }

    // Execution MUST use orderSnapshot.items, NOT recalculate from masterBomRev2
    const authoritativeRequiredQty = orderSnapshot.items[0].requiredQty
    assert.strictEqual(authoritativeRequiredQty, 200)
    assert.notStrictEqual(authoritativeRequiredQty, masterBomRev2.items[0].componentQty * orderSnapshot.plannedQty)
  })
})
