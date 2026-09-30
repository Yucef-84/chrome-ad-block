// SPDX-License-Identifier: GPL-3.0-or-later
import {message,status,changeMode,run} from './api.js';
import {normalizeHostname,assertNarrowSelector,ruleRows} from './model.js';
const $=selector=>document.querySelector(selector);
const namedFilters=new Map([
  ['ublock-filters',['광고 차단 · 기본 보호','광고와 추적 요청을 차단하고 사이트 호환성을 보완합니다.']],
  ['easylist',['일반 광고 · EasyList','글로벌 광고 네트워크와 배너 광고를 차단합니다.']],
  ['easyprivacy',['추적 방지 · EasyPrivacy','일반적인 추적 요청을 줄입니다.']],
  ['pgl',['광고 서버 · Peter Lowe','알려진 광고·추적 서버의 요청을 차단합니다.']],
  ['ublock-badware',['유해 사이트 · uBlock','알려진 유해 사이트 관련 요청을 차단합니다.']],
  ['urlhaus-full',['유해 주소 · URLhaus','악성 소프트웨어 관련 주소를 차단합니다.']],
  ['cleanweb-youslist',['한국 사이트 · YousList','국내 사이트의 광고 요청과 광고 요소를 정리합니다.']],
  ['cleanweb-sites',['클린웹 · 사이트 보완','디시인사이드의 날개·고정·하단 광고 영역을 정리합니다.']]
]);
let entries=[],undoEntries=null,allFilters=[];
function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
async function loadFilters(){
  const data=await message('getOptionsPageData');
  if(!data)throw new Error('기본 필터 상태를 읽지 못했습니다.');
  allFilters=data.enabledRulesets;
  const box=$('#filter-list');box.replaceChildren();
  for(const [id,[title,description]] of namedFilters){
    const label=node('label');const check=node('input');check.type='checkbox';check.checked=allFilters.includes(id);check.dataset.filter=id;
    const text=node('span');text.append(node('strong',title),node('span',description,'muted'));label.append(check,text);
    const row=node('div',undefined,'filter');row.append(label);box.append(row);
    check.addEventListener('change',()=>run(check,$('#filter-feedback'),async()=>{
      const desired=check.checked;
      box.querySelectorAll('input').forEach(input=>input.disabled=true);
      try{
        const fresh=await message('getEnabledRulesets');
        const next=desired?[...new Set([...fresh,id])]:fresh.filter(value=>value!==id);
        const before=allFilters.includes(id);
        const detail=data.rulesetDetails.find(value=>value.id===id);
        if(desired&&!before&&detail?.rules?.plain>await chrome.declarativeNetRequest.getAvailableStaticRuleCount())throw new Error('Chrome의 필터 용량이 부족합니다. 다른 필터를 끈 뒤 다시 시도해 주세요.');
        await message('applyRulesets',{enabledRulesets:next});
        const actual=await message('getEnabledRulesets');
        if(actual.includes(id)!==desired)throw new Error('필터를 적용하지 못했습니다. Chrome의 규칙 용량과 확장프로그램 상태를 확인해 주세요.');
        allFilters=actual;status($('#filter-feedback'),'필터를 적용했습니다. 열려 있는 페이지를 새로고침해 주세요.');
      }finally{await loadFilters();}
    }));
  }
  box.setAttribute('aria-busy','false');
}
async function loadGlobal(){const level=await message('getDefaultFilteringMode');if(!Number.isInteger(level))throw new Error('전체 차단 상태를 읽지 못했습니다.');$('#global-toggle').checked=level>0;$('#global-toggle').disabled=false;}
$('#global-toggle').addEventListener('change',event=>run(event.target,$('#global-feedback'),async()=>{
  try{
    if(!event.target.checked){
      const modes=await message('getFilteringModeDetails');
      await chrome.storage.local.set({'cleanweb.savedModes':modes});
      await message('setFilteringModeDetails',{modes:{none:['all-urls'],basic:[],optimal:[],complete:[]}});
    }else{
      const saved=await chrome.storage.local.get('cleanweb.savedModes');
      await message('setFilteringModeDetails',{modes:saved['cleanweb.savedModes']??{none:[],basic:[],optimal:['all-urls'],complete:[]}});
    }
    const actual=await message('getDefaultFilteringMode');
    if((actual>0)!==event.target.checked)throw new Error('전체 차단 상태를 변경하지 못했습니다.');
    status($('#global-feedback'),'적용했습니다. 열려 있는 페이지를 새로고침해 주세요.');
    await loadExceptions();
  }finally{await loadGlobal();}
}));
async function loadExceptions(){
  const modes=await message('getFilteringModeDetails');
  const hosts=modes.none.filter(host=>host!=='all-urls');
  const box=$('#exception-list');box.replaceChildren();
  if(modes.none.includes('all-urls')){box.append(node('p','전체 차단이 꺼져 있습니다. 다시 켜면 기존 사이트 예외를 복원합니다.','muted'));return;}
  if(!hosts.length){box.append(node('p','현재 사이트 예외가 없습니다.','muted'));return;}
  for(const hostname of hosts){const row=node('div',undefined,'rule');const button=node('button','차단 다시 켜기');row.append(node('span',hostname),button);box.append(row);button.addEventListener('click',()=>run(button,$('#exception-feedback'),async()=>{await changeMode(hostname,Math.max(await message('getDefaultFilteringMode'),2));await loadExceptions();status($('#exception-feedback'),'예외를 해제했습니다. 해당 페이지를 새로고침해 주세요.');}));}
}
function renderRules(){
  const rows=ruleRows(entries,$('#rule-search').value);const box=$('#rule-list');box.replaceChildren();
  if(!rows.length){box.append(node('div',entries.length?'검색 결과가 없습니다.':'직접 숨긴 항목이 없습니다. 웹페이지에서 「남은 광고 숨기기」를 사용해 보세요.','empty'));}
  for(const row of rows){
    const item=node('div',undefined,'rule');const label=node('div',undefined,'label');label.append(node('strong',row.hostname),node('code',row.label));const remove=node('button','삭제');remove.setAttribute('aria-label',`${row.hostname} ${row.label} 삭제`);item.append(label,remove);box.append(item);
    remove.addEventListener('click',()=>run(remove,$('#rule-feedback'),async()=>{await message('removeCustomFilters',{hostname:row.hostname,selectors:[row.selector]});undoEntries=[[row.hostname,[row.selector]]];$('#undo').hidden=false;await loadRules();status($('#rule-feedback'),'삭제했습니다. 해당 페이지를 새로고침하면 다시 나타납니다.');}));
  }
  $('#reset-site').disabled=entries.length===0;
}
async function loadRules(){entries=await message('getAllCustomFilters');if(!Array.isArray(entries))throw new Error('숨긴 항목을 읽지 못했습니다.');renderRules();}
$('#rule-search').addEventListener('input',renderRules);
$('#undo').addEventListener('click',()=>run($('#undo'),$('#rule-feedback'),async()=>{if(!undoEntries)return;await message('addManyCustomFilters',{entries:undoEntries});undoEntries=null;$('#undo').hidden=true;await loadRules();status($('#rule-feedback'),'삭제를 취소했습니다. 해당 페이지를 새로고침해 주세요.');}));
$('#add-rule').addEventListener('submit',event=>{
  event.preventDefault();run(event.submitter,$('#rule-feedback'),async()=>{
    const hostname=normalizeHostname($('#rule-site').value);
    const selector=assertNarrowSelector($('#rule-selector').value,value=>CSS.supports(`selector(${value})`));
    await message('addCustomFilters',{hostname,selectors:[selector]});
    $('#rule-selector').value='';$('#rule-search').value=hostname;await loadRules();
    status($('#rule-feedback'),'저장했습니다. 해당 페이지를 새로고침하면 적용됩니다.');
  });
});
$('#reset-site').addEventListener('click',()=>{
  const select=$('#reset-domain');select.replaceChildren();
  for(const [hostname] of entries){const option=node('option',hostname);option.value=hostname;select.append(option);}
  $('#reset-dialog').showModal();
});
$('#cancel-reset').addEventListener('click',()=>$('#reset-dialog').close());
$('#confirm-reset').addEventListener('click',()=>run($('#confirm-reset'),$('#rule-feedback'),async()=>{
  const hostname=$('#reset-domain').value;
  undoEntries=entries.filter(entry=>entry[0]===hostname).map(entry=>structuredClone(entry));
  await message('removeAllCustomFilters',{hostname});$('#reset-dialog').close();$('#undo').hidden=false;await loadRules();status($('#rule-feedback'),`${hostname}의 숨김을 초기화했습니다. 해당 페이지를 새로고침해 주세요.`);
}));
async function init(){
  $('#version').textContent=`v${chrome.runtime.getManifest().version}`;
  const site=new URLSearchParams(location.hash.split('?')[1]??'').get('site');
  if(site){$('#rule-search').value=site;$('#rule-site').value=site;}
  await Promise.all([loadFilters(),loadGlobal(),loadExceptions(),loadRules()]);
  if(location.hash.startsWith('#rules'))$('#rules').scrollIntoView();
}
init().catch(error=>status($('#filter-feedback'),error.message,true));
