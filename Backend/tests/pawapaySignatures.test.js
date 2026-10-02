/**
 * M6 - pawaPay webhook signature verification must fail CLOSED by default,
 * regardless of PAWAPAY_ENVIRONMENT (which can be left unset/misspelled in a
 * real deployment without the server refusing to start). The two bypass
 * points in verifySignature() now require an explicit, deliberately-named
 * opt-in (PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS=true), never inferred from
 * PAWAPAY_ENVIRONMENT.
 */
const { verifySignature } = require('../utils/pawapaySignatures');

const fakeReq = (headers = {}) => ({
  headers,
  path: '/api/v1/payments/webhook',
  method: 'POST',
  originalUrl: '/api/v1/payments/webhook',
  get: () => 'localhost',
  body: {},
});

describe('verifySignature - fail-closed by default (M6)', () => {
  let savedFlag;
  let savedEnv;
  let savedApiKey;
  let savedPublicKey;

  beforeEach(() => {
    savedFlag = process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS;
    savedEnv = process.env.PAWAPAY_ENVIRONMENT;
    savedApiKey = process.env.PAWAPAY_API_KEY;
    savedPublicKey = process.env.PAWAPAY_PUBLIC_KEY;
    delete process.env.PAWAPAY_API_KEY;
    delete process.env.PAWAPAY_PUBLIC_KEY;
  });

  afterEach(() => {
    if (savedFlag === undefined) delete process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS;
    else process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS = savedFlag;
    if (savedEnv === undefined) delete process.env.PAWAPAY_ENVIRONMENT;
    else process.env.PAWAPAY_ENVIRONMENT = savedEnv;
    if (savedApiKey === undefined) delete process.env.PAWAPAY_API_KEY;
    else process.env.PAWAPAY_API_KEY = savedApiKey;
    if (savedPublicKey === undefined) delete process.env.PAWAPAY_PUBLIC_KEY;
    else process.env.PAWAPAY_PUBLIC_KEY = savedPublicKey;
  });

  it('should reject an unsigned request when the bypass flag is unset, even with PAWAPAY_ENVIRONMENT unset (the dangerous old default)', async () => {
    delete process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS;
    delete process.env.PAWAPAY_ENVIRONMENT;
    const result = await verifySignature(fakeReq());
    expect(result).toBe(false);
  });

  it('should reject an unsigned request when the bypass flag is unset, even with PAWAPAY_ENVIRONMENT explicitly set to sandbox', async () => {
    delete process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS;
    process.env.PAWAPAY_ENVIRONMENT = 'sandbox';
    const result = await verifySignature(fakeReq());
    expect(result).toBe(false);
  });

  it('should reject an unsigned request when the flag is any value other than the literal string "true"', async () => {
    process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS = 'yes';
    const result = await verifySignature(fakeReq());
    expect(result).toBe(false);
  });

  it('should allow an unsigned request only when the flag is explicitly "true"', async () => {
    process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS = 'true';
    const result = await verifySignature(fakeReq());
    expect(result).toBe(true);
  });

  it('should reject when signature headers are present but no public key is resolvable, and the bypass flag is unset', async () => {
    delete process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS;
    const result = await verifySignature(
      fakeReq({
        signature: 'sig1=:AAAA:',
        'signature-input': 'sig1=("@method");created=1700000000;keyid="key-1"',
      })
    );
    expect(result).toBe(false);
  });

  it('should allow when signature headers are present but no public key is resolvable, with the bypass flag explicitly set', async () => {
    process.env.PAWAPAY_ALLOW_UNSIGNED_WEBHOOKS = 'true';
    const result = await verifySignature(
      fakeReq({
        signature: 'sig1=:AAAA:',
        'signature-input': 'sig1=("@method");created=1700000000;keyid="key-1"',
      })
    );
    expect(result).toBe(true);
  });
});
