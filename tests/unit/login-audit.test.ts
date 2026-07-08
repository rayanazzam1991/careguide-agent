import { describe, expect, it } from 'vitest'
import { describeUserAgent, maskIp } from '../../server/utils/login-audit'

describe('login audit privacy helpers', () => {
  it('masks IPv4 and IPv6 addresses', () => {
    expect(maskIp('193.83.12.44')).toBe('193.83.12.xxx')
    expect(maskIp('2001:db8:85a3::8a2e:370:7334')).toBe('2001:db8:85a3::…')
  })

  it('describes common browsers without retaining the user agent', () => {
    expect(describeUserAgent('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/140.0')).toEqual({ browser: 'Chrome', device: 'Mac' })
    expect(describeUserAgent('Mozilla/5.0 (iPhone) AppleWebKit/605.1 Safari/604.1')).toEqual({ browser: 'Safari', device: 'iPhone' })
  })
})
