import { expect, request as requestFactory, test } from '@playwright/test'

test('isolates 20 concurrent synthetic booking sessions', async ({ request: _request }, testInfo) => {
  test.setTimeout(60_000)
  const baseURL = String(testInfo.project.use.baseURL)
  const clients = await Promise.all(Array.from({ length: 20 }, () => requestFactory.newContext({ baseURL })))

  try {
    await Promise.all(clients.map(client => client.get('/api/demo/bootstrap')))
    const availability = await Promise.all(clients.map(client => client.get('/api/demo/availability', {
      params: { serviceId: 'srv-nutrition', providerId: 'pro-nora' },
    }).then(response => response.json() as Promise<{ slots: Array<{ id: string }> }>)))

    const holds = await Promise.all(clients.map(async (client, index) => {
      const slot = availability[index]?.slots[index]
      expect(slot, `session ${index + 1} should receive an isolated slot`).toBeTruthy()
      const response = await client.post('/api/demo/hold', { data: { slotId: slot!.id } })
      expect(response.ok()).toBe(true)
      return response.json() as Promise<{ id: string }>
    }))

    const crossSessionAttempt = await clients[1]!.post('/api/demo/confirm', { data: { holdId: holds[0]!.id, approved: true } })
    expect(crossSessionAttempt.status()).toBe(409)

    const confirmations = await Promise.all(clients.map(async (client, index) => {
      const response = await client.post('/api/demo/confirm', { data: { holdId: holds[index]!.id, approved: true, idempotencyKey: `load-session-${index}` } })
      expect(response.ok()).toBe(true)
      return response.json() as Promise<{ reference: string }>
    }))
    expect(new Set(confirmations.map(item => item.reference)).size).toBe(20)
  } finally {
    await Promise.all(clients.map(client => client.dispose()))
  }
})
