const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { payFastEncode, payFastSignature } = require('../src/services/payfastSignature');

test('PayFast encoding uses uppercase escapes and plus for spaces', () => {
  assert.equal(payFastEncode("  John Doe's booking!  "), 'John+Doe%27s+booking%21');
});

test('checkout signs ordered, nonblank fields and appends the passphrase', () => {
  const fields = {
    merchant_id: '10004002',
    merchant_key: 'q1cd2rdny4a53',
    name_first: 'John Doe',
    name_last: '',
    amount: '10.00',
    signature: 'ignored',
  };
  const expectedString =
    'merchant_id=10004002&merchant_key=q1cd2rdny4a53&name_first=John+Doe&amount=10.00&passphrase=payfast';
  const expected = crypto.createHash('md5').update(expectedString).digest('hex');
  assert.equal(payFastSignature(fields, 'payfast'), expected);
  assert.notEqual(payFastSignature({ amount: '10.00', merchant_id: '10004002' }, 'payfast'), expected);
});

test('ITN signs blank fields as PayFast posts them', () => {
  const fields = { m_payment_id: 'pf_123', item_description: '', amount_gross: '10.00' };
  const expectedString = 'm_payment_id=pf_123&item_description=&amount_gross=10.00&passphrase=payfast';
  const expected = crypto.createHash('md5').update(expectedString).digest('hex');
  assert.equal(payFastSignature(fields, 'payfast', true), expected);
  assert.notEqual(payFastSignature(fields, 'payfast'), expected);
});
