import test from'node:test';
import assert from'node:assert/strict';
import{generateTotpSecret,totp,verifyTotp,encryptSecret,decryptSecret}from'../src/mfa.js';

test('TOTP accepts current code and rejects malformed code',()=>{
  const secret=generateTotpSecret();
  const code=totp(secret);
  assert.match(secret,/^[A-Z2-7]+$/);
  assert.equal(verifyTotp(secret,code),true);
  assert.equal(verifyTotp(secret,'123'),false);
});

test('MFA secret encryption round-trips without plaintext storage',()=>{
  const secret=generateTotpSecret();
  const encrypted=encryptSecret(secret);
  assert.notEqual(encrypted,secret);
  assert.equal(decryptSecret(encrypted),secret);
});
