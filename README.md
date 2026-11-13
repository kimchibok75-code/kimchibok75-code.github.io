# 김치복 홈페이지

림월드 유튜버 **김치복** 공식 홈페이지. 서버 없이 **GitHub Pages(무료)** 에 올리고, **GitHub Actions** 가 주기적으로 데이터를 긁어와 자동으로 갱신합니다.

| 기능 | 데이터 출처 | 자동 갱신 주기 |
|---|---|---|
| 채널 바로가기 (유튜브 3개 · 치지직 · 카페 · 디스코드) | `config/site.json` | – |
| 최신 영상 / 인기 순위 / 쇼츠 / 라이브 | 유튜브 RSS (API 키 불필요) | 30분 |
| 생방송 상태 · 지난 방송 기록 | 치지직 | 5분 |
| 새 영상 · 생방송 시작 푸시 알림 (웹 · 모바일) | OneSignal | 위와 동일 |
| 방송 일정 캘린더 | `data/schedule.json` + 실제 방송 기록 + 업로드 기록 | – |
| 모드 저장소 (검색 · 분류 · 버전 · 정렬) | 구글 시트 + 스팀 | 매일 |
| 주간 모드 순위 TOP 20 | 스팀 창작마당 (최근 7일 인기) | 6시간 |

> GitHub의 예약 실행은 몰릴 때 몇 분~십여 분씩 늦어질 수 있습니다. 생방송 알림도 그만큼 늦게 갈 수 있어요.

---

## 1. 내 컴퓨터에서 미리 보기

[Node.js](https://nodejs.org) 20 이상이 필요합니다.

```bash
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다. 최신 데이터로 다시 받고 싶으면 `npm run update`.

## 2. 인터넷에 올리기 (GitHub Pages)

1. [github.com](https://github.com) 가입 → 오른쪽 위 **+ → New repository** → 이름 예: `kimchibok` → **Public** → Create.
2. [GitHub Desktop](https://desktop.github.com) 설치 → **File → Add local repository** → 이 폴더 선택 → "create a repository" → **Publish repository** (위에서 만든 저장소로). 브랜치 이름은 `main`.
3. 저장소 페이지 → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. **Actions** 탭 → "데이터 자동 갱신 & 배포" → **Run workflow**. 1~2분 뒤 `https://<아이디>.github.io/kimchibok/` 에 사이트가 뜹니다.
5. 그 주소를 `config/site.json` 의 `"siteUrl"` 에 넣고 다시 Publish (알림 아이콘에 쓰임).

> 도메인(예: kimchibok.com)을 쓰려면 Settings → Pages → Custom domain.

## 3. 푸시 알림 켜기 (OneSignal, 무료)

알림은 **방문자가 직접 동의해야만** 받습니다. 사이트의 "알림 받기" 버튼 → 받을 알림(새 영상 / 생방송) 선택 → 동의 체크 → 브라우저 권한 허용 순서입니다. 언제든 같은 화면에서 끌 수 있어요.

1. [onesignal.com](https://onesignal.com) 가입 → **New App** → 플랫폼 **Web** 선택.
2. Integration: **Custom Code**, Site URL에 위 GitHub Pages 주소(예: `https://아이디.github.io`) 입력. 사이트 아이콘은 `assets/img/icon-192.png`.
3. 발급된 **App ID** 를 `config/site.json` → `"onesignal": { "appId": "여기" }` 에 넣기.
4. OneSignal **Settings → Keys & IDs** 에서 **REST API Key** 생성.
5. GitHub 저장소 **Settings → Secrets and variables → Actions → New repository secret** 으로 두 개 추가:
   - `ONESIGNAL_APP_ID` = App ID
   - `ONESIGNAL_REST_API_KEY` = REST API Key
6. 다시 Publish. 이제 새 영상(48시간 이내 업로드)이나 방송 시작이 감지되면, 해당 알림에 동의한 사람에게만 발송됩니다.

**모바일**
- 안드로이드: 크롬에서 바로 알림 가능.
- 아이폰: iOS 16.4 이상, Safari **공유 → 홈 화면에 추가** 후 홈 화면 아이콘으로 열어서 알림을 켜야 합니다. (사이트가 자동으로 안내 문구를 띄워요.)

## 4. 내용 수정하기

### 방송 일정 — `data/schedule.json`
```json
{
  "weekly": [{ "days": [5, 6, 0], "time": "21:00", "title": "정기 생방송", "platform": "chzzk" }],
  "events": [{ "date": "2026-12-24", "time": "20:00", "title": "크리스마스 특별 방송", "note": "합방" }],
  "off": ["2026-11-21"]
}
```
`days`: 0=일 1=월 … 6=토. `off` 는 휴방일. 지난 날짜에는 치지직 다시보기 기록이 자동으로 표시됩니다.

### 모드 추가
- **구글 시트**에 추가하면 → 매일 자동 반영 (시트 형식: 이름 / 설명 / 버전 / 링크 열 그대로).
- 시트 말고 사이트에만 넣고 싶으면:
  ```bash
  node scripts/add-mod.mjs "https://steamcommunity.com/sharedfiles/filedetails/?id=1234" "한 줄 설명" 필수
  ```
  카테고리를 생략하면 **추천** 탭에 들어갑니다. 이름 · 썸네일 · 구독자 수 · 지원 버전은 스팀에서 자동으로 가져와요.
  삭제: `node scripts/add-mod.mjs --remove "<링크>"`

### 링크 · 문구 — `config/site.json`
채널 주소, 카페 · 디스코드 링크, 소개 문구 등.

## 파일 구조

```
index.html               페이지
assets/css/style.css     디자인 (글래스모피즘, 다크/라이트)
assets/js/app.js         화면 동작
config/site.json         링크 · 채널 · 알림 설정
data/*.json              자동으로 갱신되는 데이터 (직접 수정은 schedule.json 만)
scripts/update.mjs       데이터 수집 + 알림 발송
scripts/sheet.mjs        구글 시트 → 모드 목록
scripts/add-mod.mjs      모드 직접 추가
.github/workflows/       자동 갱신 · 배포 예약 작업
```

선택: `STEAM_API_KEY` 시크릿을 넣으면 주간 순위를 스팀 공식 API로 가져옵니다(없어도 동작).
