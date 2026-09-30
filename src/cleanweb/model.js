// SPDX-License-Identifier: GPL-3.0-or-later
export const filterIds = ['cleanweb-youslist', 'cleanweb-sites'];
export const modeNames = ['꺼짐', '요청 차단만', '광고 차단 + 페이지 정리', '광고 차단 + 전체 요소 정리'];
export function siteFromURL(value) {
  try {
    const url = new URL(value);
    return /^https?:$/.test(url.protocol) && url.hostname ? url.hostname : null;
  } catch { return null; }
}
export function normalizeHostname(value) {
  const text = value.trim().toLowerCase();
  if (!text || /[\s/@?#:*\\]/.test(text)) throw new Error('주소 대신 도메인만 입력해 주세요. 예: gall.dcinside.com');
  const host = new URL(`https://${text}`).hostname;
  if (host.length>253 || !host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error('올바른 도메인을 입력해 주세요.');
  return host;
}
export function assertNarrowSelector(selector, isValid) {
  const value = selector.trim();
  if (!value || value.length > 2048 || !isValid(value)) throw new Error('올바른 CSS 선택자를 입력해 주세요.');
  if (value.split(',').some(part => /^(?:\*|html|body|:root)(?:\s*!important)?$/i.test(part.trim()))) throw new Error('페이지 전체를 숨기는 선택자는 저장할 수 없습니다.');
  return value;
}
export function describeSelector(selector) {
  if (!selector.startsWith('{')) return selector;
  try { return JSON.parse(selector).raw ?? selector; } catch { return selector; }
}
export function ruleRows(entries, search = '') {
  const query = search.trim().toLowerCase();
  return entries.flatMap(([hostname, selectors]) => selectors.map(selector => ({hostname,selector,label:describeSelector(selector)})))
    .filter(row => `${row.hostname} ${row.label}`.toLowerCase().includes(query));
}
