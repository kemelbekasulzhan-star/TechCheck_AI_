import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerLimitError } from '../src/lib/provider-limit-error';

test('exhausted balance requires billing action, not a delayed retry', () => {
  const result = providerLimitError('credit_balance_exhausted', 'insufficient_quota');
  assert.equal(result.code, 'AI_CREDITS_EXHAUSTED');
  assert.match(result.message, /Billing/);
});
test('specific spend limits take precedence over the broad quota type', () => {
  for (const code of ['organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded']) {
    assert.equal(providerLimitError(code, 'insufficient_quota').code, 'AI_SPEND_LIMIT');
  }
});
test('ambiguous quota errors do not claim a specific billing cause', () => {
  assert.equal(providerLimitError('insufficient_quota', null).code, 'AI_QUOTA_EXHAUSTED');
  assert.equal(providerLimitError(null, 'insufficient_quota').code, 'AI_QUOTA_EXHAUSTED');
});
test('ordinary throttling does not suggest buying credits', () => {
  for (const code of ['rate_limit_exceeded', 'slow_down', null]) {
    const result = providerLimitError(code, 'rate_limit_error');
    assert.equal(result.code, 'AI_RATE_LIMIT');
    assert.doesNotMatch(result.message, /Billing|баланс|пополн/i);
  }
});
