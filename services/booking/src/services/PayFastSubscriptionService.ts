import { PayFastConfiguration } from './PaymentService';
import { payFastApiSignature } from './payfastSignature';

function signedHeaders(config: PayFastConfiguration, body: Record<string, string> = {}) {
  const headers = {
    'merchant-id': config.merchantId,
    version: 'v1',
    timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '+02:00'),
  };
  return { ...headers, signature: payFastApiSignature({ ...headers, ...body }, config.passphrase || '') };
}

async function requestSubscription(
  token: string,
  action: 'cancel' | 'update',
  config: PayFastConfiguration,
  method: 'PUT' | 'PATCH',
  body: Record<string, string> = {},
): Promise<any> {
  if (!token || !config.passphrase) throw new Error('PayFast subscription credentials are unavailable');
  const headers = signedHeaders(config, body);
  const response = await fetch(`https://api.payfast.co.za/subscriptions/${encodeURIComponent(token)}/${action}`, {
    method,
    headers: { ...headers, ...(Object.keys(body).length ? { 'Content-Type': 'application/json' } : {}) },
    ...(Object.keys(body).length ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`PayFast could not ${action} the subscription (${response.status})`);
  const result = await response.json() as any;
  if (result?.status !== 'success' || !result?.data?.response) {
    throw new Error(result?.data?.message || `PayFast could not ${action} the subscription`);
  }
  return result.data.response;
}

export class PayFastSubscriptionService {
  static cancel(token: string, config: PayFastConfiguration) {
    return requestSubscription(token, 'cancel', config, 'PUT');
  }

  static update(token: string, config: PayFastConfiguration, amountCents: number, runDate: string) {
    if (!Number.isSafeInteger(amountCents) || amountCents < 500) throw new Error('Invalid recurring subscription amount');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(runDate)) throw new Error('Invalid recurring subscription run date');
    return requestSubscription(token, 'update', config, 'PATCH', {
      amount: String(amountCents),
      run_date: runDate,
    });
  }
}
