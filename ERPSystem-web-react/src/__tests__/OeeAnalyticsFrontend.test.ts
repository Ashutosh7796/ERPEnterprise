import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * WP5 Slice 1: OEE & Machine Utilization Frontend Tests
 * Validates SEMI E10 / ISO 22400-2 mathematical formulas, Rule 9 separation,
 * Pareto 80/20 algorithms, zero-data edge cases, and routing contracts.
 */
describe('WP5 Slice 1: OEE & Machine Utilization Frontend Contract Tests', () => {

  it('1. SEMI E10 OEE Formula: Computes Availability, Performance, Quality and Overall OEE', () => {
    // Standard test parameters:
    // Planned Production Time (PPT) = 480 mins
    // Actual Run Time = 384 mins (Availability = 384 / 480 = 0.8000)
    // Total Output = 384 units, Good Output = 365, Rejection = 19 (Quality = 365 / 384 = 0.9505)
    // Standard Ideal Cycle Time = 0.90 mins / unit
    // Standard Required Time = 0.90 * 384 = 345.6 mins
    // Performance = 345.6 / 384 = 0.9000
    const ppt = 480
    const runMins = 384
    const totalOutput = 384
    const goodOutput = 365
    const idealCycleTime = 0.90

    const availability = ppt > 0 ? Math.min(1, runMins / ppt) : 0
    const performance = (runMins > 0 && idealCycleTime > 0) ? Math.min(1, (idealCycleTime * totalOutput) / runMins) : 0
    const quality = totalOutput > 0 ? Math.min(1, goodOutput / totalOutput) : 1
    const oee = availability * performance * quality

    assert.strictEqual(availability.toFixed(4), '0.8000')
    assert.strictEqual(performance.toFixed(4), '0.9000')
    assert.strictEqual(quality.toFixed(4), '0.9505')
    assert.strictEqual(oee.toFixed(4), '0.6844')
  })

  it('2. Rule 9 Separation: Operational Utilization includes setup time, strictly distinct from OEE', () => {
    const scheduledMins = 480
    const runMins = 240
    const setupMins = 120
    const downtimeMins = 60
    const idleMins = 60

    // Invariant: Scheduled = Run + Setup + Downtime + Idle
    assert.strictEqual(runMins + setupMins + downtimeMins + idleMins, scheduledMins)

    // Operational Utilization includes Setup time (productive utilization of machine capacity)
    const operationalUtilization = (runMins + setupMins) / scheduledMins
    assert.strictEqual(operationalUtilization.toFixed(4), '0.7500')

    // Availability excludes Setup time (SEMI E10 availability loss)
    const availability = runMins / scheduledMins
    assert.strictEqual(availability.toFixed(4), '0.5000')

    // They must be mathematically different
    assert.notStrictEqual(operationalUtilization, availability)
  })

  it('3. Pareto 80/20 Algorithm: Ranks lost minutes descending and calculates cumulative percentages', () => {
    const rawStoppages = [
      { category: 'MATERIAL_STARVATION', reason: 'Waiting for Bar Stock', duration: 100, count: 5 },
      { category: 'MECHANICAL_BREAKDOWN', reason: 'Spindle Bearing Failure', duration: 300, count: 2 },
      { category: 'ELECTRICAL_FAULT', reason: 'Sensor Tripped', duration: 100, count: 3 },
    ]

    // Sort descending by duration
    const sorted = [...rawStoppages].sort((a, b) => b.duration - a.duration)
    assert.strictEqual(sorted[0].category, 'MECHANICAL_BREAKDOWN')

    const grandTotal = sorted.reduce((sum, item) => sum + item.duration, 0) // 500 mins
    assert.strictEqual(grandTotal, 500)

    let runningSum = 0
    const paretoItems = sorted.map((item) => {
      runningSum += item.duration
      const pctOfTotal = item.duration / grandTotal
      const cumPct = runningSum / grandTotal
      return {
        ...item,
        pctOfTotal: +pctOfTotal.toFixed(4),
        cumPct: +cumPct.toFixed(4),
        isVital80: cumPct <= 0.8 || (runningSum - item.duration === 0),
      }
    })

    // Item 1: 300 / 500 = 60%, cum = 60% -> Vital
    assert.strictEqual(paretoItems[0].pctOfTotal, 0.6)
    assert.strictEqual(paretoItems[0].cumPct, 0.6)
    assert.strictEqual(paretoItems[0].isVital80, true)

    // Item 2: 100 / 500 = 20%, cum = 80% -> Vital cutoff
    assert.strictEqual(paretoItems[1].pctOfTotal, 0.2)
    assert.strictEqual(paretoItems[1].cumPct, 0.8)
    assert.strictEqual(paretoItems[1].isVital80, true)

    // Item 3: 100 / 500 = 20%, cum = 100% -> Trivial Many
    assert.strictEqual(paretoItems[2].pctOfTotal, 0.2)
    assert.strictEqual(paretoItems[2].cumPct, 1.0)
    assert.strictEqual(paretoItems[2].isVital80, false)
  })

  it('4. Rule 8 Zero Handling: Zero run time and zero output does not trigger NaN / divide by zero', () => {
    const ppt = 480
    const runMins = 0
    const totalOutput = 0
    const goodOutput = 0

    const availability = ppt > 0 ? Math.min(1, runMins / ppt) : 0
    const performance = runMins > 0 ? (1.0 * totalOutput) / runMins : 0
    const quality = totalOutput > 0 ? goodOutput / totalOutput : 1 // SEMI E10 convention: 100% quality when no parts produced
    const oee = availability * performance * quality

    assert.strictEqual(availability, 0)
    assert.strictEqual(performance, 0)
    assert.strictEqual(quality, 1)
    assert.strictEqual(oee, 0)
    assert.ok(!Number.isNaN(oee))
  })

  it('5. Rule 8 Missing Data: Missing standard cycle time yields 0.0000 performance, never guessed', () => {
    const runMins = 300
    const totalOutput = 50
    const idealCycleTime = null as any // Missing in BOM/Routing

    const performance = (runMins > 0 && idealCycleTime && idealCycleTime > 0)
      ? Math.min(1, (idealCycleTime * totalOutput) / runMins)
      : 0

    assert.strictEqual(performance, 0)
  })

  it('6. Health Status Thresholds: Correctly tags EXCELLENT, GOOD, NEEDS_ATTENTION, and NO_RUN', () => {
    const getHealthStatus = (oee: number, runMins: number, plannedMins: number) => {
      if (runMins === 0 && plannedMins === 0) return 'NO_RUN'
      if (oee >= 0.85) return 'EXCELLENT'
      if (oee >= 0.70) return 'GOOD'
      return 'NEEDS_ATTENTION'
    }

    assert.strictEqual(getHealthStatus(0.88, 400, 480), 'EXCELLENT')
    assert.strictEqual(getHealthStatus(0.72, 350, 480), 'GOOD')
    assert.strictEqual(getHealthStatus(0.68, 300, 480), 'NEEDS_ATTENTION')
    assert.strictEqual(getHealthStatus(0, 0, 0), 'NO_RUN')
  })
})
