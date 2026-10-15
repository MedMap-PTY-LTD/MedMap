const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns/promises');

// These tests never initialize Firebase or contact PayFast. Transactions buffer
// writes and roll back on error; a real sandbox transaction remains required.
const records = new Map();
const clone = value => value === undefined ? undefined : structuredClone(value);
const ref = (collection, id) => ({
  id, key: collection + '/' + id,
  async get() { return snapshot(this); },
});
const snapshot = reference => ({
  id: reference.id, ref: reference, exists: records.has(reference.key),
  data: () => clone(records.get(reference.key)),
});
const collection = (name, filters = []) => ({
  doc: id => ref(name, id),
  where: (field, op, value) => collection(name, [...filters, [field, op, value]]),
  orderBy: () => collection(name, filters),
  async get() { return querySnapshot(this); },
  queryName: name, filters,
});
function querySnapshot(query) {
  const docs = [...records.entries()]
    .filter(([key, value]) => key.startsWith(query.queryName + '/') &&
      query.filters.every(([field, op, expected]) => op === 'in'
        ? expected.includes(value[field]) : value[field] === expected))
    .map(([key]) => snapshot(ref(query.queryName, key.split('/')[1])));
  return { empty: docs.length === 0, docs, forEach: cb => docs.forEach(cb) };
}
function validate(value) {
  if (value === undefined) throw new Error('Firestore rejects undefined');
  if (value && typeof value === 'object') Object.values(value).forEach(validate);
}
const db = {
  collection,
  async runTransaction(callback) {
    const writes = [];
    const transaction = {
      async get(reference) {
        assert.equal(writes.length, 0, 'Firestore requires reads before writes');
        return reference.queryName ? querySnapshot(reference) : snapshot(reference);
      },
      set(reference, data, options) { validate(data); writes.push([reference, data, !!options?.merge]); },
      update(reference, data) {
        assert.ok(records.has(reference.key), 'Cannot update a missing document');
        validate(data); writes.push([reference, data, true]);
      },
    };
    const result = await callback(transaction);
    for (const [reference, data, merge] of writes) {
      records.set(reference.key, clone(merge ? { ...records.get(reference.key), ...data } : data));
    }
    return result;
  },
};
const firebasePath = require.resolve('../src/config/firebase');
const cachedFirebase = require.cache[firebasePath];
require.cache[firebasePath] = { id: firebasePath, filename: firebasePath, loaded: true, exports: { db, app: {} } };
const authPath = require.resolve('firebase-admin/auth');
const cachedAuth = require.cache[authPath];
require.cache[authPath] = { id: authPath, filename: authPath, loaded: true, exports: {
  getAuth: () => ({ verifyIdToken: async token => {
    if (!['patient', 'stranger'].includes(token)) throw new Error('Invalid test token');
    return { uid: token, email: token + '@example.test' };
  } }),
} };
const { PaymentService, InvalidPayFastNotification } = require('../src/services/PaymentService');
const { BookingService } = require('../src/services/BookingService');
const { payFastSignature } = require('../src/services/payfastSignature');
const originalFetch = global.fetch;
const originalLookup = dns.lookup;
const originalEnv = { ...process.env };
let validationResponse;
let calls;
let server;
let base;
const get = key => clone(records.get(key));
function seed() {
  records.set('bookings/b1', {
    id: 'b1', doctorId: 'doctor', patientId: 'patient',
    isTestBooking: true, paymentEnvironment: 'sandbox', patientName: 'Sandbox Patient', patientEmail: 'patient@example.test',
    appointmentDate: '2099-01-01', appointmentTime: '09:00', endTime: '09:30',
    status: 'pending', paymentStatus: 'pending', paymentId: 'pf_test', bookingFee: 10,
    rescheduleCount: 0, maxReschedules: 2, rescheduleHistory: [],
  });
  records.set('payments/pf_test', {
    bookingId: 'b1', provider: 'payfast', environment: 'sandbox', reference: 'pf_test', amount: 10, status: 'pending',
  });
}
function notification(overrides = {}) {
  const fields = {
    merchant_id: '10004002', m_payment_id: 'pf_test', pf_payment_id: 'gateway_1',
    payment_status: 'COMPLETE', amount_gross: '10.00', ...overrides,
  };
  fields.signature = payFastSignature(fields, 'payfast', true);
  return fields;
}
const notify = overrides => PaymentService.handleITN(notification(overrides), '192.0.2.1');
before(async () => {
  dns.lookup = async () => [{ address: '192.0.2.1', family: 4 }];
  global.fetch = async (url, options) => {
    if (String(url) === 'https://sandbox.payfast.co.za/eng/query/validate') {
      calls++;
      return validationResponse();
    }
    return originalFetch(url, options);
  };
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use(require('../src/routes/bookings').default);
  server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  base = 'http://127.0.0.1:' + server.address().port;
});
beforeEach(() => {
  dns.lookup = async () => [{ address: '192.0.2.1', family: 4 }];
  records.clear(); seed(); calls = 0;
  Object.assign(process.env, {
    PAYFAST_SANDBOX: 'true', PAYFAST_MERCHANT_ID: '10004002',
    PAYFAST_MERCHANT_KEY: 'q1cd2rdny4a53', PAYFAST_PASSPHRASE: 'payfast',
    PAYFAST_CLIENT_URL: 'https://frontend.example.test', CLIENT_URL: 'https://backend.example.test', PUBLIC_BASE_URL: 'https://backend.example.test',
  });
  validationResponse = () => ({ ok: true, text: async () => 'VALID' });
});
after(async () => {
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  global.fetch = originalFetch;
  dns.lookup = originalLookup;
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  if (cachedFirebase) require.cache[firebasePath] = cachedFirebase; else delete require.cache[firebasePath];
  if (cachedAuth) require.cache[authPath] = cachedAuth; else delete require.cache[authPath];
});

test('checkout refuses explicit live mode without writing records', async () => {
  for (const mode of ['false']) {
    process.env.PAYFAST_SANDBOX = mode;
    await assert.rejects(PaymentService.createPaymentIntent('b1'), /only supports PayFast sandbox/);
  }
  assert.equal(records.size, 2);
});
test('checkout charges R10, reuses pending attempt, and never stores signed fields', async () => {
  const checkout = await PaymentService.createPaymentIntent('b1');
  assert.equal(checkout.action, 'https://sandbox.payfast.co.za/eng/process');
  assert.equal(checkout.fields.amount, '10.00');
  assert.equal(new URL(checkout.fields.return_url).origin, 'https://frontend.example.test');
  assert.equal(checkout.fields.m_payment_id, 'pf_test');
  assert.equal(checkout.fields.passphrase, undefined);
  assert.equal(new URL(checkout.fields.return_url).searchParams.get('bookingId'), 'b1');
  assert.equal(get('payments/pf_test').signature, undefined);
  assert.equal(get('payments/pf_test').merchant_key, undefined);
});
test('failed attempt gets a new reference', async () => {
  records.get('payments/pf_test').status = 'failed';
  const checkout = await PaymentService.createPaymentIntent('b1');
  assert.notEqual(checkout.fields.m_payment_id, 'pf_test');
  assert.equal(get('bookings/b1').paymentId, checkout.fields.m_payment_id);
});
test('cancelled and already paid bookings cannot create checkout', async () => {
  records.get('bookings/b1').status = 'cancelled';
  await assert.rejects(PaymentService.createPaymentIntent('b1'), /cannot be paid/);
  records.get('bookings/b1').status = 'confirmed';
  records.get('bookings/b1').paymentStatus = 'paid';
  await assert.rejects(PaymentService.createPaymentIntent('b1'), /cannot be paid/);
});
test('validated completion confirms booking and duplicate ITN changes nothing', async () => {
  await notify();
  assert.equal(get('bookings/b1').paymentStatus, 'paid');
  assert.equal(get('bookings/b1').status, 'confirmed');
  const before = clone([...records.entries()]);
  await notify();
  assert.deepEqual([...records.entries()], before);
});
for (const [name, overrides] of [
  ['wrong amount', { amount_gross: '100.00' }],
  ['wrong merchant', { merchant_id: 'other' }],
  ['invalid gateway reference', { pf_payment_id: '../bad' }],
]) test('rejects ' + name + ' without any writes', async () => {
  await assert.rejects(notify(overrides), InvalidPayFastNotification);
  assert.equal(get('bookings/b1').paymentStatus, 'pending');
  assert.equal(calls, 0);
});
test('rejects forged signature and malformed field shapes', async () => {
  const payload = notification(); payload.signature = '0'.repeat(32);
  await assert.rejects(PaymentService.handleITN(payload, '192.0.2.1'), InvalidPayFastNotification);
  await assert.rejects(PaymentService.handleITN({ amount_gross: ['10.00'] }, '192.0.2.1'), InvalidPayFastNotification);
  assert.equal(calls, 0);
});
test('rejects unexpected source IP', async () => {
  await assert.rejects(PaymentService.handleITN(notification(), '192.0.2.2'), InvalidPayFastNotification);
  assert.equal(calls, 0);
});
test('invalid and unavailable PayFast postback leave booking unpaid', async () => {
  validationResponse = () => ({ ok: true, text: async () => 'INVALID' });
  await assert.rejects(notify(), InvalidPayFastNotification);
  validationResponse = () => ({ ok: false, status: 503 });
  await assert.rejects(notify(), /unavailable/);
  assert.equal(get('bookings/b1').paymentStatus, 'pending');
});
test('unknown payment reference and unknown status roll back', async () => {
  await assert.rejects(notify({ m_payment_id: 'unknown' }), /Unknown payment reference/);
  await assert.rejects(notify({ payment_status: 'unexpected' }), /Unknown payment status/);
  assert.equal(get('bookings/b1').paymentStatus, 'pending');
});
test('failed checkout can retry but later failure cannot downgrade paid booking', async () => {
  await notify({ payment_status: 'FAILED' });
  assert.equal(get('bookings/b1').paymentStatus, 'failed');
  await notify();
  await notify({ payment_status: 'FAILED' });
  assert.equal(get('bookings/b1').paymentStatus, 'paid');
});
test('cancel before payment routes late completion into one R10 refund', async () => {
  assert.equal((await BookingService.cancelBooking('b1')).success, true);
  await notify();
  assert.equal(get('bookings/b1').status, 'cancelled');
  assert.equal(get('bookings/b1').paymentStatus, 'refund_pending');
  assert.equal(get('refundQueue/pf_test').amount, 10);
  await notify();
  assert.equal([...records.keys()].filter(key => key.startsWith('refundQueue/')).length, 1);
});
test('payment before cancellation creates one refund atomically and frees owned slot', async () => {
  records.set('doctorAvailability/doctor_2099-01-01', {
    slots: [{ startTime: '09:00', isAvailable: false, bookingId: 'b1' }],
  });
  await notify();
  const result = await BookingService.cancelBooking('b1');
  assert.equal(result.refundPending, true);
  assert.equal(get('bookings/b1').paymentStatus, 'refund_pending');
  assert.equal(get('payments/pf_test').status, 'refund_pending');
  assert.equal(get('refundQueue/pf_test').amount, 10);
  assert.deepEqual(get('doctorAvailability/doctor_2099-01-01').slots, [{ startTime: '09:00', isAvailable: true }]);
  await notify();
  assert.equal(get('bookings/b1').status, 'cancelled');
});
test('late completion for replaced attempt does not confirm current booking', async () => {
  records.get('bookings/b1').paymentId = 'pf_new';
  await notify();
  assert.equal(get('bookings/b1').status, 'pending');
  assert.equal(get('refundQueue/pf_test').amount, 10);
});
test('second gateway charge creates separate refund without changing first payment', async () => {
  await notify();
  await notify({ pf_payment_id: 'gateway_2' });
  assert.equal(get('payments/pf_test').pfPaymentId, 'gateway_1');
  assert.equal(get('refundQueue/duplicate_gateway_2').amount, 10);
});
test('API rejects missing/invalid auth and nonowners before checkout writes', async () => {
  const path = base + '/api/bookings/b1/payfast-checkout';
  for (const token of ['', 'invalid', 'stranger']) {
    const response = await fetch(path, { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
    assert.equal(response.status, token === 'stranger' ? 403 : 401);
  }
  assert.equal(records.size, 2);
  const response = await fetch(path, { method: 'POST', headers: { Authorization: 'Bearer patient' } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).checkout.fields.amount, '10.00');
});


test('authenticated create ignores browser identity and fees', async () => {
  records.set('users/patient', { fullName: 'Sandbox Patient', isActive: true });
  records.set('doctors/doctor', {
    verificationStatus: 'verified', consultationDuration: 30, consultationFee: 750,
  });
  const response = await fetch(base + '/api/bookings/create-with-payment', {
    method: 'POST',
    headers: { Authorization: 'Bearer patient', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doctorId: 'doctor', appointmentDate: '2099-01-02', appointmentTime: '09:00',
      patientId: 'stranger', consultationFee: 1, bookingFee: 1, sandboxTest: true,
    }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.checkout.fields.amount, '10.00');
  const booking = get('bookings/' + result.bookingId);
  assert.equal(booking.patientId, 'patient');
  assert.equal(booking.patientEmail, 'patient@example.test');
  assert.equal(booking.consultationFee, 750);
  assert.equal(booking.bookingFee, 10);
  assert.equal(booking.status, 'pending');
});
test('history API returns only the authenticated patients bookings', async () => {
  let response = await fetch(base + '/api/bookings/patient/patient', {
    headers: { Authorization: 'Bearer stranger' },
  });
  assert.equal(response.status, 403);
  response = await fetch(base + '/api/bookings/patient/patient', {
    headers: { Authorization: 'Bearer patient' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).map(booking => booking.id), ['b1']);
});
test('unpaid reschedule stays pending and checkout remains available', async () => {
  const result = await BookingService.rescheduleBooking('b1', '2099-01-02', '09:30');
  assert.equal(result.success, true);
  assert.equal(get('bookings/b1').status, 'pending');
  assert.equal((await PaymentService.createPaymentIntent('b1')).fields.amount, '10.00');
});
test('cancellation does not free a slot held by a different booking', async () => {
  records.set('doctorAvailability/doctor_2099-01-01', {
    slots: [{ startTime: '09:00', isAvailable: false, bookingId: 'different' }],
  });
  assert.equal((await BookingService.cancelBooking('b1')).success, true);
  assert.equal(get('doctorAvailability/doctor_2099-01-01').slots[0].isAvailable, false);
});


test('public sandbox settings work on Render without merchant environment secrets', async () => {
  delete process.env.PAYFAST_SANDBOX;
  delete process.env.PUBLIC_BASE_URL;
  process.env.RENDER_EXTERNAL_URL = 'https://sandbox-service.example.test';
  process.env.PAYFAST_MERCHANT_ID = 'do-not-use-live';
  process.env.PAYFAST_MERCHANT_KEY = 'do-not-use-live';
  process.env.PAYFAST_PASSPHRASE = 'do-not-use-live';
  const checkout = await PaymentService.createPaymentIntent('b1');
  assert.equal(checkout.fields.merchant_id, '10004002');
  assert.equal(checkout.fields.merchant_key, 'q1cd2rdny4a53');
  assert.equal(checkout.fields.email_address, 'sandbox@example.com');
  assert.equal(checkout.fields.name_first, 'MedMap');
  assert.equal(checkout.fields.notify_url, 'https://sandbox-service.example.test/api/payments/payfast/notify');
  assert.equal(checkout.action, 'https://sandbox.payfast.co.za/eng/process');
});
test('existing non-test bookings cannot be converted to sandbox paid bookings', async () => {
  delete records.get('bookings/b1').isTestBooking;
  delete records.get('bookings/b1').paymentEnvironment;
  await assert.rejects(PaymentService.createPaymentIntent('b1'), /Only sandbox test bookings/);
  assert.equal(get('bookings/b1').paymentStatus, 'pending');
});


test('accepts a notification source published only by PayFast worker DNS', async () => {
  dns.lookup = async host => host === 'w1w.payfast.co.za'
    ? [{ address: '192.0.2.9', family: 4 }] : [];
  await PaymentService.handleITN(notification(), '192.0.2.9');
  assert.equal(get('bookings/b1').paymentStatus, 'paid');
});

test('Render callbacks use the managed Cloudflare sender header and fail closed without it', () => {
  const { notificationSource } = require('../src/routes/payfastITN');
  const previous = process.env.RENDER;
  try {
    process.env.RENDER = 'true';
    assert.equal(notificationSource({ ip: '192.0.2.10', get: name => name === 'cf-connecting-ip' ? '192.0.2.1' : 'forged' }), '192.0.2.1');
    assert.equal(notificationSource({ ip: '192.0.2.10', get: () => undefined }), '');
    assert.equal(notificationSource({ ip: '192.0.2.10', get: () => 'invalid' }), '');
    delete process.env.RENDER;
    assert.equal(notificationSource({ ip: '192.0.2.10', get: () => '192.0.2.1' }), '192.0.2.10');
  } finally {
    if (previous === undefined) delete process.env.RENDER; else process.env.RENDER = previous;
  }
});