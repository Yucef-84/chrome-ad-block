// SPDX-License-Identifier: GPL-3.0-or-later
import {message,status,changeMode,run} from './api.js';
import {siteFromURL,modeNames,filterIds} from './model.js';
const $=selector=>document.querySelector(selector);
const feedback=$('#feedback');
let tab,hostname,level=0,globalLevel=2;
const openSettings=section=>chrome.tabs.create({url:chrome.runtime.getURL(`cleanweb/options.html${section?`#${section}`:''}`)});
function render() {
  $('#site-toggle').checked=level>0;
  $('#site-toggle').disabled=!hostname || globalLevel===0;
  $('#pick').disabled=!hostname || level<2;
  $('#reload').disabled=!hostname;
  $('#mode').textContent=globalLevel===0?'전체 사이트의 광고 차단이 꺼져 있습니다. 설정에서 다시 켤 수 있습니다.':modeNames[level];
}
$('#settings').addEventListener('click',()=>openSettings(''));
$('#manage').addEventListener('click',()=>openSettings(`rules${hostname?`?site=${encodeURIComponent(hostname)}`:''}`));
$('#reload').addEventListener('click',()=>run($('#reload'),feedback,async()=>{await chrome.tabs.reload(tab.id);status(feedback,'페이지를 새로고침했습니다.');}));
$('#site-toggle').addEventListener('change',event=>run(event.target,feedback,async()=>{
  const enable=event.target.checked;
  const saved=await chrome.storage.local.get('cleanweb.siteLevels');
  const levels=saved['cleanweb.siteLevels']??{};
  if(!enable){levels[hostname]=level;await chrome.storage.local.set({'cleanweb.siteLevels':levels});}
  try{level=await changeMode(hostname,enable?(levels[hostname]??Math.max(globalLevel,2)):0);await chrome.tabs.reload(tab.id);status(feedback,enable?'광고 차단을 켜고 새로고침했습니다.':'이 사이트의 차단을 끄고 새로고침했습니다.');}
  finally{render();}
}));
$('#pick').addEventListener('click',()=>run($('#pick'),feedback,async()=>{
  const allowed=await chrome.permissions.contains({origins:[`${new URL(tab.url).origin}/*`]});
  if(!allowed) throw new Error('페이지 정리를 사용하려면 Chrome에서 이 사이트의 접근 권한을 허용해 주세요.');
  await chrome.scripting.executeScript({target:{tabId:tab.id},files:['/js/scripting/css-procedural-api.js','/js/scripting/tool-overlay.js','/js/scripting/picker.js']});
  window.close();
}));
async function init(){
  [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  hostname=siteFromURL(tab?.url);
  if(hostname){$('#hostname').textContent=hostname;const data=await message('popupPanelData',{hostname});if(!data)throw new Error('차단 엔진의 상태를 읽지 못했습니다.');level=data.level;globalLevel=await message('getDefaultFilteringMode');}
  else{$('#hostname').textContent='웹페이지에서 사용할 수 있어요';$('#mode').textContent='Chrome 설정, 새 탭, PDF 등에서는 요소 숨기기를 사용할 수 없습니다.';}
  const enabled=await message('getEnabledRulesets');
  if(!Array.isArray(enabled)) throw new Error('필터 상태를 확인하지 못했습니다.');
  const koreanCount=filterIds.filter(id=>enabled.includes(id)).length;
  $('#korean-status').textContent=koreanCount===filterIds.length?'한국 사이트 필터 사용 중':koreanCount?'한국 사이트 필터 일부 사용 중':'한국 사이트 필터 꺼짐';
  render();
  if(!hostname) $('#mode').textContent='Chrome 설정, 새 탭, PDF 등에서는 요소 숨기기를 사용할 수 없습니다.';
}
init().catch(error=>{status(feedback,error.message,true);$('#site-toggle').disabled=true;$('#pick').disabled=true;});
