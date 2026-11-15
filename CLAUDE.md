# 김치복 홈페이지 — Claude 작업 메모

> 다른 컴퓨터(사무실 등)에서 이어서 작업할 때 Claude가 가장 먼저 읽는 파일입니다.
> 마지막 정리: 2026-11-15 (치복 타운 2단계까지)

## 꼭 지킬 것
- **설명은 항상 쉬운 한국어로.** 영어로 설명하지 않기. 사용자가 해야 할 일은 "1. 어디를 → 2. 무엇을 누르기"처럼 구체적인 순서로 적기.
- 비밀 키(OneSignal REST 키, Cloudflare 토큰 등)는 **절대 채팅에 붙여 넣게 하지 않기**. 필요하면 사용자가 터미널의 숨김 입력(`gh secret set`, `npx wrangler secret put`)으로 직접 넣게 안내.
- 로그인, 인증 코드 입력은 사용자가 직접 함.

## 사이트 개요
- 유튜버 **김치복**(림월드) 공식 홈페이지. 정적 사이트, GitHub Pages로 배포됨.
- 주소: https://kimchibok75-code.github.io
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
- 모드 추천 데이터: 구글 시트 → `scripts/sheet.mjs` → `data/mods.json`
  - 탭 목록은 `config.modSheet.tabs`에 있음: 개요, 김치복제작, 필수, 렉개선, 그래픽, 중세, 모음집, 맵파일.
  - **탭 이름이 틀리면 구글이 조용히 첫 탭(개요)을 돌려줌.** 실제 탭 이름은 시트의 `/htmlview`에서 확인.

## 모드 URL을 받으면 (사용자가 스팀 창작마당 링크만 줌)
묻지 말고 알아서 처리:
1. `node scripts/add-mod.mjs --info "<url>"` 실행 → 제목, 태그, 설명을 확인
2. 한국어 한 줄 설명을 직접 쓰고, 대분류와 소분류를 정함
   - 대분류: 김치복제작 / 필수 / 렉개선 / 그래픽 / 중세 / 모음집 / 맵파일 / 추천
3. `node scripts/add-mod.mjs "<url>" "<설명>" <대분류> "<소분류>"` 실행
4. 커밋 → `git pull -q --rebase --autostash` → `git push`. 배포 확인은 `gh run watch`
- 삭제: `node scripts/add-mod.mjs --remove "<url>"`
- 버전 표시는 1.6과 1.7만 남김 (`app.js`의 `VERSIONS`).

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
- push하기 전에 항상 `git pull --rebase` 하기. 자동 갱신 봇이 data 파일을 자주 커밋함.
  - `data/mods.json`이 충돌하면: `git checkout --theirs data/mods.json` → `node scripts/update.mjs mods` → add → rebase 계속.
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
- 기획서: `plan/웹게임-기획서.md` (v0.6)
  - **팬 마을 + 성장**: 레벨·경험치·골드, 능력치(힘·민첩·지력·운), 장비 5칸(무기·모자·갑옷·신발·장신구) + 등급·강화, 스킨(겉모습만), 사냥터 자동 사냥(4곳 + 보스)
  - 소통은 최소한: 근처·전체 채팅 + 이모트만. **귓속말·친구·선물·거래 없음** (친목 우려). 집은 언제나 모두 공개
  - 건물은 누르면 바로 이용, 대각선 8방향 이동, 이름표는 머리 위, PC 전체화면 버튼
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
  - 잠긴 것: 텃밭·분수·집(4단계). `LATER` 목록으로 잠금 (가게·사냥터는 2단계에서 열림)
  - 방송국·전광판은 실제 방송 상태(kimchibok-live의 `/live`)를 1분마다 읽음
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
- 열린 곳: 사냥터 4곳(자동 사냥), 카페(물약·쉬기), 무기점·방어구점(사기·팔기·일반 장비 한꺼번에 팔기), 대장간(강화·능력치 초기화), 스킨샵. 장비 끼기/빼기
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
- 낚시터(강가 선착장): 순위 3종 + 타이밍 미니게임, 물고기 23종·5등급·길이, 바로 판매, 10초에 한 번. 서버: `/api/fish/cast`, `/api/fish/reel`, `/api/fish/rank`, D1 표 `fishing` (`cast`는 SQL 예약어라 칸 이름은 `bait`)
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
- 무기: 검·단검·망치(힘, 근접) / 지팡이(지력, 원거리 마법) / **활(민첩, 원거리, 화살 없음)**. `WTYPES`의 `st`(능력치), `far`(원거리), `k`(능력치 1당 공격력)
- 밸런스 숫자는 `game-rules.js` 맨 위(`MELEE_K` 등). 서버 `hunt.js`는 원거리면 몬스터가 다가오는 `FAR.lead`초 동안 먼저 때림
- 밸런스 시험: 빌드 5개 × 6번 돌려 55레벨까지 16~17.5시간으로 맞춤 (기획서 3-4)
- 화면 효과(game.html): 맞는 순간 멈칫(`HT.freeze`), 화면 흔들림(`HT.shake`), 넉백·납작해짐, 불꽃(`fxBurst`), 고리, 번쩍 별, 베기 자국, 마법 구슬·화살(`HT.shots`), 숫자 튀어 오르기, 맞으면 화면 가장자리 빨갛게. 캐릭터는 가는 방향을 봄(`dir`)
- 이동: PC는 화살표/WASD, 휴대폰은 화면을 끌면 그 방향으로 계속 걸음 (`STEER`, `steerTick`). 몇 칸마다 한 번만 서버에 알림
- 창을 연 터치가 창 안 버튼까지 누르던 문제: 창이 열린 뒤 0.4초는 누름 무시 (`modalAt`)
- 모든 창 오른쪽 위에 큰 ✕ 버튼(`XBTN`, `openModal`이 자동으로 넣음). 밑의 '닫기·취소' 글자 버튼(`.close`)은 숨김
- 대장간 강화 성공 시 장비 수치·내 전투 수치 전후 비교 (`enhStats`, `charStats`, `diffList`)
- 휴대폰 키보드가 뜰 때 화면 번쩍임: `resize()`가 크기가 바뀔 때만 캔버스를 다시 만들고 바로 그림 + viewport `interactive-widget=resizes-visual`
- 화면 확인 팁: 브라우저 창이 숨겨져 있으면 1초에 1번만 그려짐 → 임시로 `window.__dbg.step()` 같은 걸 넣어 직접 돌려 보고, 끝나면 꼭 지우기

### 3단계 (같이 놀기) — 2026-11-15 배포, 테스트 통과
- 실시간 방: Durable Object **`Town`** (`game-worker/src/town.js`). 채널 `town-1`~`town-3`, 채널마다 50명. 꽉 차면 다음 채널로
  - 주소: `wss://kimchibok-game.kimchibok.workers.dev/ws?ch=1`. 접속 뒤 첫 메시지 `{t:'auth', token}`으로 로그인 확인 (토큰을 주소에 안 넣음)
  - 위치는 **걷기 시작할 때 한 번만** `{t:'go', x, y, tx, ty}` 보냄. 길은 각 화면이 같은 `findPath`로 계산 → 메시지가 아주 적음 (무료 한도 아끼기)
  - 그 밖: `say`(채팅), `emo`(이모트), `look`(겉모습 바뀜 → 서버가 D1에서 다시 읽음), `hunt`(사냥 중이면 마을에서 안 보임)
  - 같은 계정이 또 들어오면 예전 연결은 닫힘(4002). 내보내기 4003
- 채팅 규칙(기획서 8-1)은 전부 서버에서: `chat.js`(글자 수·반복 글자·링크·개인정보·금칙어) + `town.js`(1초 1번, 10초 5번 → 30초 쉼, 같은 말 3번, 새 계정 10분 근처만, 경고 3/6/9번 → 10분/1시간/24시간)
  - 근처 = 9칸 안. 채팅 기록 D1 `chat_log` 30일 보관
- 차단 `/api/block`(D1 `blocks`), 신고 `/api/report`(최근 채팅 20줄 첨부, D1 `reports`). 서로 다른 3명 넘게 신고 → 처리 전까지 근처 대화만
- **관리자 화면**: 설정 → 🛡️ 관리자 화면 (`users.is_admin = 1`인 계정만). 신고함 · 채팅 기록 검색 · 사람 찾기(임시 비밀번호 발급, 채팅 금지, 내보내기, 영구 차단) · 공지
  - 채팅 명령어: `/공지 내용`, `/조용 닉네임 10분`, `/내보내기 닉네임`
  - 현재 관리자: **김치복** 계정(id 13). 닉네임은 정확히 '김치복'만 가입 가능(`OWNER_NICK`), 비슷한 이름은 막힘
  - 관리자 지정: `game-worker` 폴더에서 `npx --yes wrangler@4 d1 execute kimchibok-game --remote --command "UPDATE users SET is_admin = 1 WHERE nick = '닉네임'"`
- 표 추가: `migrations/0005_social.sql` (users.mute_until, chat_log, warnings, blocks, reports)
- 시험 방법: node 스크립트로 두 번째 사람을 만들어 `new WebSocket(url, { headers: { origin } })`로 접속 (node 22 이상)

### 다음: 4단계 (집과 놀거리)
- 집 꾸미기(전체 공개), 텃밭·분수·도감

## 남은 일 / 확인할 것
- **실제 생방송 때 확인하기**: 2026-11-14(토) 밤 9시 방송이 첫 실전 테스트
  - "방송 중" 표시가 1분 안에 뜨는지
  - 푸시 알림이 오는지
  - 안 되면 확인할 곳:
    - `https://kimchibok-live.kimchibok.workers.dev/live` 응답
    - Cloudflare 대시보드 → Workers → kimchibok-live → 로그
- 이후 요청은 사용자에게 받기 (모드 URL 추가, 디자인 수정 등)
