import assert from 'node:assert/strict';
import test from 'node:test';
import { CREDIT_CAP, canReserve, emptyLedger, reservedCredits } from '../tools/art/tripo-trial.mjs';

test('Tripo trial ledger refuses a reservation that crosses its hard cap', () => {
  const ledger = emptyLedger();
  ledger.entries.push({ reservedCredits: CREDIT_CAP - 1 });
  assert.equal(reservedCredits(ledger), CREDIT_CAP - 1);
  assert.equal(canReserve(ledger, 1), true);
  assert.equal(canReserve(ledger, 2), false);
});

test('Tripo trial ledger counts uncertain reservations conservatively', () => {
  const ledger = emptyLedger();
  ledger.entries.push({ reservedCredits: 40, status: 'uncertain' });
  assert.equal(reservedCredits(ledger), 40);
  assert.equal(canReserve(ledger, 261), false);
});

test('Tripo trial ledger counts actual overages and never raises its hard cap', () => {
  const ledger = emptyLedger();
  ledger.capCredits = 9999;
  ledger.entries.push({ reservedCredits: 40, consumedCredits: 55 });
  assert.equal(reservedCredits(ledger), 55);
  assert.equal(canReserve(ledger, CREDIT_CAP - 55), true);
  assert.equal(canReserve(ledger, CREDIT_CAP - 54), false);
});
