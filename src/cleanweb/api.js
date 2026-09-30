// SPDX-License-Identifier: GPL-3.0-or-later
export async function message(what, details = {}) {
  let timer;
  try {
    return await Promise.race([
      chrome.runtime.sendMessage({what,...details}),
      new Promise((_,reject) => { timer=setTimeout(()=>reject(new Error('설정을 적용하지 못했습니다. 확장프로그램을 새로고침한 뒤 다시 시도해 주세요.')),15000); })
    ]);
  } finally { clearTimeout(timer); }
}
export function status(element,text,error=false) {
  element.textContent=text;
  element.dataset.error=String(error);
}
export async function changeMode(hostname,level) {
  const actual=await message('setFilteringMode',{hostname,level});
  if(actual!==level) throw new Error('상위 도메인의 예외 또는 사이트 접근 권한을 확인해 주세요.');
  return actual;
}
export async function run(button,feedback,action) {
  button.disabled=true;
  try { await action(); }
  catch(error) { status(feedback,error.message || '작업을 완료하지 못했습니다.',true); }
  finally { button.disabled=false; }
}
