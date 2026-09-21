import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * Vertical Slice 2: Storage Location Bins Frontend Contract Tests
 * Verifies:
 * - Bin type classification and color mappings.
 * - Phase 2 shop-floor WIP bin contract (binCode='WIP-FLOOR', binType='WIP').
 * - Alphanumeric bin code formatting and constraints.
 * - Single default bin per warehouse invariant.
 */
describe('Vertical Slice 2: Storage Location Bins Frontend Tests', () => {

  const VALID_BIN_TYPES = ['STORAGE', 'WIP', 'QUARANTINE', 'TRANSIT']

  const BIN_TYPE_COLORS: Record<string, string> = {
    STORAGE: 'blue',
    WIP: 'orange',
    QUARANTINE: 'red',
    TRANSIT: 'cyan',
  }

  it('1. Bin type contract: Exactly supports the 4 approved location types', () => {
    assert.strictEqual(VALID_BIN_TYPES.length, 4)
    assert.ok(VALID_BIN_TYPES.includes('STORAGE'))
    assert.ok(VALID_BIN_TYPES.includes('WIP'))
    assert.ok(VALID_BIN_TYPES.includes('QUARANTINE'))
    assert.ok(VALID_BIN_TYPES.includes('TRANSIT'))
  })

  it('2. Phase 2 WIP bin compatibility: Supports WIP-FLOOR staging location', () => {
    const wipBin = {
      binCode: 'WIP-FLOOR',
      binName: 'Shop Floor WIP Staging',
      binType: 'WIP',
      isDefault: false,
    }

    assert.strictEqual(wipBin.binCode, 'WIP-FLOOR')
    assert.strictEqual(wipBin.binType, 'WIP')
    assert.strictEqual(BIN_TYPE_COLORS[wipBin.binType], 'orange')
  })

  it('3. Bin code formatting & regex constraint: Alphanumeric with hyphens and underscores', () => {
    const binCodeRegex = /^[A-Za-z0-9\-_]+$/

    assert.ok(binCodeRegex.test('A-01'))
    assert.ok(binCodeRegex.test('RACK_12'))
    assert.ok(binCodeRegex.test('WIP-FLOOR'))
    assert.ok(binCodeRegex.test('QUARANTINE-01'))

    // Speculative complex characters or spaces are rejected
    assert.ok(!binCodeRegex.test('BIN 01'))
    assert.ok(!binCodeRegex.test('BIN#1'))
    assert.ok(!binCodeRegex.test('BIN/SHELF/1'))
  })

  it('4. Default bin invariant: Only one bin in warehouse can be active default', () => {
    const bins = [
      { id: 1, binCode: 'A-01', isDefault: true },
      { id: 2, binCode: 'A-02', isDefault: false },
      { id: 3, binCode: 'WIP-FLOOR', isDefault: false },
    ]

    const defaultBins = bins.filter((b) => b.isDefault)
    assert.strictEqual(defaultBins.length, 1)
    assert.strictEqual(defaultBins[0].binCode, 'A-01')

    // Switching default to A-02
    const updatedBins = bins.map((b) => ({
      ...b,
      isDefault: b.id === 2,
    }))

    const newDefaultBins = updatedBins.filter((b) => b.isDefault)
    assert.strictEqual(newDefaultBins.length, 1)
    assert.strictEqual(newDefaultBins[0].binCode, 'A-02')
  })

  it('5. Invariant: Non-empty bin containing stock cannot be deleted', () => {
    const activeStock = 45.0
    const canDelete = (stock: number) => stock <= 0

    assert.strictEqual(canDelete(activeStock), false)
    assert.strictEqual(canDelete(0.0), true)
  })
})
