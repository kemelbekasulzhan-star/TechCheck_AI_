// Only fixed, user-facing messages leave the server; provider payloads may contain sensitive data.
export function providerLimitError(code: string | null | undefined, type: string | null | undefined) {
  if (code === 'credit_balance_exhausted') return {
    code: 'AI_CREDITS_EXHAUSTED',
    message: 'На API-балансе OpenAI закончились средства. Пополните баланс в OpenAI Platform → Settings → Billing. До пополнения используйте учебный режим или шаблонное извлечение.',
  };
  if (['organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded'].includes(code ?? '')) return {
    code: 'AI_SPEND_LIMIT',
    message: 'Достигнут лимит расходов или использования API в OpenAI. Проверьте Limits для организации и проекта. Повтор запроса без изменения лимита не поможет.',
  };
  if (code === 'insufficient_quota' || type === 'insufficient_quota') return {
    code: 'AI_QUOTA_EXHAUSTED',
    message: 'Недостаточно доступной квоты OpenAI API. Проверьте баланс Billing и лимиты Limits в OpenAI Platform. До восстановления доступа используйте другой режим.',
  };
  return {
    code: 'AI_RATE_LIMIT',
    message: 'OpenAI временно ограничил частоту запросов. Подождите и повторите позже. Автоматического повтора нет.',
  };
}
