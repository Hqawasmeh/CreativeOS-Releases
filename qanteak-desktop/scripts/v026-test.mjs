import assert from 'node:assert/strict';
import {draftKey,normalizeBlocks,sameBlocks,validDraft,trimHistory,DRAFT_MAX_AGE_MS} from '../src/v026-reliability-model.js';

assert.equal(draftKey('abc'),'qanteak.rc9.v026.documentDraft.abc');
assert.throws(()=>draftKey(''),/recordId/);
assert.deepEqual(normalizeBlocks([{id:1,type:'heading',text:7},{type:'unknown'}]),[
  {id:'1',type:'heading',text:'7'},
  {id:'block-2',type:'paragraph',text:''}
]);
assert.equal(sameBlocks([{id:'a',type:'paragraph',text:'x'}],[{id:'a',type:'paragraph',text:'x'}]),true);
assert.equal(sameBlocks([{id:'a',type:'paragraph',text:'x'}],[{id:'a',type:'paragraph',text:'y'}]),false);
const now=Date.now();
assert.equal(validDraft({recordId:'a',savedAt:new Date(now-1000).toISOString(),blocks:[]},now),true);
assert.equal(validDraft({recordId:'a',savedAt:new Date(now-DRAFT_MAX_AGE_MS-1).toISOString(),blocks:[]},now),false);
assert.equal(trimHistory([[{id:'a',type:'paragraph',text:'x'}],[{id:'a',type:'paragraph',text:'x'}],[{id:'a',type:'paragraph',text:'y'}]],40).length,2);
console.log('V0.26 reliability tests pass: draft keys, normalization, age validation, deduplication and history bounds.');
