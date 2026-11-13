// 알림 테스트: GitHub → Actions → "데이터 자동 갱신 & 배포" → Run workflow → "테스트 알림 보내기" 체크
// 주의: 해당 알림(video 또는 live)에 동의한 "모든" 구독자에게 갑니다. 구독자가 많아진 뒤에는 쓰지 마세요.
import { config, sendPush } from './lib.mjs';

const tag = process.argv[2] === 'live' ? 'live' : 'video';
await sendPush({
  tag,
  title: '🔔 김치복 알림 테스트',
  body: tag === 'live' ? '생방송 알림이 잘 도착했어요!' : '새 영상 알림이 잘 도착했어요!',
  url: config.siteUrl || undefined,
});
