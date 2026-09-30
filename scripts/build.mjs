import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve, readJSON, writeJSON, gitCommit, cleanGenerated, filesIn } from './common.mjs';
import { writeIcons } from './icons.mjs';

const lock = await readJSON(resolve('upstream.lock.json'));
const {version} = await readJSON(resolve('package.json'));
if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(version) || version.split('.').some(part=>Number(part)>65535)) throw new Error('Version must be a Chrome-compatible numeric version');
for (const [name, spec] of Object.entries(lock)) {
  if (gitCommit(resolve('vendor', name)) !== spec.commit) throw new Error(`${name}: source version differs from lock. Run bootstrap.`);
}
if (gitCommit(resolve('vendor/ubol/uBlock')) !== lock.ubol.ublockCommit) throw new Error('uBlock submodule version differs from lock');
const out = resolve('dist/cleanweb');
const work = resolve('.cache/compiler');
const custom = resolve('.cache/custom-package');
await cleanGenerated(out); await cleanGenerated(work); await cleanGenerated(custom);
await fs.cp(resolve('vendor/ubol/chromium'), out, { recursive: true });

// Follow upstream tools/make-nodejs.sh and tools/make-mv3.sh, using Node fs for Windows.
const ubo = resolve('vendor/ubol/uBlock');
await fs.cp(path.join(ubo, 'src/js'), path.join(work,'js'), { recursive: true });
await fs.cp(path.join(ubo, 'src/lib'), path.join(work,'lib'), { recursive: true });
await fs.cp(path.join(ubo, 'platform/mv3/extension/js/offscreen'),path.join(work,'js/offscreen'),{recursive:true});
await fs.copyFile(path.join(ubo,'src/js/regex-analyzer.js'),path.join(work,'js/offscreen/regex-analyzer.js'));
await fs.cp(path.join(ubo, 'platform/mv3/scriptlets'),path.join(work,'scriptlets'),{recursive:true});
await fs.cp(path.join(ubo,'src/web_accessible_resources'),path.join(work,'web_accessible_resources'),{recursive:true});
for (const name of ['make-rulesets.js','package.json']) await fs.copyFile(path.join(ubo,'platform/mv3',name),path.join(work,name));
for (const name of ['ubo-parser.js','utils.js']) await fs.copyFile(path.join(ubo,'platform/mv3/extension/js',name),path.join(work,'js',name));
await fs.copyFile(path.join(ubo,'src/lib/punycode.js'),path.join(work,'js/punycode.js'));
await fs.cp(path.join(ubo,'src/lib/regexanalyzer'),path.join(work,'js/regexanalyzer'),{recursive:true});
await fs.mkdir(path.join(custom,'rulesets'),{recursive:true});
await writeJSON(path.join(custom,'manifest.json'),{manifest_version:3,version});
const definitions = [
  {id:'cleanweb-youslist',name:'한국 사이트 · YousList',group:'regions',enabled:true,lang:'ko',urls:['https://github.com/yous/YousList/raw/master/youslist.txt'],homeURL:'https://github.com/yous/YousList',source:resolve('vendor/youslist/youslist.txt')},
  {id:'cleanweb-sites',name:'클린웹 · 사이트 보완',group:'default',enabled:true,urls:['https://cleanweb.invalid/local-sites.txt'],homeURL:'about:blank',source:resolve('filters/cleanweb-sites.txt')}
];
await fs.mkdir(resolve('.cache/mv3-data/chromium'),{recursive:true});
// Fixed secret makes trusted-directive processing reproducible. No network during build.
await fs.writeFile(resolve('.cache/mv3-data/secret.txt'),'cleanweb-build-v1');
for (const definition of definitions) await fs.copyFile(definition.source,resolve('.cache/mv3-data/chromium',definition.id));
await writeJSON(path.join(work,'rulesets.json'),definitions.map(({source,...rest})=>rest));
execFileSync(process.execPath,[path.join(work,'make-rulesets.js'),`output=${custom.replaceAll('\\','/')}`,'platform=chromium'],{cwd:work,stdio:'inherit'});

const manifest = await readJSON(path.join(out,'manifest.json'));
const extraManifest = await readJSON(path.join(custom,'manifest.json'));
for (const file of await filesIn(path.join(custom,'rulesets'))) {
  const destination = path.join(out,path.relative(custom,file));
  await fs.mkdir(path.dirname(destination),{recursive:true});
  if (['ruleset-details.json','generic-details.json','scriptlet-details.json'].includes(path.basename(file))) {
    const original = await readJSON(destination);
    const text = (await fs.readFile(file,'utf8')).trim();
    const extra = text === 'undefined' ? [] : JSON.parse(text);
    await writeJSON(destination,[...original,...extra]);
  } else await fs.copyFile(file,destination);
}
if (extraManifest.web_accessible_resources?.[0]?.resources.length) manifest.web_accessible_resources.push(...extraManifest.web_accessible_resources);
for (const resource of extraManifest.web_accessible_resources?.[0]?.resources ?? []) {
  const dest=path.join(out,resource); await fs.mkdir(path.dirname(dest),{recursive:true}); await fs.copyFile(path.join(custom,resource),dest);
}
manifest.declarative_net_request.rule_resources.push(...extraManifest.declarative_net_request.rule_resources);
// Do not silently enable the separate FilteringDev regional list on Korean-language browsers.
const stockDetails=await readJSON(path.join(out,'rulesets/ruleset-details.json'));
const stockKorean=stockDetails.find(item=>item.id==='kor-1');
if(stockKorean) { stockKorean.lang=''; stockKorean.enabled=false; }
await writeJSON(path.join(out,'rulesets/ruleset-details.json'),stockDetails);
manifest.name='클린웹'; manifest.short_name='클린웹'; manifest.description='웹페이지 광고와 남은 광고 공간을 정리합니다. 한국 사이트 필터와 직접 숨기기를 제공합니다.';
manifest.version=version; manifest.author='CleanWeb contributors; based on uBlock Origin Lite by Raymond Hill';
manifest.default_locale='ko'; manifest.action.default_popup='cleanweb/popup.html'; manifest.options_page='cleanweb/options.html';
// Keep upstream advanced dashboard available, but open our Korean settings on first use.
await fs.cp(resolve('src/cleanweb'),path.join(out,'cleanweb'),{recursive:true});
await writeIcons(path.join(out,'img'));
for (const localeFile of (await filesIn(path.join(out,'_locales'))).filter(a=>a.endsWith('messages.json'))) {
  const messages=await readJSON(localeFile);
  if(messages.extName) messages.extName.message='클린웹';
  if(messages.extShortDesc) messages.extShortDesc.message=manifest.description;
  await writeJSON(localeFile,messages);
}
await writeJSON(path.join(out,'manifest.json'),manifest);
await fs.copyFile(resolve('vendor/ubol/LICENSE'),resolve('LICENSE'));
await fs.copyFile(resolve('THIRD_PARTY_NOTICES.md'),path.join(out,'THIRD_PARTY_NOTICES.md'));
await fs.copyFile(resolve('PRIVACY.md'),path.join(out,'PRIVACY.md'));
const extraDetails=await readJSON(path.join(custom,'rulesets/ruleset-details.json'));
const conversionIssues=[];
for(const definition of definitions){
  const debug=await readJSON(path.join(custom,'rulesets/debug',`${definition.id}.all.json`));
  for(const item of debug) if(item._error) conversionIssues.push({filter:definition.id,errors:item._error});
}
const fileHashes={};
for(const file of await filesIn(out)) fileHashes[path.relative(out,file).replaceAll('\\','/')]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
await writeJSON(resolve('dist/build-report.json'),{version:manifest.version,upstream:lock,filters:extraDetails,conversionIssues,files:fileHashes});
await fs.copyFile(path.join(custom,'log.txt'),resolve('dist/filter-build.log'));
console.log(`Built ${out}; ${Object.keys(fileHashes).length} files; ${conversionIssues.length} conversion issues recorded.`);
