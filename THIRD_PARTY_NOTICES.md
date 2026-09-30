# 클린웹 오픈소스 고지

클린웹은 uBlock Origin Lite의 수정본이며 원본의 공식 배포판이 아닙니다.
프로젝트 루트의 LICENSE는 GNU GPL version 3 원문입니다. 클린웹 코드와 uBlock 코드의 파일별 고지는 GPL version 3 또는 이후 버전을 허용합니다.

## 엔진과 배포 소스

- uBlock Origin Lite / uBlock Origin: Raymond Hill 및 기여자. GPL-3.0-or-later.
- 출처: https://github.com/uBlockOrigin/uBOL-home 및 https://github.com/gorhill/uBlock
- 소스 커밋은 upstream.lock.json에 고정되어 있습니다.
- 변경: 한국어 팝업·설정 추가, 별도 제품명·아이콘, YousList 및 사이트 보완 필터 추가.
- 원본 파일의 저작권 고지와 라이선스 파일을 유지합니다.
- 포함 라이브러리(CodeMirror, csstree, s14e-serializer, 폰트 등)의 개별 라이선스는 vendor/ubol 및 패키지의 lib·css 경로에서 확인할 수 있습니다.

## 기본 필터

- EasyList / EasyPrivacy: EasyList 기여자. GPL version 3 이상 또는 CC BY-SA 3.0 이상. https://easylist.to/pages/licence.html
- uBlock 필터: uBlock Origin 기여자. https://github.com/uBlockOrigin/uAssets
- Peter Lowe 광고·추적 서버 목록: Peter Lowe. https://pgl.yoyo.org/as/ 및 원본 메타데이터를 확인하세요.
- URLhaus 등 추가 목록: 원본 프로젝트의 필터 정의와 개별 목록 조건을 유지합니다. vendor/ubol/uBlock/platform/mv3/rulesets.json에 출처가 있습니다.
- 원본에 포함된 kor-1 한국 필터는 FilteringDev/filterslists-KO 경로이며 커뮤니티 List-KR과 동일한 구독 경로가 아닙니다. 기본 활성화에는 YousList를 사용합니다.

## 한국 필터 및 로컬 보완

- YousList: yous 및 기여자. CC BY 4.0. https://github.com/yous/YousList
- 라이선스: https://creativecommons.org/licenses/by/4.0/
- 변경 사항: 고정 버전의 원문을 uBlock 빌드 도구로 DNR 및 페이지 정리 규칙으로 변환합니다. 변환 불가 규칙은 dist/build-report.json에 기록합니다.
- 로컬 사이트 보완 필터: CleanWeb contributors. GPL-3.0-or-later. 디시인사이드 공개 HTML에서 식별한 광고 컨테이너에 한정합니다.

배포할 때 확장프로그램 ZIP과 함께 동일 버전의 전체 소스 ZIP 또는 완전한 대응 소스 접근 경로를 제공하세요. 이 작업 폴더의 빌드 스크립트와 고정된 vendor 원본이 대응 소스에 포함됩니다. GPL 파일만 제공하는 것으로 소스 제공을 대체하지 않습니다.
