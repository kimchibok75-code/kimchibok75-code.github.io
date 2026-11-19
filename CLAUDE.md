# 김치복 홈페이지 — Claude 작업 메모

> 다른 컴퓨터(사무실 등)에서 이어서 작업할 때 Claude가 가장 먼저 읽는 파일입니다.
> 마지막 정리: 2026-11-16 (치복 타운 4단계 + 할 이유·아이콘·보안까지)

## 꼭 지킬 것
- **설명은 항상 쉬운 한국어로.** 영어로 설명하지 않기. 사용자가 해야 할 일은 "1. 어디를 → 2. 무엇을 누르기"처럼 구체적인 순서로 적기.
- 비밀 키(OneSignal REST 키, Cloudflare 토큰 등)는 **절대 채팅에 붙여 넣게 하지 않기**. 필요하면 사용자가 터미널의 숨김 입력(`gh secret set`, `npx wrangler secret put`)으로 직접 넣게 안내.
- 로그인, 인증 코드 입력은 사용자가 직접 함.

## 사이트 개요
- 유튜버 **김치복**(림월드) 공식 홈페이지. 정적 사이트, GitHub Pages로 배포됨.
- 주소: **https://kimchibok.com** (2026-11-19 연결. 예전 https://kimchibok75-code.github.io 는 자동으로 새 주소로 넘어감)
  - 도메인은 후이즈(whois.co.kr)에서 삼. DNS는 후이즈 → 네임서버 고급설정 → A 레코드 4개(185.199.108~111.153) + CNAME `www` → kimchibok75-code.github.io
  - 깃허브 Pages 설정의 사용자 도메인 = kimchibok.com (`gh api repos/…/pages`의 `cname`). 배포가 Actions 방식이라 CNAME 파일은 없음
  - 주소를 바꿀 때 같이 바꿀 곳: `config/site.json`의 `siteUrl`, `worker/wrangler.toml`의 `SITE_URL`, `game-worker/src/index.js`의 `ORIGINS`, `windows-app/Launcher.cs`의 `URL`(다시 만들기), OneSignal 대시보드의 Site URL
  - `build.bat`은 한글 폴더라 cmd에서 안 돌 때가 있음 → PowerShell에서 csc.exe를 직접 실행
- 저장소: https://github.com/kimchibok75-code/kimchibok75-code.github.io
- 페이지: `index.html`(홈), `schedule.html`(방송 일정 달력), `mods.html`(모드 추천), `weekly.html`(주간 모드 순위), `community.html`(팬 카페·디스코드·카페 새 글), `game.html`(치복 타운 — 아직 숨김)
- 새 페이지를 만들면 `.github/workflows/update.yml`의 `sed -i "s/__BUILD__/..."` 줄에 파일 이름을 꼭 추가
- 모든 페이지가 `assets/js/app.js` 하나를 씀. `body[data-page]` 값으로 페이지마다 불러올 데이터가 정해짐.
- 공통 부분(SVG 아이콘, 푸터, 알림 동의 창, 모바일 하단 탭바)은 `injectShell()`이 넣어 줌.
- 설정은 `config/site.json`에 있음: 채널, 치지직, 카페, 디스코드, 모드 시트, 창작마당, OneSignal.

## 자동 갱신
- `.github/workflows/update.yml` (GitHub Actions)이 주기적으로 `node scripts/update.mjs <작업>`을 돌림. `data/*.json`을 커밋한 뒤 Pages에 배포함.
  - 작업 종류: `live`, `youtube`, `cafe`, `workshop`, `mods`
  - 주의: GitHub의 예약 실행은 몇 시간씩 건너뛰기도 함. 그래서 생방송 감지는 아래 Worker가 맡음.
- **생방송 감지: Cloudflare Worker `kimchibok-live`** (`worker/` 폴더)
  - 주소: https://kimchibok-live.kimchibok.workers.dev/live
  - 매분 치지직 API를 확인함. 방송이 켜지는 순간 OneSignal `live` 태그 구독자에게 푸시를 보냄.
  - 상태는 KV `STATE`에 저장함.
  - 사이트는 `config.chzzk.liveApi`를 60초마다 읽음.
  - `liveApi`가 설정돼 있으면 update.mjs는 푸시를 보내지 않음(중복 방지).
  - 배포 방법: `worker` 폴더에서 `npx --yes wrangler@4 deploy`. 끝에 종료 코드 -1073740791이 떠도 배포는 성공한 것.
- 네이버 카페 새 글: 로그인 없이 쓰는 공개 API. 카페 id는 31260801.
- 유튜브 커뮤니티 글 (2026-11-18): `update.mjs youtube`의 `channelPosts`가 채널 `/posts` 페이지 안의 `ytInitialData`를 읽어 `youtube.json` 채널마다 `posts`에 넣음 (최근 12개). 날짜는 "3주 전"뿐이라 처음 본 때 대략 시각으로 바꿔 저장. 홈 영상 밑 `#posts` 섹션(`renderPosts`), 글이 있는 채널만 탭으로 보임
  - 공식 API가 아니라 유튜브가 페이지를 바꾸면 끊길 수 있음 (그럴 땐 예전 글을 그대로 둠)
- 모드 추천 데이터: **`data/mods.json` 자체가 원본** (2026-11-16 구글 시트 연동 끊음. 원본 시트는 찾지 말 것)
  - 추가·수정·삭제는 `add-mod.mjs`로 (아래). 소분류 옮기기 같은 건 mods.json의 `section`을 직접 고침
  - 자동 갱신(`update.mjs mods`)은 스팀 정보(썸네일·구독자·태그)만 새로 붙임
  - 목록 순서: 대분류 → 소분류(그 소분류에서 가장 작은 `order`) → `order`
  - **사이트에서 드래그로 순서 편집** (2026-11-16): 김치복 관리자 계정(치복 타운과 같은 계정)만
    - 들어가는 곳: 모드 추천 맨 아래 오른쪽의 아주 희미한 "✏️ 추천 순서 편집" (누구에게나 보임, 사용자 요청). 관리자면 바로 편집, 아니면 로그인 창. `mods.html?edit`도 로그인 창
    - 화면: `assets/js/mod-edit.js` (SortableJS를 cdnjs에서 편집할 때만 불러옴, `forceFallback`). 모드 순서 + 같은 대분류 안의 다른 소분류로 옮기기 + 소분류 묶음 순서
    - 저장: 게임 서버 `POST /api/admin/mods-order {cat, groups: [[소분류, [id…]], …]}` → D1 `mod_order` 표 (대분류마다 그 값 그대로. 예전 형식 `[id…]`도 읽을 수 있음). **열쇠·깃허브 설정 필요 없음** (사용자가 어렵다고 해서 깃허브 커밋 방식은 버림)
    - 읽기: 누구나 `GET /api/mods-order` → `{cats: {대분류: [id…]}}`. 사이트(`app.js`의 `applyModOrder`)가 바로 적용 → 다른 사람에게도 바로 보임. 목록에 없는 모드(새로 추가한 것)는 그 대분류 맨 뒤
    - 매일 자동 갱신(`update.mjs mods`)이 같은 순서를 `data/mods.json`의 `order`에도 옮겨 적음
    - **삭제**: 편집 중 줄마다 ✕ → 흐려지고 "되살리기" → 저장할 때 확인 창 뒤 지움. 서버 저장 값은 `{g: [[소분류,[id…]]…], del: {id: 지운 시각}}`. 사이트는 바로 숨기고, 자동 갱신이 mods.json에서도 뺌. 지운 시각보다 나중에 add-mod로 다시 넣은 모드(`addedAt`이 더 큼)는 다시 보임
    - 드래그 중 떠다니는 칸은 `fallbackOnBody: true` (흐림 효과 상자 안에 붙이면 위치가 어긋났음)
    - add-mod로 새 모드를 넣으면 사이트에서는 그 대분류 맨 뒤에 보임 (김치복이 끌어서 옮기면 됨)
    - `GET /api/whoami` → `{nick, admin}` (게임 정산 없이 확인만)
    - 내 컴퓨터 시험: 위 "내 컴퓨터에서 서버까지 시험하기"처럼 wrangler dev → `mods.html?api=http://localhost:8787&edit`

## 모드 URL을 받으면 (사용자가 스팀 창작마당 링크만 줌)
묻지 말고 알아서 처리:
1. `node scripts/add-mod.mjs --info "<url>"` 실행 → 제목, 태그, 설명을 확인
2. 한국어 한 줄 설명을 직접 쓰고, 대분류와 소분류를 정함
   - 대분류: 김치복제작 / 필수 / 렉개선 / 그래픽 / 중세 / 모음집 / 맵파일 / 추천
3. `node scripts/add-mod.mjs "<url>" "<설명>" <대분류> "<소분류>"` 실행
4. 커밋 → `git pull -q --rebase --autostash` → `git push`. 배포 확인은 `gh run watch`
- 삭제: `node scripts/add-mod.mjs --remove "<url>"` → 들어 있는 **모든 대분류에서** 빠짐 (사용자 결정: 지우는 데는 이유가 있으니 모두 빼기)
  - 사용자가 콕 집어 "○○에서만 빼"라고 할 때만 뒤에 대분류를 붙임: `--remove "<url>" 필수`
- 같은 모드를 다른 대분류에도 넣으려면 대분류를 지정해서 한 번 더 추가 (대분류마다 항목 하나)
- 버전 표시는 1.6과 1.7만 남김 (`app.js`의 `VERSIONS`). 모음집·맵파일은 해당하는 버전 칸만 보임

## 새 컴퓨터(사무실 등)에서 처음 시작할 때
1. Git과 Node.js가 있는지 확인. 없으면 설치 안내 (git-scm.com, nodejs.org)
2. 저장소 받기:
   `git clone https://github.com/kimchibok75-code/kimchibok75-code.github.io.git "$HOME\Desktop\김치복 홈페이지"`
3. 깃허브에 처음 올릴 때 로그인 창이 뜨면 사용자가 직접 로그인
   - 배포 확인용 `gh`를 쓰려면: GitHub CLI 설치 → `gh auth login`
4. Cloudflare Worker(`worker/`)를 다시 배포해야 할 때만:
   - `worker` 폴더에서 `npx --yes wrangler@4 login` → 브라우저가 열리면 사용자가 직접 허용
   - 그다음 `npx --yes wrangler@4 deploy`
   - 비밀 키(`ONESIGNAL_REST_API_KEY`)는 이미 Cloudflare에 저장돼 있으므로 다시 넣을 필요 없음
5. 집 컴퓨터의 Claude 메모리(한국어 설명, 모드 URL 처리법)는 이 파일에 다 옮겨 두었으니 따로 챙길 것 없음

## 작업 환경 메모 (Windows)
- git과 gh가 PATH에 없으면 먼저 실행:
  `$env:Path = "C:\Program Files\Git\cmd;C:\Program Files\GitHub CLI;" + $env:Path`
- 미리보기 서버: `node scripts/serve.mjs`
- `wrangler deploy`가 시작 줄(⛅️ wrangler …)만 찍고 아무것도 안 하고 끝나면: 예전에 켠 `wrangler dev`(node·workerd·esbuild)가 남아 있는 것. 그 프로세스들을 끄고 다시 배포 (`serve.mjs`는 끄지 않기)
- push하기 전에 항상 `git pull --rebase` 하기. 자동 갱신 봇이 data 파일을 자주 커밋함.
  - `data/mods.json`이 충돌하면: 이제 이 파일이 원본이라 봇 쪽으로 덮으면 내 수정이 사라짐. 봇 쪽(`--ours`, rebase 중엔 원격 쪽)을 받은 뒤 내 add-mod 명령을 다시 실행 → add → rebase 계속.
- PowerShell에서 `node -e`에 복잡한 정규식을 넣으면 깨짐. 이럴 땐 임시 .mjs 파일을 만들어 실행.

## 지금까지 한 일 (2026-11-14 기준, 모두 배포 완료)
- 생방송 "방송 중" 표시와 푸시를 Cloudflare Worker로 옮김 (매분 확인)
- 홈 화면
  - 프로필 박스는 없앰. 맨 위는 바로가기 카드 4칸×2줄(모바일 2칸)
    - 윗줄: 김치복·풀치복·음치복·치지직 / 아랫줄: 팬 카페·디스코드·모드 추천·주간 모드 순위
  - 바로가기 아래에 생방송 상황판을 둠. 방송 중이면 경과 시간, 꺼져 있으면 다음 방송까지 카운트다운이 나옴.
  - 그 아래에 오늘 포함 7일 방송 일정 타일
  - "림월드 모드" 섹션은 삭제함
- 방송 일정을 달력 형식의 별도 페이지(`schedule.html`)로 분리함
- 모드 추천(옛 이름 "모드 저장소")
  - 리스트형으로 바꿈
  - 필터: 대분류 버튼 + 소분류 칩
  - 버전 필터: 1.6 / 1.7
  - "🥬 김치복 제작" 분류가 맨 앞 (15개)
- 주간 모드 순위: 박스형 카드. PC는 한 줄에 4칸, 모바일은 2칸. 설명은 3줄까지 보임.
- 커뮤니티를 별도 페이지(`community.html`)로 분리함: 카페·디스코드 카드 + 카페 새 글 20개
- 모바일 스크롤 끊김 최적화: 휴대폰에서는 배경 흐림 효과(blur, backdrop-filter)와 움직이는 배경을 끔 (style.css 맨 아래)
- 사이트 전체 글자 크기를 키움 (작은 글씨 약 10%, 큰 제목 약 5%). 모드 추천 분류 버튼은 모바일에서 2칸
- 휴대폰(600px 이하)에서는 글자를 …으로 자르지 않고 줄바꿈해서 전부 보여 줌 (style.css 맨 아래)
- 주간 순위 한국어 요약은 문장 중간에서 끊지 않고 완성된 문장 단위로 자름 (`translate.mjs`의 `oneLine`, 번역 원문은 캐시에 `full`로 저장)
- 모바일 하단 탭바 메뉴 추가. 카페 이미지가 화면 밖으로 넘치던 문제 수정.
- 디스코드 설명: "채팅 위주 소통을 원하면 디스코드로"

## 웹 게임 「치복 타운」 (진행 중)
- 기획서: `plan/웹게임-기획서.md` (v0.8)
  - **팬 마을 + 성장**: 레벨·경험치·골드, 능력치(힘·민첩·지력·운), 장비 5칸(무기·모자·갑옷·신발·장신구) + 등급·강화, 스킨(겉모습만), 사냥터 자동 사냥(4곳 + 보스)
  - 소통은 최소한: **마을 전체 채팅 하나**(2026-11-16 근처 채팅 없앰) + 이모트만. **귓속말·친구·선물·거래 없음** (친목 우려). 집은 언제나 모두 공개
  - 건물은 누르면 바로 이용, 이동은 좌표로 자유롭게(4단계부터), 이름표는 머리 위, PC 전체화면 버튼
  - 사용자가 거절한 방향: 나이 먹는 인생 게임(v0.1), 역할극(v0.2)
  - **결정 필요**: 기획서 4-4 "화면을 닫아도 사냥(최대 8시간, 효율 70%)"
- 목업: `plan/mockup.html` (가짜 데이터, 서버 없음). 비공개 링크: https://claude.ai/artifact/5zN1k7xe4ZoBKpHpk1rTuv
  - 고친 뒤 같은 링크로 다시 올리려면 Artifact 도구에 이 파일 경로로 publish (다른 대화에서는 `url`로 이 주소를 넘김)
- `plan/` 폴더는 배포할 때 지워서 사이트에 안 올라감 (update.yml의 `rm -rf plan`)
- 채팅 금칙어: `plan/chat-banwords.txt` (김치복님이 준 696개 → 가림 514 / 차단 153 / 문맥 29). 검사 방식은 기획서 8-1
  - "보지 마세요"처럼 평범한 말은 문맥 단어의 앞뒤 글자를 보고 통과시킴. 허용 단어 목록(ALLOW)은 `game-worker/src/filter.js`
  - 목록을 바꾸면 `game-worker/src/banwords.js`도 다시 만들어야 함

### 1단계 (계정과 저장) — 2026-11-15 배포, 테스트 통과
- 게임 화면: `game.html` (https://kimchibok75-code.github.io/game.html). **메뉴에 링크 안 걸음**, 검색 제외(noindex). 첫 공개는 3단계
  - 목업을 복사해서 만듦. 이제부터는 game.html이 진짜, 목업은 기획용
  - 1단계에서 되는 것: 가입(복구 코드) · 로그인(30일 유지) · 비밀번호 찾기 · 비밀번호/복구 코드 바꾸기 · 캐릭터 만들기 · 마을 걷기 · **위치·겉모습·소개 서버 저장** · 능력치 찍기(포인트가 있을 때)
  - (4단계에서 잠금 `LATER`는 비움. 방송국은 삭제)
  - 전광판: 방송 중이 아니면 "다음 방송까지 00:00:00" (`data/schedule.json`을 읽어 `nextLiveAt`로 계산, 홈페이지 일정과 같음)
  - 전광판은 실제 방송 상태(kimchibok-live의 `/live`)를 1분마다 읽음
- 공용 규칙: `assets/js/game-rules.js` — 숫자·계산식. 화면(game.html)과 서버가 **같은 파일**을 씀
- 서버: Cloudflare Worker **`kimchibok-game`** (`game-worker/` 폴더)
  - 주소: https://kimchibok-game.kimchibok.workers.dev (`/api/signup`, `/api/login`, `/api/recover`, `/api/me`, `/api/character`, `/api/move`, `/api/stats`, `/api/password`, `/api/recovery-code`, `/api/logout`)
  - DB: D1 **`kimchibok-game`** (id 40dd7d72-2e27-4412-91d1-1ba075296663). 표 정의는 `game-worker/migrations/`
  - 비밀번호는 PBKDF2(3만 번) 해시, 로그인 토큰도 해시로만 저장. 5번 틀리면 10분 잠금. 같은 곳에서 가입은 1시간 3개까지
  - 배포: `game-worker` 폴더에서 `npx --yes wrangler@4 deploy`
  - 표를 바꿀 때: `migrations/0002_….sql` 새로 만들고 `npx --yes wrangler@4 d1 migrations apply kimchibok-game --remote`
  - 테스트 계정은 닉네임 `zz`로 시작하게 만들고 끝나면 지움 (`d1 execute … --command "DELETE …"`)
- 관리자 임시 비밀번호 발급 화면은 아직 없음 (3단계 관리자 화면에서 만들 예정)

### 2단계 (성장) — 2026-11-15 배포, 테스트 통과
- 결정: 화면을 닫아도 **최대 8시간까지 계속 사냥, 효율 70%** (기획서 4-4)
- 열린 곳: 사냥터 4곳(자동 사냥), 카페(물약·쉬기), ~~무기점·방어구점~~(→ 아래 "뽑기 체계"에서 가챠센터로 바뀜), 대장간(강화), 스킨샵. 장비 끼기/빼기
- 매일 첫 접속 보너스(레벨 × 20 골드), 레벨 10마다 칭호. 최고 레벨은 55 (`LV_CAP`)
- 사냥 계산: `game-worker/src/hunt.js`. 흐른 시간만큼 몬스터를 한 마리씩 잡는 걸 서버가 흉내 냄. 화면 전투는 보여 주기용
  - 마지막 정산 뒤 90초까지는 100%, 그 뒤는 70%(최대 8시간). 한 마리 잡다 만 시간은 `debt`로 넘겨서 자주 불러도 안 빨라짐
  - 보스는 이길 수 있을 때만 싸움. 가방 40칸이 차면 주운 장비는 자동 판매. 쓰러지면 그 사냥에서 번 골드 10% 잃고 마을로
- 서버 저장 방식: `play()`가 캐릭터를 읽고 → 사냥 정산 → 바꾸고 → `ver` 번호가 그대로일 때만 저장 (동시 요청 막기)
  - 기능 목록은 `index.js`의 `GAME` (`/api/hunt/start|sync|leave`, `/api/pots`, `/api/rest`, `/api/pot-at`, `/api/shop/buy`, `/api/sell`, `/api/equip`, `/api/unequip`, `/api/enhance`, `/api/reset-stats`, `/api/skin`, `/api/stats`)
- 밸런스: 경험치 공식을 `50 × 레벨²`로 바꿈, 사냥 중 체력 회복 2%/초 추가. 55레벨까지 힘 위주 약 19시간 (시험 계산)
  - 밸런스 시험 계산을 다시 하려면: 새 캐릭터로 `startHunt` → 30초마다 `settle`을 부르는 짧은 node 스크립트를 만들어 돌림
  - 지력 위주는 체력이 낮아 자주 쓰러짐 → 3단계 이후 밸런스 볼 때 확인

### 2단계 추가 (2026-11-15)
- 능력치: 마력(지력, 지팡이는 마력으로 공격), 물리 방어(힘), 마법 방어(지력), 이동 속도(민첩). 🔮 몬스터는 마법 공격. 운 → 골드 +1%, 강화 성공 +0.05%p
- 능력치 초기화는 대장간이 아니라 캐릭터창 → 능력치 버튼
- 강화는 한 번에 1단계 + 망치질 애니메이션 (`doEnhance`)
- 낚시터(강가 선착장): 순위 3종, 물고기 23종·5등급·길이, 바로 판매, 10초에 한 번. 서버: `/api/fish/rank`, D1 표 `fishing`. (미니게임은 2026-11-16에 없앰 → 아래 "낚시 다시 만들기")
- 카페 알바: 1분 뒤 골드 (`/api/job/start|finish|quit`)
- 캐릭터 눈 위치를 조금 아래로 (`drawChar`의 `ey`)
- 밸런스(시험 계산, 55레벨까지): 힘 약 19시간, 지력 약 16시간, 민첩 약 27시간 (민첩은 자주 쓰러짐 → 나중에 확인)

### 그림·편의 기능 (2026-11-15)
- 그림 방식: **안쪽 선 없이 색 면 + 바깥 테두리만 두꺼운 검은 선**. `inkDraw(ctx, parts)`가 (1) 모든 조각을 검게 두껍게 그려 실루엣 → (2) 색 면을 선 없이 칠함. 조각은 `{ path, c, flat, after }` (`flat`이면 테두리 없음)
- 장비가 마을에서도 보임: 무기(손잡이를 손이 쥠, `weaponParts`), 모자(머리 스킨이 없을 때, `helmParts`), 갑옷·신발·반지. 색은 단계별 `METAL/ARMOR/SHOE`
- 가게·가방의 장비 아이콘도 같은 그림 (`itemImg`, `gIcon`)
- 눈 모양 스킨 `EYE_SKINS` (game-rules.js). 가진 것은 `hats`에 `eye:star`처럼 저장. 서버 `/api/skin`·`saveLook`가 확인. 이모트 눈은 `emoEyes`로 잠깐만
- 🏘️ 마을 바로가기(설정 밑, `PLACES` → 바로 이동), 🚶 자유 행동(`roamTick`, 켜 두면 알아서 돌아다니고 근처 사람에게 인사, 바닥을 누르면 15초 쉼)
- 알바 중이면 머리 위 말풍선 계속. 확대 상태는 PC·휴대폰 따로 저장 (`cbt-zoom-pc`, `cbt-zoom-m`)
- 사냥터 입구는 **포탈**(`PORTAL`). 포탈을 눌러야만 사냥터 고르기. 분수는 타원 범위로 먼저 판정
- 사냥 현황판: 한 마리 잡을 때마다 숫자 갱신(`HT.loc`, 30초 정산 때 서버 값으로 맞춤), ▾ 접기 버튼
- 화면에서 체력 0 → 바로 마을 (`/api/hunt/leave {died:true}`, 손해는 서버가 똑같이 10%)
- 휴대폰: 아래 창의 캐릭터 그림 없앰, 채팅 입력줄이 좁은 화면에서 넘치던 것 고침 (`.chat`에 `grid-template-columns: minmax(0,1fr)`)

### 전투 손맛 · 활 · 이동 (2026-11-15)
- 무기: 검(힘, 근접. 단검·망치는 뽑기 개편 때 없앰) / 지팡이(지력, 원거리 마법) / **활(민첩, 원거리, 화살 없음)**. `WTYPES`의 `st`(능력치), `far`(원거리), `k`(능력치 1당 공격력)
- 밸런스 숫자는 `game-rules.js` 맨 위(`MELEE_K` 등). 서버 `hunt.js`는 원거리면 몬스터가 다가오는 `FAR.lead`초 동안 먼저 때림
- 밸런스 시험: 빌드 5개 × 6번 돌려 55레벨까지 16~17.5시간으로 맞춤 (기획서 3-4)
- 화면 효과(game.html): 맞는 순간 멈칫(`HT.freeze`), 화면 흔들림(`HT.shake`), 넉백·납작해짐, 불꽃(`fxBurst`), 고리, 번쩍 별, 베기 자국, 마법 구슬·화살(`HT.shots`), 숫자 튀어 오르기, 맞으면 화면 가장자리 빨갛게. 캐릭터는 가는 방향을 봄(`dir`)
- 이동: PC는 화살표/WASD, 휴대폰은 화면을 끌면 그 방향으로 계속 걸음 (`STEER`, `steerTick`). 몇 칸마다 한 번만 서버에 알림
- 창을 연 터치가 창 안 버튼까지 누르던 문제: 창이 열린 뒤 0.4초는 누름 무시 (`modalAt`)
- 모든 창 오른쪽 위에 큰 ✕ 버튼(`XBTN`, `openModal`이 자동으로 넣음). 밑의 '닫기·취소' 글자 버튼(`.close`)은 숨김
- 대장간 강화 성공 시 장비 수치·내 전투 수치 전후 비교 (`enhStats`, `charStats`, `diffList`)
- 휴대폰 키보드가 뜰 때 화면 번쩍임: `resize()`가 크기가 바뀔 때만 캔버스를 다시 만들고 바로 그림 + viewport `interactive-widget=resizes-visual`
- 화면 확인 팁: 브라우저 창이 숨겨져 있으면 1초에 1번만 그려짐 → 임시로 `window.__dbg.step()` 같은 걸 넣어 직접 돌려 보고, 끝나면 꼭 지우기

### 벤치 · 헤어 (2026-11-15)
- 벤치: 누르면 앞 칸까지 걸어가서 앉음(`sitDown`, `standUp`, `benchFront`). 걷기·화살표·바로가기·사냥 가면 일어남. 기능은 앉기만
  - 실시간: `{t:'sit', b}` (b = 벤치 번호, -1 = 일어남). 서버(town.js)는 누가 앉아 있으면 거절, `go`·`hunt`가 오면 자동으로 일어난 것으로 침
  - 벤치는 1칸(막힌 칸)이지만 그림·누르는 범위는 양옆으로 10px씩 넓음
- 헤어: `HAIRS`(민머리 + 6종: 짧은·옆머리 대머리·바가지·삐죽·긴·묶은), `HAIR_COLORS` 8색 (game-rules.js). 무료, 캐릭터 만들기와 캐릭터창 → 스킨에서 고름
  - **2026-11-18 사용자 그림 8종 추가** (`h1`~`h8`, 예전 6종도 그대로 고를 수 있음 — 사용자 요청): 템플릿 `char/hair-front_guide_머리N.png`(흰색) → town-art.py 11번 → `hair-N.webp` + meta `hair` → game.html `HAIR_POS`, `hairTint`(흰 그림에 머리 색을 곱함, 색마다 캐시)
  - DB `characters.hair`, `hair_c` (`migrations/0006_hair.sql`). 그림은 `hairParts` (뒷머리는 얼굴 뒤, 앞머리는 얼굴 위)

### 3단계 (같이 놀기) — 2026-11-15 배포, 테스트 통과
- 실시간 방: Durable Object **`Town`** (`game-worker/src/town.js`). 채널 `town-1`~`town-3`, 채널마다 50명. 꽉 차면 다음 채널로
  - 주소: `wss://kimchibok-game.kimchibok.workers.dev/ws?ch=1`. 접속 뒤 첫 메시지 `{t:'auth', token}`으로 로그인 확인 (토큰을 주소에 안 넣음)
  - 위치는 **걷기 시작할 때 한 번만** `{t:'go', x, y, tx, ty}` 보냄. 길은 각 화면이 같은 `findPath`로 계산 → 메시지가 아주 적음 (무료 한도 아끼기)
  - 그 밖: `say`(채팅), `emo`(이모트), `look`(겉모습 바뀜 → 서버가 D1에서 다시 읽음), `hunt`(사냥 중이면 마을에서 안 보임)
  - 같은 계정이 또 들어오면: **같은 기기**(브라우저마다 `localStorage cbt-dev` 번호)는 바로 바꿔 줌, **다른 기기**는 `{t:'busy', kind}` + 4009로 거절 → 화면에 "PC에서 이미 접속 중이에요 … 여기서 이어서 할까요?" 창(`showAway`) → 누르면 `take:true`로 다시 접속 → 예전 기기는 4002(`dup`)로 끊기고 "다른 기기에서 이어서 하고 있어요" 잠금 화면
    - 다른 채널에 있어도 찾음: 각 채널 `/has?id=`로 물어보고(`elsewhere`), `toRooms`의 `act:'dup'`으로 끊음
    - 잠금 화면(`S.away`)일 때는 게임을 멈추고 위치 저장·사냥 정산을 안 보냄 (이어받은 기기 기록을 덮어쓰지 않게)
  - 내보내기 4003
- 채팅 규칙(기획서 8-1)은 전부 서버에서: `chat.js`(글자 수·반복 글자·링크·개인정보·금칙어) + `town.js`(1초 1번, 10초 5번 → 30초 쉼, 같은 말 3번, 새 계정 5분 채팅 불가, 경고 3/6/9번 → 10분/1시간/24시간)
  - 채팅은 같은 채널 모두에게 (근처 채팅 없음). PC는 아무것도 안 할 때 Enter → 채팅 칸, 채팅 칸에서 Enter → 보내고 채팅 끝(2026-11-18), Esc → 끝 (`PC_KEYS`). 채팅 기록 D1 `chat_log` 30일 보관
- 차단 `/api/block`(D1 `blocks`), 신고 `/api/report`(최근 채팅 20줄 첨부, D1 `reports`). 서로 다른 3명 넘게 신고 → 처리 전까지 채팅 불가
- **관리자 화면**: 설정 → 🛡️ 관리자 화면 (`users.is_admin = 1`인 계정만). 신고함 · 채팅 기록 검색 · 사람 찾기(임시 비밀번호 발급, 채팅 금지, 내보내기, 영구 차단) · 공지
  - 채팅 명령어: `/공지 내용`, `/조용 닉네임 10분`, `/내보내기 닉네임`
  - 현재 관리자: **김치복** 계정(id 13). 닉네임은 정확히 '김치복'만 가입 가능(`OWNER_NICK`), 비슷한 이름은 막힘
  - **🧪 치트 탭** (2026-11-16): 관리자 화면 → 치트. 내 캐릭터만 바뀜, `activity`에 `admin-cheat`로 기록. 서버 `/api/admin/cheat {k, n}` (`index.js`의 `cheat`)
    - k: `god`(켜고 끄기: `life.god` → `derive`가 공격력 10배, `biteDmg`가 0) · `gold` · `exp` · `lv`(능력치 다시 계산) · `wood` · `stone` · `fishCoin` · `farmCoin` · `pots` · `titles` · `skins` · `gear`(6칸 최고 단계·등급 + 강화 최대) · `farm` · `work` · `cool`
  - 관리자 지정: `game-worker` 폴더에서 `npx --yes wrangler@4 d1 execute kimchibok-game --remote --command "UPDATE users SET is_admin = 1 WHERE nick = '닉네임'"`
- 표 추가: `migrations/0005_social.sql` (users.mute_until, chat_log, warnings, blocks, reports)
- 시험 방법: node 스크립트로 두 번째 사람을 만들어 `new WebSocket(url, { headers: { origin } })`로 접속 (node 22 이상)

### 뽑기(가챠) 체계 — 2026-11-15 배포, 테스트 통과
- 상점(무기점·방어구점) 없앰 → **가챠센터** 건물 하나 (`BUILDINGS`의 `gacha`, 예전 두 건물 자리). 무기 뽑기 / 방어구 뽑기, 1회·10회(10% 할인), 골드만
- 장비 칸 6개: **검·활·지팡이(모두 동시에 낌)** + 모자·갑옷·신발. 장신구·추가 옵션·요구 레벨·가방 없음
- **클래스** `c.cls` (sword 검사 / bow 궁수 / staff 마법사): 캐릭터창 위 버튼(`#clsBar`, `renderCls`)으로 언제든 무료. 공격은 그 클래스의 무기로 (`derive`)
- 장비 한 개 = `{ id, slot, st(단계 1~6), g(등급) }`. 수치는 저장 안 하고 `itemStats(it, 칸강화)`로 계산 → 밸런스는 `W_ATK·A_DEF·A_HP·GRADES`만 바꾸면 됨
  - 등급 7개 `GRADES` (poor 빈약 ~ myth 신화). **한 단계 위 빈약 > 아래 단계 신화** (단계 사이 배율 1.9배 이상으로 유지할 것)
  - 이름 `ITEM_NAMES`, 그림은 game.html `swordParts/bowParts/staffParts/helmParts/armorParts` + 아이콘 `itemImg` (단계마다 모양 다름, 등급은 보석 색), 목록 아이콘 `gIcon` (테두리 = 등급 색, 숫자 = 단계)
- 뽑기 레벨: 상자별 뽑은 수 `c.gacha = {w, a}` → `gachaInfo`. 단계 확률 `GACHA_ODDS`, 가격 `GACHA_COST`, 필요 횟수 `GACHA_NEED`
- 서버 `/api/gacha/pull`: 지금 낀 것보다 좋은 장비는 칸마다 가장 좋은 것 하나만 `c.bag`(= 고를 장비 목록)에 남기고 나머지는 분해(`dismantle`) → 화면이 비교 창(`showPicks`)을 띄움 → `/api/gacha/pick {id, take}`
- 강화는 **칸**에: `c.enh = {sword: 3, …}`, `/api/enhance {slot}`, 1단계마다 +6% (`ENH_STEP`), 비용 `ENH_COST`
- 능력치 프리셋 5개: `c.presets = [{n, s:[힘,민첩,지력,운]}]`, `c.preset`. 지금 프리셋 값은 `c.str…`에 있고 바꿀 때만 저장 (`/api/preset/use`, `/api/preset/name`). 남은 포인트 = `totalPoints(lv) - spentPoints`
- 사냥에서는 장비가 안 떨어짐 (`HUNT.goldMul` 1.15로 골드 보충)
- DB: `migrations/0007_gacha.sql` (cls, enh, presets, preset, gacha). 예전 형식(`equip.weapon`이 있음) 계정은 `toChar`의 `oldGear`가 처음 읽을 때 바꿔 줌: 산 값 50% 골드 + 1단계 무기 3개, 예전 강화는 같은 칸으로
- 밸런스 시험(뽑기 70%·강화 30%로 골드를 쓰는 봇): 55레벨까지 검사 16.1h · 궁수 15.7h · 마법사 15.7h. 원거리 `FAR_LEAD .6, FAR_WALK .8`로 조정
  - 다시 돌리려면: 새 캐릭터로 `startHunt` → 30초마다 `settle` + 물약 채우기 + `rollGacha`로 뽑고 좋은 것 끼기 + 칸 강화 (스크립트는 임시 폴더에 만들어 씀)
- 화면 확인할 때: 미리보기 창이 숨겨져 있으면 스크린샷이 늦게 바뀌니 `read_page`·JS로 확인

### 4단계 (생활 놀거리) — 2026-11-16 배포, 테스트 통과
- 기획서 4-7에 정리. 방송국은 삭제
- **지도**: `assets/js/game-map.js` (80×60칸, 화면과 서버가 같은 파일). 정해진 규칙(노이즈)으로 만들어서 서버도 집 자리·나무·바위를 똑같이 확인함
  - 맨 위의 `T, MW, MH`는 game-rules.js와 꼭 같게 (두 번 불러오지 않으려고 따로 적음)
  - `BUILDINGS`(마을회관 hall, 낚시점 fishshop, 벌목소 lumber, 채광소 quarry, 텃밭 창고 farmshed 등), `NODES`(나무·바위), `PLOTS`(텃밭 9칸), `canHouse`(중심가 `inCore` 밖, 안 겹치게), `ROOM_*`(집 안 11×8칸, 문 (5,7))
- **자유 이동**: 길 찾기는 칸 A*로 한 뒤 직선으로 펴서 걸음(`walkTo(ch, px, py)` 픽셀, `walkToTile` 칸). 몸 반지름 7px로 부딪힘 확인(`freeAt`, `clear`). 화살표/끌기는 0.5초마다 예상 목적지만 보냄
- **DB**: `migrations/0008_life.sql` — `characters.life`(JSON 한 칸: 코인·목재·석재·텃밭·칭호·버프·알바·채집 쿨), `houses` 표(user_id, x, y, roof). 모든 칭호를 `new`로 초기화함
- **서버 기능**: `/api/title`, `/api/fish/shop`, `/api/farm/plant|plantall|water|harvest|can|plot|unlock`, `/api/gather`, `/api/work/hire|collect`, `/api/wish`, `/api/house/build|roof`, `GET /api/houses`. 칭호는 `checkTitles`가 확인해서 응답의 `newTitles`로 알려 줌
- **실시간**: `{t:'room', r}` (r = 집 주인 id, 0 = 마을). 같은 방 사람끼리만 보이고 대화도 같은 방끼리. `{t:'house'}` → 다들 집 목록 다시 읽음
- 숫자: game-rules.js의 `FISH_SHOP, CANS, FARM, CROPS, GATHER, WORK, HOUSE, WISH, WISH_TABLE, BUFFS, OPTS, TITLES`
- 그림: 몬스터 `MON_ART`(보스는 `MON_BASE` + 왕관), 집 `houseParts`, 건물 `BLD`. 그림은 `sprite()`로 한 번 그려 두고 `blit`
- 사냥: 근접은 `want`(확실히 닿는 거리)까지 다가간 뒤 `ok`를 벗어나야 다시 쫓음. 활·지팡이는 덤비는 몬스터가 1.6칸 안이면 2.8칸까지 물러나며 쏨, 구석이면 3초 그 자리에서 싸움 (`updateHunt`)
- **내 컴퓨터에서 서버까지 시험하기** (실제 DB를 안 건드림)
  1. `game-worker` 폴더에서 `npx --yes wrangler@4 d1 migrations apply kimchibok-game --local`
  2. 같은 폴더에서 `npx --yes wrangler@4 dev --local --port 8787` (백그라운드로)
  3. 미리보기에서 `http://localhost:5173/game.html?api=http://localhost:8787` (`?api=`는 localhost에서만 먹힘)

### 할 이유 · 아이콘 · 밸런스 · 보안 — 2026-11-16 배포, 테스트 통과
- 기획서 **4-8**에 정리. 숫자는 game-rules.js 맨 아래 (`DAILY_POOL, dailyGold, weekBox, EVENTS, LIVE_FX, liveGift, VILLAGE, giveScore, worldFx`)
- **마을 소식판** (`openNews`, 오른쪽 📋 버튼): 오늘 의뢰 · 공동 건설 · 마을 소식. 상단 `#evChip`에 지금 사건/방송 보너스
  - 매일 의뢰는 `life.daily`(그날 시작할 때의 `cnt` 값을 base로 저장) · `life.stamp`. 서버 `play()`가 매번 `checkDaily` → 응답 `daily`
  - 마을 사건은 시간으로 정해짐 (`eventAt`, 저장 없음). 방송 보너스·공동 건설 효과는 서버가 `c.gfx = worldFx(...)`로 넣고 `statFx`가 더함
  - 서버: `GET /api/news`(20초 기억), `/api/village/give`, `/api/live/checkin`, 관리자 `/api/admin/live {min}`. 표는 `migrations/0010_village.sql` (village, village_give, chronicle)
  - 방송 상태: wrangler.toml의 `[[services]] LIVE` → kimchibok-live Worker를 직접 부름
- **아이콘**: `assets/js/game-icons.js` — 이모지 대신 직접 그린 SVG (테두리 + 색 면). 화면 글자는 `iconize()`가 자동으로 바꾸고, 캔버스는 `fillTextIco`
  - 새 이모지를 쓰면 `ICONS`에 그림을 그리고 `EMOJI` 표에 이어 줘야 함 (안 하면 이모지 그대로 보임)
- **밸런스**(사냥 봇 시험): 55레벨까지 약 13~15시간, 시간당 골드 ≈ 1,500 × 레벨 + 8,000. 의뢰 = 사냥 4분, 도장 상자 = 1시간, 방송 출석 = 8분어치
- **보안·부하**
  - 웹소켓: 1초 6개(최대 12개)를 넘으면 4008로 끊음, 인증 안 한 연결 10초 뒤 정리, 하루 채팅 1,500줄
  - 로그인: 같은 IP에서 계속 틀리면 잠금 (`login_fails` 표, `migrations/0009_security.sql`)
  - 낚시: 서버가 바늘 위치를 시간으로 계산해서 판정 (화면이 보낸 결과를 믿지 않음). 하루 400마리 넘으면 값·코인 절반
  - `own()`(Object.hasOwn)으로 `__proto__` 같은 이름 막음, 링크 허용은 주소 앞부분이 정확히 같을 때만
  - 위치 저장 45초, 사냥 정산 60초, 방송 확인 3분, 집 목록은 서버가 바뀐 집만 알려 줌

### 시간 · 텃밭 · 스킬 — 2026-11-16 배포
- ~~시간(낮·밤)·가로등·헤드램프~~ → 2026-11-16 모두 삭제함 (`DAY_MS` 등 없음)
- **텃밭**: 귀퉁이가 둥근 밭 하나 + 두둑마다 작물 2줄×3포기 (`drawPlots`, `cropPlant`)
  - 두둑을 직접 누르면 심기·물 주기·수확 (`plotAt`, `farmTap`)
- **나무 3종 추가**: 자작나무·벚나무·단풍나무 (`birchP, cherryP, mapleP`). 지도에서는 둥근 나무 일부를 좌표로 바꿈 (난수 순서는 그대로)
- **스킨샵**: 정사각형 미리보기 칸 (`skinShop`). 가진 것은 누르면 쓰기/벗기, 없는 것은 구매 확인 창
- **스킬**: 직업마다 6종, 모두 18종 (game-rules.js `SKILLS`)
  - 사냥터에서 쿨타임이 차면 자동으로 씀. 마나는 없음
  - 저장: `life.sk = { 스킬id: 모은 장 수 }`. 장 수 → 레벨은 `SK_NEED` (최대 10)
  - 세기: `skPow` (피해 +10%/레벨 등). 스킬 정의의 횟수 칸은 `x` (`n`은 이름이라 겹치면 안 됨)
  - 뽑기: 가챠센터 → 스킬 뽑기 (직업 상자 고르기). 서버 `/api/skill/pull {cls, n}`, 값은 `SKILL_GACHA.cost(레벨)`. 최고 레벨이 또 나오면 30% 골드 반환
  - 서버 계산: `hunt.js`의 `fight`가 쿨타임(`st.cd` → `hunt.cd`에 저장)·막기·버프를 똑같이 계산
  - 화면 쪽: `castSkill`, 현황판 아이콘 `renderHbSk`, 캐릭터창 → 스킬 탭(`renderSkills`)
  - 밸런스(봇 시험, 골드 30%를 스킬에): 55레벨까지 약 11~12시간 (스킬 없이 14~16시간)
- 버튼 응답(`took`)으로 위치를 바꾸지 않음 (`applyMe(m, keep)`). 서버 저장 위치는 45초마다라서, 예전에는 수확하면 옛 자리로 순간이동했음
- **자동 낚시**:
  - 자동용 미끼 `life.fish.pack`은 골드로 묶음 구매 (`AUTO_FISH.packs`, `/api/fish/pack`)
  - `/api/fish/auto`가 한 번에 던지기와 당기기를 함. 낚을 확률은 손 낚시보다 10%p 낮음, 쿨타임 10초
  - 체크박스 "미끼 다 쓸 때까지 계속" (`F.all`, localStorage `cbt-afall`). 위쪽 `#fishChip`을 누르면 낚시터 창
- **알바·자동 낚시 중에는 그 자리에서만** (`BUSY()`, `busyPace`, `busyToast`)
  - 알바 중에는 카페 문 앞을 서성이고, 자동 낚시 중에는 강가에 있음
  - 다른 곳 누르기·화살표·바로가기 순간이동이 막힘
  - 서버도 알바 중에는 채집을 막음
- 낚시터 표지판 `FSIGN` (점선 고리는 삭제). **낚시는 어느 물가에서나**: 물을 누르면 가장 가까운 물가 칸(`shoreNear`)으로 걸어가서 낚시 창. 낚시하는 자리는 `FSPOT` (자동 낚시 중에는 그 자리에만 있음)
- 가챠 결과 카드: 휴대폰에서는 이름을 빼고, 옵션은 개수만 표시. 카드를 누르면 자세히 보임
  - "⚡ 자동으로 고르기" (`autoPick`): 더 센 것은 끼고 나머지는 분해
- 텃밭 창: 작물 정보를 꼬리표로 표시 (`cropTags`), 소제목 위 여백(`.sheet h3.sub`)
### 치지직 연동 · 바닥 · 뽑기 값 — 2026-11-16 배포
- **치지직 채팅 → 마을**: Durable Object `Chzzk` (`game-worker/src/chzzk.js`, wrangler.toml의 `CHZZK` 바인딩·마이그레이션 v2·`CHZZK_CHANNEL`, 크론 5분)
  - 방송 중이면 치지직 채팅 서버에 읽기 전용으로 접속 (`live-status`의 `chatChannelId` → access-token → `wss://kr-ss{n}.chat.naver.com/chat`)
  - 받은 채팅은 1초씩 모아 각 채널 Town의 `/chzzk`로 보냄
  - Town은 **닉네임이 게임과 완전히 같고 광장 근처(분수에서 9칸, `nearPlaza`)** 인 사람 말만 보여 줌. 사냥 중·집 안·채팅 금지면 안 보임. 금칙어 검사는 같음. 채팅창에 초록 `치지직` 꼬리표
  - 공식 문서가 없는 방식(웹 채팅과 같은 주소)이라 치지직이 바꾸면 끊길 수 있음 (게임은 그대로 돌아감)
  - 닉네임만 보므로, 치지직에서 같은 닉네임을 쓰는 다른 사람의 말도 그 게임 캐릭터의 말로 보임
- **광장 생방송 화면**: 광장 북쪽 대형 전광판 (아래 참고). 시험: localhost에서 주소에 `&live=1`
- **바닥**: 칸(1×1)은 그대로이고 그림만 둥글게. `game-map.js`의 `soft(종류, x, y)` > .5 인 곳에 그 바닥을 그림 (`paintGround`, 4px 단위로 계산해서 늘림)
  - 광장은 원 (`PLAZA_C`, `PLAZA_R`). 나무·돌 자리와 자원 번호가 안 바뀌게, 지도를 만들 때는 예전 모양으로 자원을 먼저 놓고 마지막(6번)에 둥글게 바꿈
  - 집 자리: 그림으로 보이는 길(`soft(PATH)`)이나 물가가 조금이라도 걸치면 거절 (`canHouse`)
- 나무 종류는 **모양만** 다름 (색은 같은 초록). 카메라는 지수 보간 + 화면 픽셀 맞춤(`pxR`)으로 덜 떨림
- **스킬 뽑기**: 직업 상관없이 18종에서 나옴. 뽑기 레벨은 `skGachaInfo(life.skg)`. 1회 값 1,500 → 25,000, 전설 확률 10% → 30% (`SKILL_GACHA`)
  - 장비 뽑기는 원래부터 레벨별 값 (`GACHA_COST`)
- 스킨샵·스킨 탭 미리보기는 늘 민머리 + 기본 눈 (그 스킨만 보이게)
- 텃밭 두둑 9칸을 밭 가운데로 옮김 (`PLOTS`)
- 광장 가운데 = 분수 그림 가운데 (`PLAZA_C = {40, 31.3}`)
- 바닥 그림 v2: `soft` 값을 4px 격자로 재서 **마칭 스퀘어로 경계선을 벡터(Path2D)로** 따서 칠함 → 확대해도 또렷. 바닥 캔버스는 `GK`배(PC 1.6, 휴대폰 1.45) 해상도
- 풀밭에도 돌(`DECO`에서 좌표로 정함 → 캘 수 있는 바위). 캘 수 있는 나무의 반짝 별은 없앰
- 확대 값은 PC·휴대폰, 마을·사냥터 따로 저장 (`cbt-zoom-pc`, `cbt-zoom-pc-hunt`, `cbt-zoom-m`, `cbt-zoom-m-hunt`)
- **스킨 보유 효과**: `HATS`·`EYE_SKINS`의 `fx`. 가지고만 있으면 붙음(`skinFx` → `statFx`). 스킨샵 칸 아래·캐릭터창 스킨 탭 위에 합계
  - 물고기 값(`fishP`)은 이제 `derive(c).fx`로 계산 (예전엔 마을 효과만 봤음)
- 알바 효율: 카페 알바 `JOB.pay` = 60 + 레벨×7 (예전 40 + 레벨×5), 벌목소 시간당 11·채광소 8, 쌓이는 최대 10시간
- 자동 낚시 중에는 머리 위에 "🎣 낚시 중 · 미끼 N" 말풍선
- **가챠센터는 광장 서쪽**(23,30, 카페·마을회관 사이)으로 옮김. **광장 북쪽(옛 가챠 자리)에 대형 전광판** `SPOTS`의 `screen` (35,22, 10×2칸)
  - 둘 다 game-map.js 7번에서 자원을 다 놓은 뒤에 옮김/추가 (나무·돌 번호 그대로)
  - 전광판(`drawScreen`, `screenRect`): 늘 보임. 방송 중이면 썸네일 + LIVE, 누르면 치지직 플레이어 창. 아니면 "김치복 TV · 다음 방송까지". 작은 광장 게시판 위의 생방송 화면은 없앰

### 스킨 · 레이드 · 자동 생활 · 집 단계 — 2026-11-16 배포
- **스킨 추가**: 의상 `SUITS` 6종(가진 것 `suit:id`, 입은 것 `c.suit`) + 무기 스킨 `WSKINS` 무기마다 6종(`wsk:종류:id`, 낀 것 `c.wsk`). DB `migrations/0011_skins.sql`. 그림 `suitParts`, `wskParts`
  - 레이드 전용(`raid: 'rdragon'`)은 가게에서 못 삼. `raidSet(set)` = 한 세트 6부위(모자·눈·의상·검·활·지팡이)
- **매시 정각 레이드** (레드 드래곤): Durable Object `Raid` (`game-worker/src/raid.js`, 인스턴스 하나 'main', wrangler 마이그레이션 v3)
  - 정각부터 30초 모집 → 최대 150초 전투. 보스 체력 = 참가자 공격력 합 × 100초라서 늘 잡힘. 숫자는 game-rules.js `RAID, RAID_BOSS, raidPattern, raidReward`
  - 전용 스킨 확률 `RAID.drop`·`dropDead` = 2/3 (3번에 2번, 쓰러져도 같음)
  - **스킬도 자동**: `raidSkillTick`·`raidSkill`(사냥터 `castSkill`과 같은 규칙, 회복은 체력 70% 아래일 때만), 보호막 `raidBlock`, 표시 `raidAura`, 레이드 창의 `#raidSk`(=`renderHbSk(D, el, cd)`)
  - 서버 피해 한도: `raidDps`에 스킬 평균 피해 포함 + raid.js가 안 쓴 한도를 8초어치까지 모아 둠(`P.spare`) → 메테오처럼 한 번에 크게 들어가도 안 잘림
  - 그림(2026-11-16 다듬음): `paintRaid` = 바위벽·용암 폭포·용암 호수·보물 더미·제각각 판석·빛나는 소환진·돌기둥·뼈. 움직이는 것 `raidAmbient`(용암 빛·거품·불티 `RD.emb`). 드래곤 `drawDragon` = 막 3겹 날개·뿔·이빨·발톱·꼬리 가시, 불 뿜기 전 목이 달아오름, 콧김
  - 시험: 임시로 `window.__raid = () => { enterRaid(srvNow() + 1500); RD.tries = 99; RD.ws.onmessage = null; RD.ws.close(); RD.max = RD.hp = 1e9; }` (DEBUG-REMOVE)
- 화면 `raidAsk/enterRaid/updateRaid/raidClaim`. 새로고침하면 localStorage `cbt-raid`로 다시 들어감. 보상은 `/api/raid/claim` (`life.raidGot`으로 한 번만)
- **관리자 버튼**: 오른쪽 세로 버튼 맨 위 🛡️ (`#admBtn`, 관리자만 보임) → 치트 탭 맨 위 '드래곤/오우거 레이드 지금 열기' (`/api/admin/raid {boss}`)
- ~~자동 생활 🧺: `life.auto`, `autoSettle`(시간으로 계산)~~ → 2026-11-17 새 자동 생활로 바뀜 (아래 "자동 생활 새로 만듦"). 예전 설명: 사냥·알바를 시작하면 꺼짐. 화면 `autoPace`는 보여 주기용
- **집 단계** (마을회관): `HOUSE_TIERS` 일반 집 → 2층 집 → 큰 집 → 빌라 → 4층 건물 → 빌딩. 빌라부터 임대 수입(1시간 5천/1.2만/3만, 최대 `HOUSE_INC_CAP` 12시간)
  - `life.house.{lv, at, acc}`, `houseSettle`, `/api/house/up`, `/api/house/collect`, DB `houses.lv` (`0012_house_lv.sql`). 그림 `towerParts(lv)`
- 처음 안내(`showGuide`)에 '이런 것도 있어요': 마을회관 집 · 매시 레이드 · 자동 생활
- 화면 확인용 임시 코드는 줄 끝에 `// DEBUG-REMOVE`를 달고, 배포 전에 그 줄들을 지움
  - **원래 있던 줄을 DEBUG-REMOVE 줄로 바꾸지 말 것** (새 줄로만 추가). 2026-11-16에 게임 화면 갱신 줄을 바꿨다가 지울 때 같이 사라져서 게임이 멈춘 적 있음
  - 배포 전 `git diff`에서 지워진 줄(`-`)이 의도한 것인지 확인
- 화면 오류는 `showErr`가 토스트로 "⚠️ 오류: … (파일 줄)"을 보여 주고 게임은 계속 돔. 사용자가 이 글을 알려 주면 그 줄을 보면 됨
- CLAUDE.md에 백틱 들어간 글을 넣을 때는 bash `node -e` 말고 Write/Edit 도구로 (백틱이 명령으로 실행돼 깨짐)
- **소리**: `assets/js/game-sound.js` — 효과음·배경 음악을 파일 없이 코드(Web Audio)로 만듦 (저작권 걱정 없음)
  - `sfx('이름')` 효과음 (목록은 `FX`), `bgm('town' | 'hunt' | 'raid')` 배경 음악 (`SONGS`, 8마디를 코드로 반복)
  - 처음 화면을 누른 뒤에야 소리가 남 (`sndUnlock`). 설정 → 효과음·배경 음악 크기, 소리 끄기 (localStorage `cbt-snd`)
  - 서버 버튼 성공 소리는 game.html의 `ACT_SND` (주소 → 소리), 모든 버튼 누르는 소리는 document click 한 곳
  - 확인: 페이지에서 `(await import('/assets/js/game-sound.js?v=__BUILD__')).sndState()` → `ctx: 'running'`이면 소리 남
  - 더 진짜 같은 소리(나무 베기 등)가 필요하면 Kenney.nl CC0 묶음을 받아서 바꿀 수 있음 (받기 전에 사용자에게 확인)
- 오른쪽 세로 버튼과 확대 버튼은 `.rcol` 한 줄에 같이 있음 (버튼을 더 넣어도 안 겹침)
- **레이드 스킨 레벨**: 같은 스킨을 또 얻으면 `life.rsk[키]` 개수가 늘어 레벨업. Lv = log2(개수)+1 (1·2·4·8개…), 효과 레벨마다 +50%, 최고 Lv10 (`RSK, rskLv, rskFx`). 전부 Lv10이면 골드
- **로딩 화면** `#boot`: 바닥 그림(`paintGround`)을 단계별로 나눠 그리며 막대를 채움 → 내 정보(`/api/me`) → 마을. 바닥 그림이 비면(휴대폰 메모리 부족) 해상도 1.2 → 1 → .75 → .5로 다시 그림. 휴대폰은 사냥터 바닥을 하나만 기억
  - 휴대폰 크롬에서 1/10 단계에 번쩍이며 멈추던 문제(2026-11-16): 큰 바닥 그림을 GPU로 그리다 멈춤 → 휴대폰은 `willReadFrequently: true`(보통 캔버스)로 그리고 다 그린 뒤 `createImageBitmap`. 바닥 무늬는 `clip` 대신 `inside()`(다른 판에 그려 모양대로 오려 붙임). 바닥·사냥터·레이드 그림에 `g.clip(복잡한 모양)`을 다시 쓰지 말 것
  - 튕긴 기록이 있으면 `cbt-lowmem`(0~3)이 올라가서 그림이 작아짐. 되돌리려면 그 기기에서 localStorage `cbt-lowmem` 지우기
- 휴대폰 사냥터 확대 기본값 1.15 (저장된 값이 있으면 그 값). PC 화면 크기는 예전 120%가 지금의 100%(기본, 실제 배율 1.2)
- 자유 행동(🚶)은 자동 생활(🧺)에 합침 → 자동 생활 차례 중 '산책'에서 돌아다니며 인사(`roamStep`)
- 능력치 +10 버튼 (포인트가 모자라면 남은 만큼)
- 사냥 골드 `HUNT.goldMul` 1.15 → 0.6 (낚시·알바가 의미 있게). 30레벨 시간당 약 2.8만 골드

### PC 실행 파일 (윈도우) — 2026-11-18
- `windows-app/치복 타운.exe`: 크롬(없으면 엣지)을 (2026-11-18 엣지 안내 창이 자꾸 떠서 크롬 먼저) **앱 창 모드**(`--app`, 주소창·탭 없음)로 열어 게임 주소를 띄움. 화면의 85% 크기(최대 1600×960)로 가운데에
- 프로필은 따로 `%LOCALAPPDATA%\ChibokTown` → 브라우저와 안 섞이고, 로그인은 이 창에서 한 번 하면 유지
- 소스 `Launcher.cs`, 아이콘 `icon.ico`(game-512.png로 만듦), 다시 만들기 `build.bat`(윈도우에 들어 있는 .NET csc로 컴파일, CRLF 줄끝 필요). 배포 때는 지움(update.yml)
- **실행 파일에서만 Alt+Enter = 전체화면**: 실행 파일이 `game.html?app=exe`로 엶 → game.html `IS_EXE`가 localStorage `cbt-exe`에 기억하고 주소에서 지움 → Alt+Enter가 `#fsBtn`과 같은 동작 (일반 브라우저에서는 안 켜짐). 전체화면 중에는 `navigator.keyboard.lock([Escape])`로 Esc를 게임이 받아 창만 닫음 (크롬 규칙상 Esc를 2초 꾹 누르면 그래도 전체화면이 풀림)
- 게임 주소를 바꾸면 `Launcher.cs`의 `URL`도 바꾸고 다시 만들기. 서명이 없어서 남에게 주면 Windows SmartScreen 경고가 뜰 수 있음

### 휴대폰 앱 (크롬 앱 설치) — 2026-11-16
- `game.webmanifest`(이름 치복 타운, 시작 `game.html`, 범위 `./game.html`이라 홈페이지 앱과 따로, 전체 화면). game.html `<head>`에서 연결
- 아이콘 `assets/img/game-192.png`, `game-512.png`: 김치복 얼굴 + 마을 배경. 임시 HTML을 크롬 headless `--screenshot`으로 찍어서 만듦
- 설치: 휴대폰 크롬 → 게임 주소 → ⋮ → 앱 설치. 게임을 고치면 앱도 바로 바뀜 (다시 설치할 필요 없음)
- 진짜 APK 파일(플레이스토어 등)이 필요하면 Bubblewrap(TWA)로 만들 수 있음 — JDK·Android SDK·서명 키 필요

### 낚시 다시 만들기 · 가이드 — 2026-11-16 배포
- **손 낚시**: 물을 누르면 물가로 걸어가서 바로 던짐(미니게임 없음). 서버 `/api/fish/hand` 한 번에 결과를 정하고 `wait`(ms)를 줌 → 화면은 기다림 → 입질 → 결과
  - 손·자동 같이 `index.js`의 `fishOnce(c, at, env, user, auto)`. 예전 `/api/fish/cast`·`/api/fish/reel`은 없앰
  - 낚을 확률 `fishHit(rod, fx, auto)` = 60% + 낚싯대 단계×6%p + `fx.fishZ`(%p), 최대 95%, 자동은 −10%p (game-rules.js `FISH_HIT`)
  - 대어 `isBigFish` = 그 물고기 길이 범위의 위 30% → `cnt.perfect`로 셈 (칭호 fp30 '대어 30마리')
  - 값 조정: 낚싯대 코인 [28,70,155,310,560], 미끼 [21,56,126,250,490], 자동 미끼 묶음 [[20,200],[100,940],[300,2640]]
- 화면: `c.fz`(낚시하는 모습: 찌 자리·단계·ph wait/bite/got/miss) → `drawRods`가 낚싯대·줄·찌·물결, 낚으면 줄 끝에 물고기 + 머리 위 "00cm짜리 이름(등급) 잡았다!" (`bragText`). 걷기 시작하면 `rodTick`이 넣음
  - 실시간 `{t:'fish', s}`: 1 던짐(bx,by,r) · 2 낚음(g,n,len,big — town.js가 FISH 목록으로 확인) · 3 놓침 · 0 넣음
- 낚시터 창(`openFishing`, 표지판·바로가기·`#fishChip`)은 자동 낚시 + 순위만
- 오른쪽 버튼에 글자: 🏘️ 바로가기 · 🧺 자동 · 📖 가이드(새로, `openGuideBook`, 내용은 `GUIDE()`). 처음 안내 창(`showGuide`)에 "👉 오른쪽 버튼" 칸
  - 놀거리를 새로 만들면 `GUIDE()`에도 설명을 넣을 것

### 남쪽 바다 — 2026-11-16 배포
- 지도 높이 60 → **72칸** (`MH`, game-rules.js와 game-map.js 둘 다). 예전 지도(1~7번)는 `OMH = 60`·`LIM`으로 **똑같이** 만들고, 8번에서 아래에 바다를 붙임 → 나무·돌·건물·집 자리와 자원 번호 그대로
  - 지도에 새로 넣을 것은 꼭 8번 이후에 (앞 단계를 바꾸면 자원 번호가 바뀜)
- 해안선 `coastY(x)` (만·하구 굴곡), 바다 칸 표 `SEA`, `seaAt(tx, ty)`, 바닷가 낚시 자리 `SEA_AT` (바로가기 '바닷가'). 강은 그대로 흘러 내려가 넓어지며 바다와 만남
- 물고기: `FISH_RIVER`(강·연못) / `FISH_SEA`(바다), `FISH`는 둘을 합친 것(town.js 확인용). `rollFish(luk, rod, bait, sea)`
- 낚시 요청에 찌를 던진 물 칸 `w: [tx, ty]`를 보냄 → 서버 `fishOnce`가 `seaAt`으로 바다인지 판단, 응답 `sea`
- 해안 가까이는 나무·돌이 적음: 해안선에서 3칸 안은 없음, 13칸까지 점점 늘어남 (`COAST_NONE`, `COAST_FADE`, `keepAt`). 꾸밈 나무(DECO)는 빼고, 캘 수 있는 것(NODES)은 번호가 저장돼 있어서 빼지 않고 `n.off = true` (화면·서버 `/api/gather`가 건너뜀)
- 바닥 그림: paintGround 5-2)에서 해안에서 멀수록 진한 파랑 + 해안선 따라 파도 거품. 낚시터 창에 강/바다 물고기 목록(`.fishdex`)

### 이동 속도 · 돌진 · 자동 새로 고침 — 2026-11-16 배포
- 마을 걷기 속도 1.5배: `me.speed = 165 * D.spd` (예전 110), 다른 사람 `speed: 195` (예전 130). 사냥터·레이드 속도는 그대로
- 검사 스킬 `s_bash` 강타 → **돌진 베기** 🏃 (`dash: 1`, m 2.1, stun .5). id는 그대로라서 모은 장 수 유지
  - 사냥터: 공격 거리 밖이어도 6칸 안이면 씀 → `HT.dash`로 0.16초 동안 몬스터 앞까지 미끄러짐 + 잔상 `HT.trail`. 레이드: 드래곤 앞으로 바로 이동(`raidSkill`)
- **새 버전 자동 새로 고침**: 배포할 때 update.yml이 `game.html + assets/js/game-*.js` 지문(8글자)을 `game-version.txt`에 쓰고 game.html의 `__GAMEV__`에 넣음
  - 화면은 1분마다(그리고 다시 볼 때) `game-version.txt`를 읽고 다르면 토스트 → 3초 뒤 위치 저장 → 새로 고침 (`checkVer`, `reloadSoon`). 레이드 중이면 끝난 뒤
  - 데이터 자동 갱신(봇 커밋)으로는 지문이 안 바뀌어서 새로 고침 안 됨. 내 컴퓨터에서는 `__GAMEV__` 그대로라 꺼져 있음
- **그림 폴더** `assets/img/game/` (2026-11-16): 지금 코드 그림을 PNG로 뽑아 둔 참고용 사본 380장 (char·item·mon·build·nature·props·ui·bg, 설명은 그 폴더 README.md). 게임은 아직 이 파일을 안 읽음
  - **사용자 요청: 그림을 고쳐도 PNG를 다시 뽑지 말 것** (직접 부탁할 때만). 다시 뽑기: (1) 백그라운드로 `node scripts/img-export/recv.mjs` (5199 포트, 받은 PNG를 그 폴더에 씀) (2) `scripts/img-export/exporter.js` 내용을 한 줄로 합쳐 game.html의 `// 화면 이동은 실제 화면 점` 줄 앞에 `// DEBUG-REMOVE`로 넣기 (3) 로컬 서버 + 미리보기에서 로그인 후 `window.__export()` (숨긴 창이면 몇 분 걸림, `.then`으로 돌리고 기다리기) (4) DEBUG-REMOVE 지우기
  - 사용자가 직접 그린 그림을 넣으면 그 그림을 `Image`로 불러 `sprite()` 대신 쓰게 바꾸기
- **텍스쳐 템플릿** `텍스쳐 템플릿/` (2026-11-17): 사용자가 직접 그릴 틀. `이름.png`(바꿀 그림) + `이름_guide.png`(격자·기준점). 설명·다시 만드는 법은 그 폴더 README.md. 배포 때 지움(update.yml)
  - 기준점: 캐릭터 조각 = 발(4배, 원점 (192,336)) · 소매 = 어깨 · 무기 = 손잡이(8배) · 몬스터 = 발(4배, `monSprite` 틀) · 건물 = 차지하는 칸 왼쪽 위(2배, `bSprite`·`houseSprite` 틀과 같음) · 물고기 = 가운데(512px)
  - 적용할 때: 그 PNG를 `Image`로 불러 같은 기준점·배율로 그리기 (캐릭터 조각은 `drawChar`의 inkDraw 순서에 맞춰 끼워 넣기)
- 사냥터 보스: 30분 → **5분마다** (`HUNT.bossEvery: 300`). 보상은 그대로라 보스 수입이 6배
- 바로가기 창: `PLACES` = [아이콘, 이름, x, y, 하는 일, 묶음], 묶음 `PLACE_GROUPS` (이동 / 가게 / 생활·모으기)
- **마을 그림 스타일** (2026-11-16, 마을 전체 적용): 테두리 없는 면 + 위에서 내려다본 3/4 시점 (윗면 약 80%, 앞면 약 20%, 원근·소실점 없음, 반듯한 평행선)
  - 도우미(inkDraw 바로 뒤): `sh(색, k)` 밝게/어둡게, `flatInk(g, parts)` 테두리 없이 칠하기, `topB(W, H, {kind: hip|gable|flat, roof, wall, wins, door, fh, top…})` 건물 한 채(기단·앞벽·지붕·처마), `awning` 줄무늬 차양
  - 건물 `BLD`(마을회관은 직접 그림), 집 `houseTop(lv, roof)` (높은 단계일수록 앞면이 길어지고 지붕이 위로), 나무 `crown`·`spiky`, 바위 `rockP`, 분수·벤치·표지판·포탈·전광판 틀·작물·텃밭·집 안 문까지 `flatInk`
  - 테두리(inkDraw 두꺼운 선)가 남아 있는 것: 캐릭터·장비 아이콘·몬스터·사냥터·레이드 (마을 밖). 새 마을 그림은 꼭 `flatInk`로
  - 굴뚝 연기·커피 김 위치와 가챠 불빛 높이는 `drawBuilding`, 간판 높이는 `LAB`

### 건물 옮김 · 생활 경험치 · 물 — 2026-11-16 배포
- 가챠센터 (21,32), 마을회관 (30,41)로 옮김: game-map.js **9번**(맨 마지막)에서 옮기고 길 2개를 이어 줌. 나무·돌 번호 그대로
- 강이 바다와 끊겨 있던 것 고침 (8번에서 58~59줄 강물이 모래로 덮였음)
- 물 움직임 `drawWater` (render에서 바닥 그림 바로 뒤): 물결 반짝임, 강은 아래로 흐름, 바닷가 파도 줄
- 무기 스킨 칸(`skinTile`의 weapon 모드)은 캐릭터 없이 무기 그림만. 나무 기둥은 `trunkP` (아래가 퍼진 기둥)
- **생활 경험치** (game-rules.js `huntIdleExp, lifeExpHour, LIFE_EXP_DIV, lifeExp`)
  - 자동 생활 1시간 경험치 = 사냥 방치 1시간 어림값(`5500 × 레벨 + 10000`, 봇 시험으로 맞춤)의 **50%** (사용자 결정)
  - 직접 하기: 낚시 성공 1마리 = 1시간 값 ÷ 250, 채집 ÷ 60, 카페 알바 ÷ 55, 작물 1포기 ÷ 40. 서버 응답 `lexp` → 화면에 ✨ +N
- 텃밭에서 고른 씨앗은 localStorage `cbt-seed`로 기억
- 텃밭 작물: 자라는 동안에도 심은 작물 그림(선 없는 `icoImgFlat`)이 작게 → 크게, 두둑 테두리 선 없음
- 대장간 창: 설명 한 줄 + 칸마다 꼬리표 `[공격 7 → 8] [성공 95%]` (`.echip`, 확률 색 초록/노랑/빨강)

### 건물 창 UI 개편 — 2026-11-17
- 마을 건물 9곳(카페·가챠센터·대장간·스킨샵·마을회관·낚시점·벌목소·채광소·텃밭 창고)이 **같은 틀**을 씀: `bsWrap` / `bsOpen` (game.html, `openBuilding` 바로 위)
  - 순서: 머리(아이콘 + 이름 + 한 줄 소개) → 지갑(그 건물에 필요한 재화만, `WAL`) → 탭 → 내용 → ❓ 도움말(접힘) → 주 버튼(창 아래 고정 `.bs-foot`)
  - 적용한 원칙: 힉의 법칙(기능이 여러 개면 탭), 피츠의 법칙·엄지 영역(버튼 44px 이상, 주 버튼은 아래), 점진적 공개(긴 설명은 도움말), 상태 보이기(막대·꼬리표, 모자란 재료는 빨간 꼬리표에 "N 모자람"), 일관성
  - 탭: 가챠(무기/방어구/스킬), 스킨샵(머리/눈/의상/무기/레이드), 마을회관(내 집/이웃 집), 텃밭(밭/씨앗/상점). 고른 탭은 `S.btab[건물 id]`에 기억 (새로 고침 전까지)
  - 부품: `chip`, `pbar`(막대), `thinBar`, `steps`(단계 칸), `bbtn`(버튼), `costChips`(비용 꼬리표), `oddsBar`(확률 막대), 색 `BC[건물 id]` → CSS `--bc`
  - `live: true`면 1초마다 다시 그림 (카페 알바·체력, 텃밭 밭 탭). 도움말 열림 상태는 `S.bhelp`로 유지
  - 새 건물을 만들면 이 틀로: `bsOpen(b, { tag, wal, tabs, tab, body, help, foot, live, ready }, 버튼 처리 함수, keep)`
- 시작 안내 창(`showGuide`)도 같은 틀 (2026-11-17): 탭 오늘 할 일 / 놀거리(오른쪽 버튼을 눌러 바로 열기) / 조작, 아래 고정 '오늘 하루 보지 않기' + 가이드·시작하기. 색 `BC.guide`, 모양 `.gd-row`·`.gd-card`·`.gd-key`
- 예전 `sheetHead`, `skBox`, `#farmSheet` 1초 갱신은 없앰. 소원 분수·낚시터(물가) 창은 아직 예전 모양
- **장비 뽑기 결과** (`showPulls`): 같은 틀. 더 센 장비(NEW)가 앞에, 분해된 건 흐리게, 장착한 건 초록 테. 아래 버튼은 ⚡ 자동으로 고르기(맨 위) → 🔍 하나씩 비교
  - 가방(`me.bag`)에 고를 장비가 남아 있으면 **창을 닫아도** 가챠센터를 열거나 다시 접속하면 결과 화면으로 돌아옴 (다 골라야 다시 뽑기 가능). 닫기 잠금(`pickLock`)은 없앰
  - 결과는 `S.pull` + localStorage `cbt-pull`에 기억. 고른 결과는 `pullMark`. 기록이 없으면 가방으로 다시 만듦(`pullState`)
  - 스킬 뽑기 결과·비교 창(`showPicks`)도 같은 틀. 비교를 다 끝내면 결과 화면으로
- 스킨샵 칸: 그림 아래에 이름 · 효과를 따로 (`.skgrid.shop`), 값이 0인 레이드 스킨은 가격표 없음

### 마을 주민 NPC 임무 — 2026-11-17
- **3시간마다 새 주민 5명** (이름·생김새·임무가 시간으로 정해짐 → 화면·서버 같은 계산). game-rules.js `NPC_BLOCK, NPC_N, NPC_MAX(3), NPC_NAMES, NPC_TASKS, npcList, npcState, npcProg, npcGold, npcExp`
  - 임무 종류: 물고기·목재·석재·작물·물 주기·소원·카페 알바·장비 뽑기(모두 `cnt` 기록으로 셈) + **안부 전하기**(`talk`: 다른 주민을 찾아가 누르기)
  - 저장 `life.npc = { blk, q: { 주민 번호: { b: 받을 때 cnt, s: 0 하는 중 / 1 끝, t: 안부 전함 } } }`. 새 주민이 오면(blk 바뀜) 받은 임무는 사라짐
  - 보상: 골드 `400 + 레벨×80`, 경험치 사냥 방치 3분어치(`huntIdleExp ÷ 20`), 🐚/🌻 1~2
  - 서버 `/api/npc/take|talk|done|drop` (index.js), `play()`가 매번 `npcState`로 시간대를 맞춤
- 화면(game.html "마을 주민 NPC · 임무"): 주민은 마을 가운데 길·광장 칸(`npcTiles`)에 서서 근처를 서성임, 내가 가까이 가면 멈춰서 쳐다봄
  - 머리 위 말풍선(`npcTag`): ❗ 임무 있음 · 회색 ❓ 하는 중 · 노란 ❓ 다 함 · 💌 안부 받을 사람. 할 일이 없으면 가끔 혼잣말
  - 누르면 대화창(`openNpc`, `npcSheet`). 알바·자동 중에도 대화는 됨
  - **임무창** `#questBox` (왼쪽 위, `renderQuests`, 1초마다): 받은 임무·진행·새 주민까지 남은 시간. 줄을 누르면 그 주민에게 걸어감. ▲로 접기(localStorage `cbt-qmin`)

### 랭킹 · 낚시 쿨타임 — 2026-11-17 배포
- 오른쪽 버튼 📖 가이드 밑에 **🏆 랭킹** (`#rankBtn`, `openRank`, bsWrap 틀, 색 `BC.rank`). 탭: 레벨 / 번 돈 / 비싼 물고기 / 큰 물고기 / 강화 합. 상위 50명 + 내 순위 (물고기 탭은 그 물고기 이름도 보임, 응답의 `f`)
- 서버 `GET /api/rank?k=lv|earn|fishp|fishl|enh|give` (give = 기여도: `village_give.score`). json 칸은 `jx()`로 `json_valid` 먼저 확인 (빈 life 계정 하나 때문에 번 돈이 통째로 실패했었음) (index.js `RANK`, `rankList`, 1분 기억 `RANK_MEM`)
  - 레벨: lv → exp 순 · 비싼 물고기 `fishp`: `fishing.best_price` · 큰 물고기 `fishl`: `fishing.best_len` · 강화 합: `c.enh` 6칸 합
  - **번 돈** = `life.earn`: `play()`에서 (나중 골드 − 처음 골드 + 그 사이 `spend`로 쓴 돈)이 양수면 더함. 치트 골드는 `c._noEarn`으로 빼고 셈. 2026-11-17부터 센 값 (예전 수입은 없음)
- 아이콘 🏆 = game-icons.js `trophy`
- 낚시 쿨타임 10초 → **2초** (`FISHING.cooldown`, 손·자동 같이). 시간당 낚시 수입·경험치가 크게 늘고, 하루 400마리(값 절반)에 빨리 닿음

### 모자 스킨 · 카페 손님 — 2026-11-17 배포
- 모자 스킨(`c.hat`)을 쓰면 머리 장비(`helmParts`)는 안 그림. 화면 이름 '머리 장식' → '모자'
- **투명 모자** `clear` (2026-11-19): 효과 없음, 모두 처음부터 가짐 (`HATS`의 `free: 1` → 서버 `toChar`가 `hats`에 넣어 줌, 스킨샵엔 안 나옴). 쓰면 머리 장비만 가려지고 헤어는 보임
- **카페 손님**: 알바 중 가끔 마을 주민이 와서 커피를 사 가고 팁을 줌. game-rules.js `JOB_GUEST, jobGuests(jobAt, lv), jobTips`
  - 1분을 7토막으로 나눠 토막마다 75% 확률로 손님 1명(평균 5.2명), 팁 = (8 + 레벨×1.2) × 0.8~1.4, 6% VIP 손님은 팁 ×5. 30레벨 1분 = 알바비 270 + 팁 약 310. 알바 시작 시각으로 정해져서 화면·서버 같은 계산
  - 대사 `GUEST_ASK / GUEST_ME / GUEST_THX`. 다른 주민이 손님 노릇 중이면 다음 주민이 옴, 줄 서는 자리는 `g.slot`으로 나눔
  - 서버: `/api/job/finish`가 알바비 + 팁 전부(`tips`), `/api/job/quit`은 그때까지 온 손님 팁만. `/api/me`의 `job.at` = 시작 시각
  - 화면: `guestTick`(npcTick 안). 손님 시각 7초 전에 주민이 빠르게 카페 문 앞으로 → "○○ 한 잔 주세요!" → 내가 "나왔습니다~" → 고마워요 + 팁 토스트 → 제자리로. 손님 노릇 중인 주민은 `p.guest`, 이때는 ❗ 대신 말풍선이 보임

- **주민 대사**: 혼잣말 `NPC_IDLE`(약 50개, ❗/❓ 있는 주민도 말함, 말하는 동안 말풍선이 먼저). 아주 가끔(1.2%, 내가 7칸 안) **소름 대사** `NPC_EERIE`(이 세상이 만들어진 곳이란 걸 눈치챔) → 6.6초 뒤 `NPC_SNAP`으로 아무 일 없던 척

### 몬스터 기믹 — 2026-11-17 배포
- 사냥터가 너무 안전해서(회복 2%/초가 몬스터 피해를 거의 다 메움) 몬스터마다 큰 공격 기믹을 넣음. game-rules.js `GIMMICK, MON_GIM, gimOf, gimDmg`
  - 💨 돌진(dash) · 💢 달려들기(run) · 🪶 급강하(fly) · 💥 내려찍기(jump). 몬스터 종류(`mon.k`)마다 하나 (`MON_GIM`)
  - 피해 = 보통 공격 × m + 최대 체력 × hp (방어로 못 줄이는 부분이 있어서 장비가 좋아도 아픔). 보스는 hp 부분 40%만 (`bossHp`)
  - 사냥 중 회복 `HUNT.huntRegen` 2% → 1.5%/초
- 서버 `hunt.js`의 `fight`: 쿨타임 `nextGim`(첫 번째는 1.5초 + 무작위)으로 큰 공격. 막기(보호막)·회피는 보통 공격과 같음. 기절 스킬이 기믹도 늦춤
- 화면(game.html "몬스터 기믹"): `gimStart → gimStep → gimHit`. 예고 `warn`초 동안 바닥에 빨간 줄(돌진)·원(점프·급강하)·!(달려들기) (`drawGimWarn`), 날 때 높이 `m.g.z`. 화면에서는 예고 자리를 벗어나면 안 맞음. 기절 스킬이 예고 중이면 끊음
- 물약 자동 선택: 최대 체력 1150 넘고 45% 넘게 다쳤으면 특대 음료 먼저 (서버 `drink`, 화면 `usePotion` 같은 규칙)
- 시험 계산(사냥터마다 그 레벨대 캐릭터 1시간): 처치 수는 예전과 같음. 물약 있으면 안 쓰러짐, 물약 없으면 협곡·공장에서 20분에 1~6번 쓰러짐. 물약값 = 사냥 골드의 25~60%
  - 다시 돌리려면: 캐릭터를 레벨·장비 단계로 만들어 `startHunt` → 30초마다 `settle` 1시간, `GIMMICK.off = true`로 예전과 비교

### 도구 들기 · 자동 생활 새로 만듦 — 2026-11-17 배포
- 벌목·채광·낚시할 때 무기 대신 도구를 손에 듦: `c.tool` = axe · pick · rod (`drawChar`, 그림 `TOOL_P`). 도끼·곡괭이는 팔을 들었다 내려찍음(`c.toolT`, `c.toolBusy`). `gatherTick`이 매 장면 `me.tool`을 정함 (채집 중 / 자동 낚시 중). 손 낚시는 원래처럼 `c.fz`면 무기 없음
- **자동 생활** 🧺 (`AU`, `autoPace`, localStorage `cbt-auto`): 캐릭터가 진짜로 걸어가서 손으로 하는 기능을 그대로 씀 → 서버는 손으로 한 것과 똑같이 셈. **게임 화면을 켜 둔 동안만** (화면을 닫으면 안 쌓임)
  - 텃밭이 먼저 (`auFarm`): 다 자람 → 수확, 빈 칸 → 고른 씨앗(`S.seed`) 심기(골드가 씨앗값의 3배 넘을 때), 물 줄 수 있으면 물 주기. 할 일이 있으면 몰아서 다 함 (`farmTap` 그대로)
  - 그다음 `AU_SEQ` 차례: 나무(3~5그루) → 바위(3~5) → 강 낚시(5~8번) → 나무 → 바위 → 바다 낚시 → 산책·인사. 나무·바위는 `startGather`, 낚시는 `fishAtWater`/`handFish`(미끼 필요 없음), 갈 수 없는 자리는 `AU.bad`
  - 막 도착하면 1.2초 기다림(`AU.walked`) → 같은 일을 두 번 보내지 않게
  - 서버: 예전 `life.auto.on`인 계정은 다음 요청 때 마지막으로 `autoSettle` 정산 후 꺼짐. `/api/auto/start`는 아무것도 안 함
  - 사냥·알바 중에는 `BUSY()`가 그쪽을 먼저 봐서 자동은 쉼, 돌아오면 이어서 함

### 방치 반반 · 음료 · 창 크기 · 계속 낚시 — 2026-11-17 배포
- 화면을 닫은 동안 효율 70% → **50%** (`HUNT.offlineEff`). 그중 절반(`HUNT.offlineHunt`)은 사냥 정산, 나머지는 `offlineLife`(game-rules.js `OFFLINE_LIFE`: 생활 경험치·골드·목재·석재·코인). hunt.js `settle`의 응답 `life` → 화면 "자리 비운 동안 부지런히 움직였어요" 창
- 음료: 작은 20% · 큰 50% · 특대 100% (최대 체력 비율). 고르는 규칙 `potPick` 하나를 화면·서버가 같이 씀
- 생활 경험치 줄임: `LIFE_EXP_DIV` 250·60·55·40 → 1000·300·120·150
- 카페 '창가 자리에서 쉬기' 삭제 (`/api/rest`도 없앰). 첫 집 골드 3,000 → 10,000. 레이드 모집 30초 → **2분** (`RAID.recruit`)
- 건물 창 촘촘하게: `@media (pointer: fine), (max-height: 820px)` 블록 (style 맨 위 `.bs` 부분 끝). 바로가기는 이름만 13칸(광장·마을회관·사냥·가챠·강화·스킨·카페·낚시·강·바다·텃밭·벌목·채광)
- 자동 생활 텃밭: 빈 칸은 `farmTap(i, true)` → `/api/farm/plantall`로 한 번에
- ~~손 낚시: 한 번 누르면 계속~~ → 2026-11-18 다시 클릭형: 한 번 누르면 한 번만 던지고, 결과가 나온 뒤 2초(`FISHING.cooldown`) 쉬어야 다시 던짐 (`F.loop` 없앰)
- **화면 맞춤** (2026-11-17): PC 배율 = 설정값 × `uiFit()` (창 높이 940·너비 1700 기준으로 줄임, 최소 0.8). 1280×720이면 약 0.9
  - 넓은 화면(1000px 이상)은 건물 창 너비 720px, `.bs-list` 두 줄(음료처럼 3개면 세 줄), 스킨 그림 5:4
  - 촘촘한 크기 블록은 PC에만 (`(pointer: fine), (min-width: 761px) and (max-height: 820px)`). 휴대폰은 큰 버튼 그대로
  - 1280×720에서 모든 건물 창·탭이 스크롤 없이 들어오는 것 확인함. 새 창을 만들면 이 크기에서 `.sheet`의 scrollHeight ≤ clientHeight인지 확인
- 카페: 내 체력 칸 없앰, 알바가 맨 위
- 랭킹·낚시터 순위에서 빠지는 계정: 김치복 · 테스트 · zz로 시작 (index.js `RANK_HIDE`)
- 낚시 입질까지 3~8초(예전 1.5~4초), `fishWait`: 8%는 더 빨리, 7%는 더 오래 (평균 약 5.5초). 손·자동 같이
- **wrangler 최신(4.163)이 이 컴퓨터에서 묶기 단계에서 조용히 꺼짐** → `npx --yes wrangler@4.45.0 dev/deploy`로. deploy는 끝에 rc 127로 꺼져도 `deployments list`에 새 시각이 있으면 성공

### 가챠 결과 · 전투력 · 레이드 인원 · 자동 중 직접 조작 — 2026-11-18 배포
- 가챠 '지금 낀 장비' → '현재 장비'. 결과 다 고른 뒤 안내는 빨간 강조 "교체되지 않은 결과는 자동으로 분해됩니다." (`.gx-warn`)
- 결과 카드를 누르면: 고를 것(NEW)은 `showPicks`, 이미 정리된 것은 `pullCompare` (현재 장비와 비교만, 돌아가기)
- 건물 창 아래 고정 버튼(`.bs-foot`) 위 여백 늘림
- 왼쪽 캐릭터 정보창에 **⚔️ 전투력 = 초당 피해** (`#mePow`, `raidDps(derive())`: 치명타·필살기·스킬 평균 포함), `syncBars`에서 갱신
- 다른 캐릭터 창 버튼: `.actions.pact` → 아이콘·글자 왼쪽, 작은 설명 오른쪽
- 레이드 인원 보너스 `raidCrowd(n)`: 한 명마다 +3%, 최대 +60% (21명). 서버 `/api/raid/claim`의 배율에 곱함, 응답 `crowd`(%)
- **자동 생활 중 직접 조작**: 누르기·화살표·바로가기·임무창을 쓰면 `auHold()` → 자동 생활이 잠깐 쉬고 그 명령대로 함 (칩에 "⏸ 직접 조작 중"). 걷기·채집·낚시·창이 끝나고 `AU_HOLD`(12초) 가만히 있으면 다시 이어서 함 (`roamTick`). 쉬는 동안 손 낚시도 계속 낚기 됨

### 새 그림 · 채팅 탭 · 계정 초기화 · 물고기 그림자 — 2026-11-18 배포
- **사용자 그림 적용**: `텍스쳐 템플릿/내 디자인/`의 그림을 `scripts/img-export/town-art.py`(파이썬 PIL·numpy)가 흰 배경을 지우고 잘라서 `assets/img/town/*.webp` + `meta.json`으로 만듦. 그림을 바꾸면 이 스크립트를 다시 돌리기
  - 게임은 `ART`(game.html, `artReady`)로 불러오고, 다 불러온 뒤에 바닥 그림·마을을 시작. 못 불러온 그림은 예전 코드 그림으로 (`SP_TREE0`, `drawDragonOld` 등)
  - 건물 9곳 `bSprite`: 칸보다 조금 넓게(비율 그대로), 간판·연기는 그림에 있어서 `plaque`·연기 안 그림. 김치볶음밥 전문점·오우거 그림은 안 씀(사용자 결정)
  - 나무 5종 `TREE_IMG` (maple→tree-1, pine→2, round·캘 수 있는 나무→3, birch→4, cherry→5). 그림에 그림자가 있어서 코드 그림자 안 그림. 바위는 아직 코드 그림
  - **집 8단계** `HOUSE_TIERS`: 일반 집 → 다락방 집 → 2층 집 → 저택(수입 시작) → 빌라 → 3층 빌라 → 4층 빌라 → 궁전. 그림 `house-N` + 하얀 지붕만 뗀 `house-N-roof`에 지붕 색을 곱해서 얹음(`houseImg`), 너비 `HOUSE_IW`
  - 텃밭: 그림 333×157px, 가운데 (56, 48)칸 (`FARM_IMG`, 바닥 그림 10단계에 넣음). 밭 칸은 4줄(46~49)로 줄임(game-map.js 10번). `PLOTS` = 1·3·5번째 고랑에 3칸씩, 두둑 하나에 작물 4포기
  - **레이드**: 배경 그림 `raid-bg`(4:3) → 맵 `RAID.W/H` 28×21칸. 드래곤 = 조각 8개(`DRIG`, 좌표는 원본 분리 그림 픽셀, 조각 그림은 절반 크기라 2배로), 발 `DRAGON()` y 9칸, 입 높이 `DMOUTH`(불길 시작점, 사거리 17칸)
  - 레드 드래곤 스킨: 모자·의상·검·활·지팡이 그림 (`imgPart`, 모자는 얼굴 자리를 뚫어 둠). 무기 그림 조각의 `after`도 손 위치로 옮겨 그림(drawChar 무기 줄)
- 로딩 화면 아이콘 = 앱 아이콘 얼굴(`assets/img/game-192.png`, 둥글게)
- **채팅**: 탭 '마을 전체 채팅'(기본) / '기록'(시스템 알림, `#sysLog`). 시스템 글 중 채팅에 남길 것만 `chatSys`. 채팅 규칙 버튼 없앰. 관리자 꼬리표는 '시장'
- **계정 초기화**: 설정 → ⚠️ 계정 초기화, '동의합니다'를 입력해야 버튼이 켜짐. 서버 `/api/reset {ok}`: 캐릭터를 새로 만들고 집·낚시 기록·공동 건설 기여를 지움 (닉네임·비밀번호는 그대로)
- **자리 비움**: 사냥 중이 아니어도 마지막 접속(`life.seen`)에서 5분 넘게 지나면 생활 보상(`offlineLife`) → 응답 `away` → 화면 `awaySheet`. 화면이 보일 때 2분마다 `/api/seen`
- **자동 낚시 삭제** (`/api/fish/pack`·`/api/fish/auto` 없앰, 남은 자동 미끼는 1개 9골드로 돌려줌 `refund`). 손 낚시는 2초마다 계속
- **물고기 그림자**: game-map.js `FSHADOW, fishShadows(now), shadowAt` — 45초마다 새 그림자 2개가 시간으로 정해진 물가 자리에 150초 동안 헤엄침(화면·서버 같은 계산). 찌를 1.7칸 안에 던지면 미끼 +3단계로 두 번 굴려 비싼 것 + 낚을 확률 +12%p. 낚으면 `life.fsh`에 적혀 그 사람에게서 사라짐. 화면 `drawShadows`, 요청에 찌 위치 `p`
- **스킨샵 미리보기**: 칸을 누르면 `skinPreview` 창 — 지금 내 모습 → 쓰면(벗으면) 모습을 나란히, 좌우로 돌아봄. 여기서 사기·쓰기·벗기 (가진 것도 바로 바뀌지 않고 미리보기를 거침). 레이드 모자는 `hat:` 없이 오므로 skinShop이 `a = 'hat'`으로 맞춤 (예전엔 레이드 모자 쓰기가 안 됐음)
- **레이드 나가기**: 레이드 창 오른쪽 위 🚪 나가기 (`leaveRaid`). 확인 창 뒤 마을로, 그 레이드 보상은 없음. 끝난 뒤에는 원래처럼 보상 받고 자동으로 마을로
- 모바일: 임무창 위치를 위쪽 칩 아래로 맞춤(`renderQuests`), 랭킹 종목은 드롭다운, 대장간 아이콘 겹침 고침, 설정 버튼 글자 왼쪽 정렬

### 드래곤 v2 · 테두리 · 레이드 모집 · 자리 비움 사냥 — 2026-11-18 배포
- **드래곤 그림 v2**: 사용자가 1182×1024 판 하나에 위치까지 맞춰 그린 조각 5장(`드래곤_날개/뒷다리/몸통/앞발/머리.png`, 날개·뒷다리·앞발은 왼쪽만 → 오른쪽은 뒤집음). town-art.py 6번이 `d-wing/leg/body/arm/head.webp`(절반 크기) + meta `dragon`(판 좌표)
  - game.html `DPART`(판 좌표 그대로) · 원점 판 가운데 591 · 바닥 985 · 배율 `DS .28`. 따로 판 `DGC`에 다 그린 뒤 전체 둘레에 검은 테두리. 날개 축 (-165, -650)
- **레드 드래곤 스킨 v2**: 텍스쳐 템플릿 틀 그대로 그린 5장(`스킨_드래곤_모자/갑옷/검/활/지팡이.png`). town-art.py 7번이 잘라서 meta `rd`에 틀 안 위치(게임 단위)를 적음 → `imgPart` 좌표에 그대로 씀 (모자는 hy = -45, 갑옷은 몸 y = -20 기준)
- **바깥 검은 테두리**: `inkImage`·`inkSil`(그림 모양 검은 판을 16방향으로 밀어 그림). `imgPart`에 `ink`가 있어서 inkDraw가 다른 조각과 같이 실루엣을 그림 (drawChar 무기 변환도 `ink`를 감쌈). 건물·집·나무 그림 스프라이트는 `BP`(4px)만큼 넓힘. 코드 그림 나무·바위·그루터기·돌무더기·건물도 `flatInk` → `inkDraw`
- 텃밭 창고 ×1.3 · 낚시점 ×1.35 (`BSC`). 텃밭 그림 세로 ×1.08 (`FARM_SY`, `PLOTS` y도 맞춤)
- **레이드 스킨**: 무조건 1개 + 30% 확률로 1개 더 (`RAID.drop2`, 쓰러져도 같음). 응답 `raid.skins` 목록
- **레이드 모집 창** `raidSheet` (건물 창 틀, 색 `BC.raid`): 드래곤 머리 그림 아이콘, 남은 시간 고리, 참여 인원·보너스(6초마다 `/api/raid`), 보상 칸 3개. '나중에'로 닫아도 위쪽 빨간 칩 `#raidChip`(남은 시간·인원)으로 다시 열림. 🐉 아이콘(game-icons `dragon`)은 빨간 드래곤 얼굴로 새로 그림
- **자리 비움 = 사냥 + 마을 일 반반**: 마을에서 화면을 닫아도 효율 50% 중 절반은 `offlineHuntAway`(사냥 1시간 어림값: 경험치 `huntIdleExp/.7`, 골드 `(1500×레벨+8000)×.55`, 처치 = 경험치 ÷ 그 레벨 사냥터 몬스터 평균 경험치 `fieldMonExp`, 2026-11-19), 절반은 `offlineLife`. 결과 창 경험치도 사냥·마을 일로 나눠 보임. 응답 `away.hunt`

- **집·빌라·나무·포탈 새 그림** (2026-11-18): 배경이 이미 투명한 그림은 town-art.py `keep_rgba`로 그대로 씀
  - 집 4 + 빌라 4: `건물_집.png` · `건물_빌라_리뉴얼.png` + 사용자가 그린 지붕 마스킹(`건물_집_지붕색마스킹.png`, `건물_빌라_지붕색 마스킹.png`, 빨간 칸 = 지붕) → 그 칸만 `house-N-roof`로 떼어 지붕 색을 곱함
  - 나무 5종 새 그림: 밑동이 그림 맨 아래(발 `h * .985`), 그림자는 코드가 그림
  - **사냥터 포탈** `건물_사냥터 포탈.png` → `portal.webp` + 파란 소용돌이 칸만 뗀 `portal-hole.webp` (town-art.py 8번, 칸 위치 `PORTAL_HOLE`). game.html `drawPortal` → `portalSwirl`: 가운데 원판을 돌리고(가장자리는 흐리게 섞음) 나선 빛 줄기 3개 · 빨려 드는 빛 알갱이 · 맥박 빛을 얹은 뒤 소용돌이 모양대로 자름. 문 밖으로 새는 빛 + 떠오르는 알갱이. 크기 `PORTAL_W` 92px, 누르는 범위 `portalBox()`
  - 그림 바깥 라인 정리 도구: `python scripts/img-export/clean-edge.py "원본.png" "저장.png"` (떨어진 점·회색 번짐 지우기, 가장자리 다듬기. 원본은 그대로)
- 소원 분수 쿨타임 10분 → **5분** (`WISH.cd`, 2026-11-18)
- **분수 새 그림** (2026-11-18): `내 디자인/건물_분수.png` → town-art.py 10번 → `fountain.webp` + 물 칸만 뗀 `fountain-water.webp`. game.html `drawFountain0`: 검은 테두리(inkImage) + 물 안에만 물결·반짝임(`FWC`에 그린 뒤 물 칸 모양으로 오림) + 물기둥·물줄기 6개·물방울(`FDROP`). 크기 `FOUNT_W`, 옛 코드 그림은 `drawFountainOld`
- 분수를 빌 수 있으면 머리 위 말풍선 ❗🪙 (`wishBubble`)
- 물고기 그림자 판정 후하게: 거리 1.7 → 2.8칸(`FSHADOW.range`), 찌 자리 + 누른 자리(`q`, 찌에서 5칸 안), 지금·3초 전·6초 전 위치 모두 확인
- **소원 분수 창** (2026-11-18): 건물 창 틀(`bsOpen`, id `fountain`, 색 `BC.fountain`)로 바꿈. 결과 → 분수 상태(남은 시간 막대·지금까지 빈 횟수) → 지금 버프 → 나올 확률 막대(`WISH_TABLE`에서 계산) → 도움말 → 아래 고정 버튼. 쿨타임·버프가 있으면 1초마다 다시 그림
- **나무·바위 고르기 표시** (2026-11-18): 마우스를 올리면 살짝 커지고(`n.hv`, 최대 +9%) 옅은 하늘색 빛, 누르면(그리고 캐는 동안) 둘레에 하늘색 테두리 (`S.hover`, `S.pick`, `nodePicked`, `blitGlow`). 찾기는 `nodeAtW` 하나로 누르기·마우스 같이
  - 건물·집·포탈·분수도 같음 (`hoverAt`, `hoverWrap`, `glowSp`, `picked`): 누른 것은 1.5초 + 그 창이 열려 있는 동안 테두리. 커지는 비율 `HV_UP` (나무·바위 4.5%, 큰 것 2%)
- 가입 화면 '비밀번호는 아무도 볼 수 없어요' 안내 `#pwSafe` (가입 탭에서만). 실제로 비밀번호는 PBKDF2 해시로만 저장되고 기록·로그에도 안 남음 → 관리자도 못 봄 (임시 비밀번호 발급은 새 비밀번호를 만드는 것)

- **가입 안내 동의** (2026-11-18): 가입 탭에 '가입 전에 알아 두세요'(수익 없는 개인 팬 게임 · 패치로 언제든 바뀌거나 초기화 · 혼자 운영해서 미흡할 수 있음) + 필수 체크 `#agree`. 서버 `/api/signup`도 `agree === TERMS_VER`가 아니면 거절, `activity`에 '안내 동의 날짜'로 남김. 안내 내용을 바꾸면 game.html과 index.js의 `TERMS_VER`를 같이 올리기
  - 가입 화면 정리: 규칙은 작은 꼬리표(`.rules.chips`), 비밀번호 보기 눈 버튼(`.eye`), '한 번 더'는 같아요/달라요 표시, 비밀번호 안심 안내는 접기(`details#pwSafe`), 다 채우기 전엔 가입 버튼 흐리게(`.wait`)

### 오우거 레이드 (30분마다) — 2026-11-18
- 레이드가 **30분마다**: 정각 = 레드 드래곤, 30분 = 👹 오우거 (`RAID.every` 1800초, `raidBossOf(start)`, `RAID_BOSS[id]` = {n, obj, i, set, at}). 관리자가 연 레이드는 `{boss}`로 고른 보스
  - 서버 raid.js가 레이드마다 `boss`를 저장, `/state`는 `boss`(모집 중)·`rboss`(진행 중), `/api/raid/join`·`claim`도 `boss`를 줌. 보상 스킨은 그 보스 세트에서
- 오우거 공격 (`raidPattern(start, 'ogre')`): 💥 내려찍기 slam(큰 원 1~2개) · 🪨 바위 던지기 rock(작은 원 3~5개, 손에서 포물선으로 날아옴) · 몽둥이 휘두르기 swing(앞쪽 부채꼴 `OGRE_SWING`) · 포효. 피해 `RAID_HIT`
- 그림: `내 디자인/오우거_다리·몸통·오른팔·왼팔·머리.png` + `배경_오우거.png` → town-art.py 9번 → `og-leg/body/rarm/larm/head.webp`(절반 크기), `ogre-bg.webp`, meta `ogre`(판 좌표). game.html `drawOgre` (`OPART`, 오른팔은 어깨 `OSHOULDER` 기준으로 공격 예고 동안 치켜들고 칠 때 내려침, 예고 중 눈이 붉게). 배경 화로 불빛·불티는 `ogreAmbient`
- 오우거 스킨 (템플릿 `char/hat_guide_오우거.png`, `char/suit-front_guide_오우거.png`, `weapon/*_guide_오우거.png`) → `og-hat/suit/sword/bow/staff.webp`, meta `og` → game.html `OGS`. id는 모두 `ogre` (HATS·SUITS·WSKINS, `raid: 'ogre'`)
- 오우거 눈 스킨 `eye:ogre` 추가 (레이드 세트 6부위)
- 스킨샵 레이드 탭은 보스별로 나눠 보임. 치트 탭: '👕 모든 스킨 받기' + '⭐ 레이드 스킨 최고 레벨'(`rskmax`: 모든 레이드 스킨 Lv10)

### 마법소녀 스킨 세트 — 2026-11-18
- 템플릿 틀(`char/hat·suit-front·eyes_guide_마법소녀.png`, `weapon/sword·bow·staff_guide_마법소녀.png`) → town-art.py `tpl_set('마법소녀', 'mg')` → `mg-*.webp`, meta `mg` → game.html `MGS`
- 스킨샵에서 팖 (id 모두 `magic`): 💗 마법소녀 왕관 25,000 · 반짝 마법 눈 15,000 · 드레스 30,000 · 하트 날개 검/꽃 날개 활/달빛 요술봉 각 20,000
- 모자를 써도 헤어 보이기 체크 (캐릭터창 → 스킨 → 모자 위, 기본 켬): `characters.hat_hair`(`0014_hat_hair.sql`), 화면 `me.hatHair`, 서버 `/api/character {hatHair}`, town.js `lookRow`
- 서 있을 때 활·지팡이를 바깥으로 기울여 듦 (drawChar `tilt`: 활 .8 · 지팡이 .75, 공격할 땐 예전 그대로)
- **스킨샵 값 평균화** (2026-11-18): 파는 스킨은 모두 10,000 이상. 10k ≈ 효과 3점 · 15k ≈ 4점 · 20k ≈ 5점 · 25k ≈ 6점 · 30k ≈ 7점 (공격·경험치·골드·체력·방어 1% = 1점, 치명타 1%p = 1.5점, 생활 효과는 절반). 새 스킨도 이 표대로
- 템플릿 세트 그림은 `TSK = {스킨 id: [그림 앞글자, 위치표]}` 하나로 모자·의상·눈·무기 모두 그림 (새 세트는 여기에 한 줄 + ART_N). 헤어는 '모자를 써도 헤어 보이기' 체크로만 정함 (`HAT_NOHAIR`는 비워 둠, 마법소녀 왕관도 체크가 켜져 있으면 헤어가 보임)
- 그림 눈은 깜빡일 때 같은 그림을 위아래로 납작하게 (기본 눈으로 바뀌지 않게)

### 점프 · Z 공격 (PC 키) — 2026-11-18
- **C 점프**, 공중에서 C 한 번 더 = **더블 점프**. 화살표를 누른 채 C면 그쪽으로 뜀 (공중 속도 `JUMP.air` 1.3배). 숫자 `JUMP = {v1, v2, g, air}` (game.html)
  - 높이 `c.jz`, 횟수 `c.jn`, `jumpTick`(update 맨 앞, 마을·사냥터·레이드 모두). drawChar가 jz만큼 올려 그리고 그림자는 바닥에 작게, 이름표도 같이 올라감
  - **더블 점프 중(`c.jfly`)에는 건물·나무·물을 넘어감** (지도 안에서만, `inScene`). 그리기 순서도 건물보다 앞. 막힌 곳에 내리면 가장 가까운 빈 곳으로 (`jumpTick`)
  - 실시간 `{t:'jmp', n}` (town.js, 0.12초에 1번). 날고 있는 사람의 `go`는 길 찾기 없이 일직선 (`netMove`)
- **Z 공격**: 마을은 바라보는 방향(`me.fdir`, 화살표·걷는 방향. `me.face`는 얼굴색이라 쓰면 안 됨)으로 검 베기 자국 · 화살 · 마법 구슬 (`townAtk`, `TATK`, `drawTownAtk`, 보여 주기만). 실시간 `{t:'atk', a}` (0.28초에 1번)
  - 사냥터(`huntZ`): 가장 가까운 몬스터를 목표로 → 쿨타임 찬 스킬이 있으면 스킬 칸 순서대로 → 없으면 바로 기본 공격 (공격 간격의 55%가 지나야), 멀면 다가감. 꾹 누르면 계속. 레이드에서는 안 씀
  - 서버 사냥 계산은 그대로 (화면 전투는 보여 주기)
- 휴대폰에는 아직 점프·공격 버튼 없음
- **벌목·채광 손맛** (2026-11-18): 0.5초 박자(`CHOP`, 첫 타 0.35초)에 맞춰 천천히 들었다 팍 내려찍음 (`chopPose` → `me.toolW`). 타격 순간(`chopHit`): 소리 · 아주 작은 화면 흔들림(`S.tshake`, render의 `tk`) · 맞은 자리 번쩍 + 나무 부스러기·잎 / 돌가루·불꽃 (`TP`, `drawTP`) · 나무/바위가 툭 흔들림(`n.hitAt`)
- **움직임 기록 · 재생** (2026-11-18, 예측 방식은 순간이동이 생겨서 버림): 마을에서 내 실제 자리 + 점프 높이 + 건물 위 여부를 0.1초마다 적어 0.25초마다 `{t:'mv', p:[[시각ms, x, y, 높이, 1/0], …]}`로 보냄 (`netTrack`, 바닥 누르기·화살표·점프 모두). 걸어가기 시작할 때의 'go'는 더 안 보냄 (순간 이동 `netGo`만)
  - 다른 화면은 `netRecv`로 상대 시계를 맞춰 `p.buf`에 쌓고 `netPlay`가 **`NET_DELAY` 450ms 늦게** 기록 사이를 이어 그림 (예측 없음, 기록이 끊기면 그 자리에서 기다림). 점프도 기록된 높이 그대로 (`jmp` 메시지는 더 안 보냄)
  - town.js `mv`: 8개까지, 마지막 자리를 기억. 속도 제한 1초 10개(순간 20개)
  - 시험: 같은 컴퓨터에서 node로 움직이는 사람을 보내 보니 늘 0.13~0.44초어치 기록이 미리 와 있었고 끊김 없음
- **창 키보드 조작** (PC): 창(`#modal`)이 열려 있으면 화살표 = 그쪽에서 가장 가까운 버튼(테두리끼리 거리, 비슷하면 화면 순서가 앞인 것. 없으면 순서대로), Enter·스페이스바 = 누르기. 누를 수 있는 것 = 버튼·링크·입력칸 + `cursor: pointer`인 칸 (`uikList`), ✕ 닫기 버튼은 빼기(Esc로 닫음). 고른 것에 진짜 포커스를 옮김(`uikMark`, 테두리는 :focus-visible 하나만, 마우스로 누른 것에서도 이어짐). 창이 다시 그려져도 같은 것을 찾아 이어감(`uikSig`, MutationObserver). 마우스를 움직이면 표시 지움
- **스페이스바** (PC): 가까운 것(1.7칸 안)을 이용 (`spaceTarget` → 고른 대상의 `go()`를 바로 실행. 예전처럼 클릭 판정에 다시 넘기면 앞에 선 주민이 대신 걸렸음). 바라보는 쪽(`me.fdir`)은 14px 가깝게, 등 뒤는 멀게 침. 실행될 대상 위에 작은 'Space' 표시(`drawSpaceHint`, 이름표보다 위, 0.15초마다 다시 고름). 알바·자동 중에는 클릭과 같은 규칙(`tap`). 주민·건물·집·나무·바위·물·분수·포탈·벤치·텃밭·표지판·전광판, 집 안에서는 문
- 가이드(`GUIDE()` 처음 시작)와 시작 안내 '조작' 탭에 C·Z 설명

### 게임 안 확인 창 · 닉네임 바꾸기 — 2026-11-18 배포
- **브라우저 기본 확인 창(confirm) 안 씀** → `await ask('내용', { title, ok, no, danger })` (game.html `closeModal` 바로 위, `.askbox`·`.ask-card`). ← → 고르기, Enter·스페이스바 누르기, Esc·바깥 누르기 = 취소. 새로 확인이 필요하면 꼭 이걸로 (부르는 함수는 async)
- **닉네임 바꾸기**: 왼쪽 캐릭터창 이름 옆 ✏️ (`#nickBtn`, `openNick`) → 새 닉네임 입력(가입과 같은 규칙 꼬리표) → `ask`로 "정말 바꿀 거예요?" → 서버 `/api/nick`
  - **일주일에 한 번** (`users.nick_at`, `migrations/0015_nick_at.sql`, `NICK_GAP`). 기다리는 중이면 창에 다음 날짜가 보임. `/api/me`의 `nickAt`
  - 닉네임이 로그인 아이디라서 **다음 로그인부터 새 닉네임**으로 (비밀번호 그대로). '김치복'은 관리자만, 금칙어·겹침 확인은 가입과 같음. `activity`에 `nick` (예전 → 새)
  - 마을: `toRooms({act:'nick'})` → town.js가 `a.n`을 바꾸고 `{t:'nick', id, n}` → 다른 사람 화면 이름표 바로 바뀜. 랭킹 기억(`RANK_MEM`) 비움

### 자리 비움 줄임 — 2026-11-19 배포
- 화면을 닫은 동안 최대 8 → **4시간** (`HUNT.offlineMax`), **경험치만 효율 10%** (`HUNT.offlineExp`, 골드·자원은 `offlineEff` 50% 그대로). 경험치 배율 `OFF_XP()` = .1/.5 → `offlineLife`·`offlineHuntAway`, hunt.js `settle`은 닫은 몫(`offLeft`)을 먼저 계산하며 `reward(…, xm)`
- 시험(4시간 비움): Lv10 +5업 · Lv23 +2업 · Lv40 +1업 (예전 8시간·50%: 19 · 16 · 12업)
- 자리 비움 창의 효율·최대 시간 설명은 글 대신 **i 아이콘** (`itip(설명)` → 누르면 창 밖에 말풍선 `.itip-pop`, `itipShow`). 다른 곳에도 긴 설명은 이걸로
- 굴뚝 연기 (2026-11-19): 카페·대장간·벌목소·낚시점·스킨샵. `CHIMNEY[건물 id] = [그림 x 비율, y 비율, 색]` (그림을 바꾸면 굴뚝 구멍 자리를 다시 재기), `drawSmoke`(부드러운 연기 덩이 11개가 올라가며 커지고 바람에 흩어짐), 그림 자리 `bImgRect`
- ~~타운 집 자리 규칙~~ → 아래 치복동으로 바뀜
- 더블 점프 `JUMP.v2` 390 · 공중 속도 `air2` 1.65 (2026-11-19, 조금 낮고 멀리)
- 마을회관 '다음 단계' 옆 i 아이콘 = 모든 집 단계 금액 (`houseTierTip`)
- 건물 9곳 + 텃밭 새 그림 (2026-11-19, 배경 투명) → town-art.py 1·2번이 `keep_rgba`로 읽음. 텃밭 그림은 예전과 같은 픽셀이라 고랑 위치 그대로

### 치복동 · 무한의 탑 · 김치볶음밥 전문점 — 2026-11-19 배포
- **새 건물 2곳 (내용은 "준비 중")**: 🗼 무한의 탑 `tower` (69,24, 사냥터 포탈 위쪽) · 🍳 김치볶음밥 전문점 `kfr` (52,29, 스킨샵과 대장간 사이). `BUILDINGS`에 `soon: 1` → `openBuilding`이 `soonSheet`(글은 `SOON`). 그림 `b-tower`, `b-kfr` (town-art.py 1번). 탑 그림 배율 `BSC.tower` .62
  - game-map.js **11번**(맨 마지막)에서 추가 + 길 2개. 사냥터 포탈은 (74, 37.6)으로 옮김 (`PORTAL`, `BACK`)
- **치복동 A동** (`assets/js/game-dong.js`, 46×34칸, 화면·서버 같이 씀): 집은 이제 여기에만 지음. 서쪽 숲, 북동쪽 호수 공원(`LAKE`, 벤치 `DBENCH`), 남쪽 가운데 타운으로 가는 포탈 `DGATE`. 꾸밈 나무 `DTREES`(못 캠, 집 아래 깔리면 `off`)
  - 집 자리 `canHouseD`: 붙여 짓기 OK, 나무 위 OK. 공원·길·물가·포탈 앞마당·가장자리 X
  - 타운 쪽 입구: 🏡 치복동 포탈 `DPORTAL` (41.4, 47.4, 그림 `A동 포탈.png` → town-art.py 12번 `dportal` + 소용돌이 `dportal-hole`)
  - 화면: `me.room` = 0 타운 · **-1 치복동(`DONG`)** · 양수 = 그 사람 집 안. `sceneOf`, `DONGS`(길 막힘 = `dSolid` + 집 `HB`), `renderDong`, `enterDong`, `toTown`, `useGate`/`drawGate`(`GATE_T` 타운 → 치복동, `GATE_D` 치복동 → 타운). 치복동 바닥은 처음 들어갈 때 그림 (`dongPaint`)
  - `paintGround(step, M)`: M = `MAP_T`(타운) / `MAP_D`(치복동). 무늬 개수는 넓이에 맞춰 `AK`배 (안 그러면 작은 지도가 빽빽하고 지저분함)
  - 치복동은 지도가 작아서 확대 하한을 둠 (지도 밖이 안 보이게)
  - 마을회관 → 자리 고르기 → 치복동 지도가 열리며 고름 (`startPlace`). 타운에서는 집을 안 그림
  - 서버: `/api/house/build`가 `canHouseD`. 예전 타운 집(`life.house.d` 없음)은 처음 한 번 **무료**로 다시 놓음 → `d: 1`. town.js `room`은 -1 허용
  - 배포 때 원격 `houses` 표에서 김치복 집(타운에 있던 유일한 집)을 지움. 집 단계(`life.house.lv`)는 그대로라 무료로 다시 놓으면 됨
- 주의: 한 줄에 주석을 붙일 때 그 뒤 코드까지 주석이 되지 않게 (2026-11-19 `g.scale(GK, GK)`가 주석 뒤로 밀려 바닥이 작게 그려진 적 있음)

### 다음: 4-2단계
- 집 안 가구 사기·놓기·옮기기, 도감
- 다 지은 공동 건설(꽃밭·등대 등)을 지도에 그림으로 보여 주기

## 남은 일 / 확인할 것
- **실제 생방송 때 확인하기**: 2026-11-14(토) 밤 9시 방송이 첫 실전 테스트
  - "방송 중" 표시가 1분 안에 뜨는지
  - 푸시 알림이 오는지
  - 안 되면 확인할 곳:
    - `https://kimchibok-live.kimchibok.workers.dev/live` 응답
    - Cloudflare 대시보드 → Workers → kimchibok-live → 로그
- 이후 요청은 사용자에게 받기 (모드 URL 추가, 디자인 수정 등)
