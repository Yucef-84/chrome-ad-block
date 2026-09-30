import test from 'node:test';
import assert from 'node:assert/strict';
import {siteFromURL,normalizeHostname,assertNarrowSelector,ruleRows,describeSelector} from '../src/cleanweb/model.js';
test('restrict actions to HTTP(S) pages',()=>{
  assert.equal(siteFromURL('https://gall.dcinside.com/mgallery/board/lists/?id=ai_utilize'),'gall.dcinside.com');
  for(const url of ['chrome://extensions','file:///tmp/test.html','javascript:alert(1)','about:blank','not a url'])assert.equal(siteFromURL(url),null);
});
test('normalize domains without accepting URLs or match patterns',()=>{
  assert.equal(normalizeHostname(' GALL.DCINSIDE.COM '),'gall.dcinside.com');
  assert.equal(normalizeHostname('한국.example'),'xn--3e0b707e.example');
  for(const host of ['https://dcinside.com','dcinside.com/path','*.dcinside.com','user@dcinside.com','dcinside.com?x','bad..com','-bad.com','a'.repeat(64)+'.com'])assert.throws(()=>normalizeHostname(host));
});
test('reject whole-page selectors while allowing narrow descendants',()=>{
  const valid=()=>true;
  for(const value of ['body','html','*',':root','#advert, body'])assert.throws(()=>assertNarrowSelector(value,valid));
  assert.equal(assertNarrowSelector(' body > .advert ',valid),'body > .advert');
  assert.throws(()=>assertNarrowSelector('#invalid[',()=>false));
  assert.throws(()=>assertNarrowSelector('a'.repeat(2049),valid));
});
test('show and search procedural and CSS rules without parsing as markup',()=>{
  const procedural=JSON.stringify({raw:'.advert:has(.sponsor)',selector:'.advert'});
  assert.equal(describeSelector(procedural),'.advert:has(.sponsor)');
  const entries=[['gall.dcinside.com',['#ad',procedural]],['example.com',['#other']]];
  assert.equal(ruleRows(entries,'DCINSIDE').length,2);
  assert.equal(ruleRows(entries,'sponsor')[0].selector,procedural);
  assert.equal(ruleRows(entries,'none').length,0);
});
