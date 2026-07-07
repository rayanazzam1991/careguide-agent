import { evalFixtures } from '../evals/fixtures'
import { detectSafetyBoundary } from '../server/utils/safety'

const results = evalFixtures.map(fixture => ({ ...fixture, actual: detectSafetyBoundary(fixture.input) }))
const failures = results.filter(result => result.actual !== result.expectedBoundary)
const passed = results.length - failures.length

console.log(JSON.stringify({ suite: 'careguide-deterministic-v1', total: results.length, passed, failed: failures.length, passRate: Number((passed / results.length * 100).toFixed(1)), failures }, null, 2))
if (results.length !== 42 || failures.length) process.exit(1)
