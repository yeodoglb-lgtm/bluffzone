// 알리고 LMS 테스트 발송 — 본인 폰 1건만
//
// 사용:
//   node scripts/send-sms-test-self.mjs
//
// 환경변수 필요:
//   ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER

const TEST_PHONE = '010-9211-2766';  // 운영자 본인 폰

const API_KEY = process.env.ALIGO_API_KEY;
const USER_ID = process.env.ALIGO_USER_ID;
const SENDER  = process.env.ALIGO_SENDER;

if (!API_KEY || !USER_ID || !SENDER) {
  console.error('❌ 환경변수 누락: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER');
  process.exit(1);
}

const MSG = `[블러프존 매장 등록 안내]

안녕하세요, 사장님!
홀덤 매니저 앱 '블러프존(bluffzone.kr)'입니다.

저희 앱 유저분들께 전국 홀덤 플레이스를
무료로 소개해드리고 있습니다.

귀 매장 등록을 원하시면 아래 링크에서
정보 입력 + 매장 사진 업로드 부탁드립니다.
👉 https://forms.gle/eiAJR4W2AhazaxkW7

소요 시간: 약 1~2분
문의·수신거부: 본 번호로 회신
※ 1회 발송 / 재발송 없음`;

const SUBJECT = '블러프존 매장 등록 안내';

console.log('\n[테스트 발송 — 본인 폰 1건]');
console.log(`발신: ${SENDER}`);
console.log(`수신: ${TEST_PHONE}`);
console.log(`메시지 ${MSG.length}자\n`);

const formData = new URLSearchParams();
formData.append('key', API_KEY);
formData.append('user_id', USER_ID);
formData.append('sender', SENDER.replace(/-/g, ''));
formData.append('receiver', TEST_PHONE.replace(/-/g, ''));
formData.append('msg', MSG);
formData.append('msg_type', 'LMS');
formData.append('title', SUBJECT);
formData.append('testmode_yn', 'N');

try {
  const res = await fetch('https://apis.aligo.in/send/', {
    method: 'POST',
    body: formData,
  });
  const result = await res.json();
  console.log('응답:', JSON.stringify(result, null, 2));

  if (result.result_code === '1' || result.result_code === 1) {
    console.log('\n✅ 발송 성공');
    console.log(`메시지 ID: ${result.msg_id}`);
    console.log(`잔여 건수: ${result.SMS_CNT}/${result.LMS_CNT}/${result.MMS_CNT}`);
    console.log('\n📱 1~2분 안에 폰에 도착해야 정상');
  } else {
    console.log('\n❌ 발송 실패');
    console.log(`코드: ${result.result_code}`);
    console.log(`메시지: ${result.message}`);
  }
} catch (e) {
  console.error('❌ 호출 실패:', e);
}
