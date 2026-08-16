/**
 * MD5 Hash Utility
 *
 * Re-exports the standard `md5` npm package (same as the Vue frontend uses).
 * This ensures hash output matches `import md5 from 'md5'` used in the
 * original jshERP-web codebase, which in turn matches the backend's
 * `Tools.md5Encryp()` (Java BigInteger-based MD5).
 */
import md5Lib from 'md5'

export function md5(input: string): string {
  return md5Lib(input)
}
