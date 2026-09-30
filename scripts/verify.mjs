import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve, readJSON, filesIn } from './common.mjs';
const dir=resolve('dist/cleanweb');
const manifest=await readJSON(path.join(dir,'manifest.json'));
assert.equal(manifest.manifest_version,3);
assert.equal(manifest.name,'클린웹');
assert.equal(manifest.action.default_popup,'cleanweb/popup.html');
assert.equal(manifest.options_page,'cleanweb/options.html');
assert(!manifest.permissions.includes('declarativeNetRequestFeedback'),'Do not ship debugging request permissions');
for(const resource of [manifest.background.service_worker,manifest.action.default_popup,manifest.options_page,...Object.values(manifest.icons)]) await fs.access(path.join(dir,resource));
const resources=manifest.declarative_net_request.rule_resources;
assert(resources.length<=100);assert(resources.filter(item=>item.enabled).length<=50);
assert.equal(new Set(resources.map(item=>item.id)).size,resources.length);
const details=await readJSON(path.join(dir,'rulesets/ruleset-details.json'));
let totalRules=0,enabledRules=0;
for(const item of resources){
  const rules=await readJSON(path.join(dir,item.path));assert(Array.isArray(rules));
  const ids=new Set();
  for(const rule of rules){assert(Number.isInteger(rule.id)&&rule.id>0);assert(!ids.has(rule.id));ids.add(rule.id);assert(rule.action?.type);assert(rule.condition);assert(!rule._error);}
  assert(details.some(detail=>detail.id===item.id),`Missing metadata: ${item.id}`);
  totalRules+=rules.length;if(item.enabled)enabledRules+=rules.length;
}
assert(enabledRules<=30000,`Default static rules exceed guaranteed quota: ${enabledRules}`);
for(const id of ['cleanweb-youslist','cleanweb-sites']){assert(resources.some(item=>item.id===id&&item.enabled));assert(details.some(item=>item.id===id&&item.enabled));}
assert.equal(details.find(item=>item.id==='kor-1').lang,'');
let checkedScripts=0;
for(const file of await filesIn(dir)){
  if(file.endsWith('.json')) await readJSON(file);
  if(file.endsWith('.js')) {execFileSync(process.execPath,['--check',file],{stdio:'pipe'});checkedScripts++;}
  if(file.endsWith('.html')){
    const html=await fs.readFile(file,'utf8');
    for(const match of html.matchAll(/(?:src|href)="([^"]+)"/g)){
      const reference=match[1];if(/^(?:[a-z]+:|#|\/\/)/i.test(reference)||reference.includes('*'))continue;
      const clean=reference.split(/[?#]/)[0];if(!clean)continue;
      const target=clean.startsWith('/')?path.join(dir,clean):path.resolve(path.dirname(file),clean);
      await fs.access(target).catch(()=>{throw new Error(`Missing HTML asset: ${path.relative(dir,file)} → ${reference}`);});
    }
  }
}
console.log(JSON.stringify({manifest:manifest.version,staticRulesets:resources.length,defaultStaticRules:enabledRules,totalStaticRules:totalRules,checkedScripts},null,2));
