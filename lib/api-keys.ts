import crypto from 'crypto'

const KEY_PREFIX = 'archai_live_'

export function generateApiKey(): { fullKey: string; keyPrefix: string; keyHash: string } {
  const random = crypto.randomBytes(24).toString('hex')
  const fullKey = `${KEY_PREFIX}${random}`
  const keyPrefix = fullKey.slice(0, KEY_PREFIX.length + 8) // e.g. archai_live_a1b2c3d4
  const keyHash = hashApiKey(fullKey)
  return { fullKey, keyPrefix, keyHash }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}
