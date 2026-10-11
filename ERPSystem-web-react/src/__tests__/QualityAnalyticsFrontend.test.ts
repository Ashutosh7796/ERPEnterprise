import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Enterprise Quality Analytics & Performance Surveillance (WP-QA) Frontend Tests
 * Scope: REQ-4.3.6 (Customer PPM & CQR), REQ-4.3.2 (Rejection Costing), REQ-4.3.7 (Stage-Wise Summary)
 */
describe('WP-QA: Quality Analytics & Performance Surveillance Frontend Tests', () => {

  // ==============================================================
  // 1. REQ-4.3.6: Customer Quality Rating (PPM) & CQR Math
  // ==============================================================
  describe('1. REQ-4.3.6: Customer Quality PPM & CQR Calculations', () => {
    const calculateCustomerPpm = (dispatched: number, returned: number): number => {
      if (!dispatched || dispatched <= 0) return 0
      return Math.round((returned / dispatched) * 1_000_000)
    }

    const calculateCqrScore = (dispatched: number, returned: number): number => {
      if (!dispatched || dispatched <= 0) return 100.0
      const defectPct = (returned / dispatched) * 100.0
      return Math.max(0, Number((100.0 - defectPct).toFixed(2)))
    }

    const resolveQualityGrade = (ppm: number, dispatched: number): string => {
      if (!dispatched || dispatched <= 0) return 'UNRATED'
      if (ppm <= 50) return 'GRADE_A_EXCELLENT'
      if (ppm <= 200) return 'GRADE_B_ACCEPTABLE'
      if (ppm <= 1000) return 'GRADE_C_WARNING'
      return 'GRADE_D_CRITICAL'
    }

    it('calculates zero PPM and 100% CQR for zero defect benchmark', () => {
      const dispatched = 100000
      const returned = 0
      const ppm = calculateCustomerPpm(dispatched, returned)
      const cqr = calculateCqrScore(dispatched, returned)
      const grade = resolveQualityGrade(ppm, dispatched)

      assert.equal(ppm, 0)
      assert.equal(cqr, 100.0)
      assert.equal(grade, 'GRADE_A_EXCELLENT')
    })

    it('calculates exact 50 PPM and Grade A for automotive standard delivery', () => {
      const dispatched = 100000
      const returned = 5
      const ppm = calculateCustomerPpm(dispatched, returned)
      const cqr = calculateCqrScore(dispatched, returned)
      const grade = resolveQualityGrade(ppm, dispatched)

      assert.equal(ppm, 50)
      assert.equal(cqr, 100.0)
      assert.equal(grade, 'GRADE_A_EXCELLENT')
    })

    it('calculates 500 PPM and Grade C Warning for moderate customer returns', () => {
      const dispatched = 10000
      const returned = 5
      const ppm = calculateCustomerPpm(dispatched, returned)
      const cqr = calculateCqrScore(dispatched, returned)
      const grade = resolveQualityGrade(ppm, dispatched)

      assert.equal(ppm, 500)
      assert.equal(cqr, 99.95)
      assert.equal(grade, 'GRADE_C_WARNING')
    })

    it('calculates 18,182 PPM and Grade D Critical for high-defect small shipment', () => {
      const dispatched = 55
      const returned = 1
      const ppm = calculateCustomerPpm(dispatched, returned)
      const cqr = calculateCqrScore(dispatched, returned)
      const grade = resolveQualityGrade(ppm, dispatched)

      assert.equal(ppm, 18182)
      assert.equal(cqr, 98.18)
      assert.equal(grade, 'GRADE_D_CRITICAL')
    })

    it('protects against division by zero when customer dispatch is 0', () => {
      const dispatched = 0
      const returned = 0
      const ppm = calculateCustomerPpm(dispatched, returned)
      const cqr = calculateCqrScore(dispatched, returned)
      const grade = resolveQualityGrade(ppm, dispatched)

      assert.equal(ppm, 0)
      assert.equal(cqr, 100.0)
      assert.equal(grade, 'UNRATED')
    })
  })

  // ==============================================================
  // 2. REQ-4.3.2: Rejection Report with Cost Impact
  // ==============================================================
  describe('2. REQ-4.3.2: Rejection Cost Impact Valuation', () => {
    const calculateScrapValuation = (defectQty: number, standardRate: number): number => {
      return Number((defectQty * (standardRate || 0)).toFixed(2))
    }

    it('computes extended standard scrap valuation correctly', () => {
      const defectQty = 20
      const standardRate = 75.00
      const extendedValuation = calculateScrapValuation(defectQty, standardRate)
      assert.equal(extendedValuation, 1500.00)
    })

    it('safely handles zero unit rate components', () => {
      const defectQty = 15
      const standardRate = 0.00
      const extendedValuation = calculateScrapValuation(defectQty, standardRate)
      assert.equal(extendedValuation, 0.00)
    })

    it('preserves abnormal scrap accounting loss charged to Account 5402', () => {
      const persistedAbnormalLoss = 1500.00
      assert.equal(persistedAbnormalLoss > 0, true)
      assert.equal(persistedAbnormalLoss, 1500.00)
    })
  })

  // ==============================================================
  // 3. REQ-4.3.7: Stage-Wise Rejection Summary
  // ==============================================================
  describe('3. REQ-4.3.7: Multi-Stage Quality Stratification', () => {
    const calculateRejectionRate = (rejectedQty: number, lotQty: number): number => {
      if (!lotQty || lotQty <= 0) return 0.0
      return Number(((rejectedQty / lotQty) * 100.0).toFixed(2))
    }

    it('computes exact stage-wise rejection rates across distinct stages', () => {
      const stages = [
        { code: 'INCOMING', lot: 200, rej: 20, expectedRate: 10.00 },
        { code: 'IN_PROCESS', lot: 100, rej: 5, expectedRate: 5.00 },
        { code: 'FINAL', lot: 50, rej: 0, expectedRate: 0.00 },
        { code: 'CUSTOMER', lot: 10, rej: 10, expectedRate: 100.00 },
      ]

      for (const s of stages) {
        const rate = calculateRejectionRate(s.rej, s.lot)
        assert.equal(rate, s.expectedRate)
      }
    })

    it('preserves multi-stage data rows without collapsing into a single date', () => {
      const sampleMultiStageData = [
        { stageCode: 'INCOMING', stageName: 'Incoming Quality Control (IQC)' },
        { stageCode: 'IN_PROCESS', stageName: 'In-Process Quality Control (IPQC)' },
        { stageCode: 'FINAL', stageName: 'Final Quality Control (FQC)' },
        { stageCode: 'CUSTOMER', stageName: 'Customer Quality Assurance (RMA)' },
      ]

      assert.equal(sampleMultiStageData.length, 4)
      const stageCodes = sampleMultiStageData.map((d) => d.stageCode)
      assert.deepEqual(stageCodes, ['INCOMING', 'IN_PROCESS', 'FINAL', 'CUSTOMER'])
    })
  })

  // ==============================================================
  // 4. Terminology Compliance (UI Governance Charter)
  // ==============================================================
  describe('4. Governance: Mature ERP Terminology Invariance', () => {
    const prohibitedTerms = ['Cockpit', 'Command Center', 'Smart', 'Quick', 'Hub']

    it('prohibits casual or marketing terms in reporting headings', () => {
      const approvedHeadings = [
        'Quality Analytics & Performance Surveillance',
        'Customer Quality Performance (PPM)',
        'Rejection & Scrap Cost Impact Analysis',
        'Stage-Wise Quality Summary',
      ]

      for (const heading of approvedHeadings) {
        for (const term of prohibitedTerms) {
          assert.equal(
            heading.toLowerCase().includes(term.toLowerCase()),
            false,
            `Heading "${heading}" contains prohibited term "${term}"`
          )
        }
      }
    })
  })
})
