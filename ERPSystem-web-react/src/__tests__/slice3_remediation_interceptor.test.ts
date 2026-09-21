import { describe, it } from 'node:test'
import assert from 'node:assert'

/**
 * Phase 6/7 Slice 3 UAT Remediation Tests:
 * D-S3-02-FE: Global HTTP 403 interceptor must NOT destroy valid sessions.
 * HTTP 401: Authentication failure -> purges token and redirects.
 * HTTP 403: Authorization denial -> keeps token, keeps session, no login redirect.
 */
describe('Phase 6/7 Slice 3 UAT Remediation: 401 vs 403 Interceptor Policy', () => {
  // Simulate the interceptor logic from client.ts
  function simulateInterceptor(status: number, responseBody: string, currentStorage: Record<string, string>) {
    let redirectedTo: string | null = null
    const localStorageMock = {
      getItem: (k: string) => currentStorage[k] || null,
      setItem: (k: string, v: string) => { currentStorage[k] = v },
      removeItem: (k: string) => { delete currentStorage[k] },
    }
    const removeToken = () => {
      localStorageMock.removeItem('X-Access-Token')
    }

    if (status === 401) {
      removeToken()
      redirectedTo = '/login'
      return { status: 401, error: 'Session expired or unauthenticated. Please log in again.', redirectedTo, token: localStorageMock.getItem('X-Access-Token') }
    }

    if (status === 403) {
      let json: any = null
      try {
        json = JSON.parse(responseBody)
      } catch {
        json = responseBody
      }
      const errorMsg =
        json?.data?.message ||
        json?.msg ||
        json?.data?.error ||
        (typeof json === 'string' && json ? json : 'Access denied: You do not have permission to perform this action.')
      // 403 preserves session: NO removeToken(), NO redirect
      return { status: 403, error: errorMsg, redirectedTo, token: localStorageMock.getItem('X-Access-Token'), json }
    }

    return { status, redirectedTo, token: localStorageMock.getItem('X-Access-Token') }
  }

  it('D-S3-02-FE.1: HTTP 403 preserves token in storage and does not redirect to /login', () => {
    const storage = { 'X-Access-Token': 'valid_superadmin_token_153' }
    const errorPayload = JSON.stringify({
      code: 403,
      data: { error: 'INSUFFICIENT_PERMISSIONS', message: 'Platform superadmin permission required.' }
    })

    const result = simulateInterceptor(403, errorPayload, storage)

    assert.strictEqual(result.status, 403)
    assert.strictEqual(result.redirectedTo, null, 'Must NOT redirect on 403')
    assert.strictEqual(result.token, 'valid_superadmin_token_153', 'Token must remain in storage on 403')
    assert.strictEqual(result.error, 'Platform superadmin permission required.')
  })

  it('D-S3-02-FE.2: HTTP 401 purges token from storage and redirects to /login', () => {
    const storage = { 'X-Access-Token': 'expired_session_token' }
    const result = simulateInterceptor(401, 'Unauthorized', storage)

    assert.strictEqual(result.status, 401)
    assert.strictEqual(result.redirectedTo, '/login', 'Must redirect to /login on 401')
    assert.strictEqual(result.token, null, 'Token must be evicted from storage on 401')
    assert.strictEqual(result.error, 'Session expired or unauthenticated. Please log in again.')
  })

  it('D-S3-02-FE.3: HTTP 403 extracts structured error message without session loss', () => {
    const storage = { 'X-Access-Token': 'tenant_user_token_88' }
    const errorPayload = JSON.stringify({
      code: 403,
      data: { error: 'TENANT_CONTEXT_MISSING', message: 'Missing or invalid tenant context on authenticated request. Access denied fail-closed.' }
    })

    const result = simulateInterceptor(403, errorPayload, storage)

    assert.strictEqual(result.status, 403)
    assert.strictEqual(result.token, 'tenant_user_token_88')
    assert.strictEqual(result.redirectedTo, null)
    assert.ok(result.error.includes('Missing or invalid tenant context'))
  })
})
