import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resultCompanionsMarkup } from '../src/ui/runResultCard.js';

test('result companions use only the supplied snapshot, support both forms and escape names', () => {
  assert.equal(resultCompanionsMarkup([],true),'');
  const html=resultCompanionsMarkup(['tidefin',{id:'mossling',name:'Moss <new>'}],true);
  assert.equal((html.match(/Bond secured/g)||[]).length,2);
  assert.match(html,/tidefin/);assert.match(html,/Moss &lt;new&gt;/);assert.doesNotMatch(html,/Emberhorn|<new>/);
});
test('loss companions never claim secured progress', () => {
  const html=resultCompanionsMarkup([{id:'tidefin',name:'Tidefin'}],false);
  assert.match(html,/Wildkin returned to the wild/);assert.doesNotMatch(html,/secured/);
});
