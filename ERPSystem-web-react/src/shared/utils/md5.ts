/**
 * MD5 Hash Utility
 *
 * Re-exports the standard `md5` npm package.
 * This ensures hash output matches the backend's
 * `Tools.md5Encryp()` (Java BigInteger-based MD5).
 */
import md5Lib from 'md5'

export function md5(input: string): string {
  return md5Lib(input)
}
