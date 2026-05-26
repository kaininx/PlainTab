<p align="center">
  <img src="../icon/icon2048.png" alt="PlainTab Logo" width="92">
</p>

<h1 align="center">PlainTab</h1>

<p align="center">
  Chrome과 Edge를 위한 빠르고 조용한, 배경화면 중심의 새 탭 페이지입니다.
</p>

<p align="center">
  <a href="../README.md">English</a> · <a href="https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo">Chrome 웹 스토어</a> · <a href="https://plaintab.kaininx.workers.dev">라이브 데모</a> · <a href="technical/README_en.md">기술 노트</a> · <a href="changelog-i18n/ko.txt">변경 내역</a>
</p>

<p align="center">
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/version-3.2.3-111827?style=flat-square" alt="Version 3.2.3">
  <img src="https://img.shields.io/badge/Manifest-V3-4285f4?style=flat-square&logo=googlechrome" alt="Manifest V3">
  <img src="https://img.shields.io/badge/No_Build_Step-00a884?style=flat-square" alt="빌드 불필요">
  <img src="https://img.shields.io/badge/Vanilla-JS-f7df1e?style=flat-square&logo=javascript&logoColor=111827" alt="Vanilla JavaScript">
</p>

<div align="center">
  <img src="../imgs/chrome_01.png" width="45%" alt="PlainTab 스크린샷 1" />
  <img src="../imgs/chrome_02.png" width="45%" alt="PlainTab 스크린샷 2" />
  <br>
  <img src="../imgs/chrome_03.png" width="45%" alt="PlainTab 스크린샷 3" />
  <img src="../imgs/chrome_04.png" width="45%" alt="PlainTab 스크린샷 4" />
</div>

## PlainTab 소개

PlainTab은 Chrome과 Edge의 새 탭을 바꾸는 Manifest V3 확장 프로그램입니다. 기본 새 탭 대신 깔끔한 배경화면, 조정 가능한 검색창, 필요할 때만 꺼내 쓰는 바로가기를 제공합니다.

뉴스 피드, 홍보 카드, 계정 시스템, 위젯으로 가득한 대시보드 없이 차분한 시작 페이지를 원하는 사람을 위한 도구입니다. 새 탭을 열고, 배경화면을 보고, 검색하거나 URL을 입력한 뒤 하던 일을 계속하면 됩니다.

같은 페이지는 `index.html`을 직접 열어 독립 웹 페이지로도 실행할 수 있어, 프로젝트를 시험하고 읽고 수정하기 쉽습니다.

## 사용해 보기

### 설치

[Chrome 웹 스토어에서 PlainTab 설치](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)

### 라이브 데모

[plaintab.kaininx.workers.dev](https://plaintab.kaininx.workers.dev)

### 로컬 실행

```bash
git clone https://github.com/kaininx/PlainTab.git
```

확장 프로그램 모드:

1. `chrome://extensions`를 엽니다.
2. 개발자 모드를 켭니다.
3. "압축해제된 확장 프로그램을 로드합니다"를 선택합니다.
4. PlainTab 프로젝트 폴더를 선택합니다.

웹 모드:

브라우저에서 `index.html`을 직접 엽니다.

의존성, 패키지 매니저, 빌드 단계가 필요 없습니다.

## PlainTab을 선택하는 이유

### 먼저 보이는 배경화면

PlainTab은 새 탭을 열었을 때 빈 흰 화면 대신 바로 배경화면이 보이는 느낌을 중요하게 다룹니다. 가벼운 시작 미리보기를 `localStorage`에 저장하고, 전체 배경 로딩, 캐시, 테마 색상 계산은 첫 렌더링 이후로 미룹니다.

체감 속도는 단순한 성능 수치가 아니라 제품 경험의 일부입니다.

### 기본값은 조용하게

홈에는 배경화면, 검색, 몇 가지 제어만 남깁니다. 바로가기, 숨김 링크, 설정, 백업, 고급 배경 옵션은 모두 있지만 처음부터 화면을 채우지는 않습니다.

### 유연한 배경 소스

Bing 일일 배경화면, Wallhaven, 업로드 이미지, 로컬 폴더, RSS, 사용자 이미지 API, 비디오 배경을 사용할 수 있습니다. 매일 예쁜 이미지만 보고 싶을 때는 단순하게, 더 꾸미고 싶을 때는 유연하게 쓸 수 있습니다.

### 검색과 바로가기는 깔끔하게

검색창은 위치, 크기, 둥근 정도, 투명도, 표시 방식, 검색 기록, 검색 엔진 동작을 조정할 수 있습니다. 바로가기는 명령 팔레트에 있어 검색, 추가, 편집, 가져오기, 숨기기가 가능합니다.

## 기능

| 기능 | 설명 |
|------|------|
| 새 탭 교체 | 설치 후 브라우저의 새 탭을 대체합니다 |
| 독립 웹 모드 | 확장 패키징 없이 `index.html`로 실행됩니다 |
| 빠른 배경 시작 | 초기 미리보기로 흰 화면 깜빡임을 줄입니다 |
| Bing 배경 | Bing 일일 배경화면 지원 |
| Wallhaven 배경 | Wallhaven 탐색과 설정 지원 |
| 로컬 배경 | 업로드, 갤러리, 로컬 폴더 선택 지원 |
| RSS / API 배경 | 이미지 피드와 사용자 API 연결 |
| 비디오 배경 | 비디오를 배경으로 사용 |
| 검색창 | 위치, 크기, 스타일, 투명도, 표시 방식 조정 |
| 검색 기록 | 최근 검색 저장 또는 비활성화 |
| 명령 팔레트 | 홈을 어지럽히지 않고 바로가기 관리 |
| 숨김 공간 | 보이지 않지만 접근 가능한 링크 저장 |
| 설정 패널 | 인터페이스, 배경, 단축키, 데이터, 언어 관리 |
| 백업과 복원 | 가져오기, 내보내기, 암호화 백업 지원 |
| 다국어 UI | 16개 언어 팩 포함 |
| AI 협업 기록 | AI 지원 개발 과정의 문서와 메모 보관 |

<div align="center">
  <img src="../imgs/chrome_05.png" width="45%" alt="PlainTab 설정 스크린샷 1" />
  <img src="../imgs/chrome_06.png" width="45%" alt="PlainTab 설정 스크린샷 2" />
</div>

## 개발자용

PlainTab은 의도적으로 단순한 기술을 사용합니다.

- Vanilla JavaScript, CSS, 브라우저 API.
- `npm`, `package.json`, 프레임워크, 번들러 없음.
- 확장 모드와 웹 모드가 하나의 코드베이스를 공유합니다.
- Manifest V3 설정은 `manifest.json`에 있습니다.
- 런타임 스크립트는 `index.html`에서 직접 로드됩니다.

시작점으로 [기술 노트](technical/README_en.md), [릴리스 노트](RELEASE_NOTES.md), [메모리와 저장소 진단](ai-tasks/20260519-memory-storage-diagnostic-report.md), [AI agent 지침](../AGENTS.md)을 권합니다.

시작 경로, 두 레이어 배경 렌더링, IndexedDB의 큰 데이터, localStorage 키 호환성, Chrome 웹 스토어 권한 기대치는 특히 조심해야 합니다.

## 프로젝트 구조

```text
PlainTab/
├── index.html              # 새 탭과 웹 진입점
├── manifest.json           # Chrome / Edge Manifest
├── css/                    # 기능별 스타일
├── js/                     # 런타임 모듈
├── js/wallpaper/           # 배경, 소스, 테마 추출
├── wasm/                   # 테마 엔진과 빌드 스크립트
├── _locales/               # 확장 i18n 메시지
├── docs/                   # 문서와 릴리스 노트
├── icon/                   # 아이콘
└── imgs/                   # 스크린샷과 스토어 자산
```

## PlainTab이 피하는 것

PlainTab은 절제된 방향을 유지합니다. 뉴스 피드, 트렌드, 추천, 시작 광고, 스폰서 카드, 큰 날씨/달력/할 일 패널, 계정, 소셜 기능, 클라우드 콘텐츠 스트림, 홈을 채우는 수십 개의 바로가기, 자동 재생 홍보 콘텐츠는 현재 방향이 아닙니다.

Safari 버전은 지금 계획되어 있지 않습니다. 개인 프로젝트로서 배포와 유지 비용이 현실적이지 않기 때문입니다.

## AI 협업과 학습

PlainTab은 코드, 문서, 리팩터링, 릴리스 준비, 진단에서 AI 협업을 많이 활용해 개발되었습니다. 장난감 데모가 아니라 실제 UI, 지속 설정, 가져오기/내보내기, 배경 저장, 다국어, 확장과 웹 실행 경로를 갖춘 프로젝트입니다.

새 탭 확장 개발, 프레임워크 없는 작은 frontend 구성, AI 지원 개발 기록 방식, 제품의 절제가 기술 결정에 미치는 영향을 공부하기 좋습니다.

## 로드맵

더 안정적인 배경 소스, 더 부드러운 설정 흐름, 더 명확한 기술 문서, 더 완전한 AI 개발 기록, API와 유지 비용이 맞을 경우 Firefox 지원을 검토할 수 있습니다.

## 기여

브라우저 호환성, 배경 소스, 문서, 작은 UI 개선과 관련된 issue와 pull request를 환영합니다.

시작, 배경, 저장소, 검색, 설정, 명령 팔레트를 바꾸기 전에는 [AGENTS.md](../AGENTS.md)와 `.claude/rules/`의 규칙을 읽어 주세요. 작고 집중된 변경을 선호합니다.

## 언어

<details>
<summary>README 번역</summary>

- [English](../README.md)
- [简体中文](README_zh-CN.md)
- [繁體中文](README_zh-TW.md)
- [हिन्दी](README_hi.md)
- [Español](README_es.md)
- [العربية](README_ar.md)
- [Français](README_fr.md)
- [Português](README_pt_BR.md)
- [Русский](README_ru.md)
- [Deutsch](README_de.md)
- [日本語](README_ja.md)
- [Italiano](README_it.md)
- [Türkçe](README_tr.md)
- [Tiếng Việt](README_vi.md)
- 한국어
- [Polski](README_pl.md)

</details>

## 관련 링크

- [변경 내역](changelog-i18n/ko.txt)
- [자세한 릴리스 노트](RELEASE_NOTES.md)
- [기술 노트](technical/README_en.md)
- [메모리와 저장소 진단](ai-tasks/20260519-memory-storage-diagnostic-report.md)
- [라이브 데모](https://plaintab.kaininx.workers.dev)
- [Chrome 웹 스토어](https://chromewebstore.google.com/detail/plaintab-%C2%B7-minimal-new-ta/jhpfjcefcmooplmaimgdafohdlhacjdo)
- [GitHub](https://github.com/kaininx/PlainTab)

## 라이선스

PlainTab은 [MIT License](../LICENSE)로 공개되어 있습니다.

[Kaelri](https://github.com/kaininx)가 만들고 유지 관리합니다.
