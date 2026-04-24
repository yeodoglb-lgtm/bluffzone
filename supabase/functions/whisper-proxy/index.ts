import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await userSupabase.auth.getUser();
    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // multipart/form-data로 오디오 파일 수신
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Whisper API 호출
    // 선택적 prompt (클라이언트에서 'prompt' 필드로 도메인 힌트 전달 가능)
    const clientPrompt = formData.get('prompt');
    // Whisper prompt는 224 토큰 제한 → 오인식률 높은 핵심 용어만 영+한 혼합으로 압축.
    // 숫자 카드(2~9)는 일반어라 힌트 효과가 낮아 제외, 잘 틀리는 영한 포커 고유어 위주.
    const POKER_HINT = `포커 홀덤 Holdem. 프리플랍 Preflop, 플랍 Flop, 턴 Turn, 리버 River, 쇼다운. UTG 유티지 언더더건, MP 엠피, HJ 하이잭, CO 컷오프, BTN 버튼, SB 스몰블라인드, BB 빅블라인드. Ace 에이스, King 킹, Queen 퀸, Jack 잭, Ten 텐, Spade 스페이드, Heart 하트, Diamond 다이아, Club 클럽. AKo AKs 포켓페어 JJ TT. Fold 폴드, Check 체크, Call 콜, Bet 벳, Raise 레이즈, 3벳 쓰리벳, 4벳 포벳, 올인 Allin, 쇼브 Shove, 림프 Limp, 스트래들 Straddle. 씨벳 C-bet, 동크벳 Donk, 블러프 Bluff, 밸류벳, 세미블러프, 체크레이즈. 플레이어 타입: 피쉬 Fish, 호구, 레귤러 Reg, 너트 Nit, 매니악 Maniac, 콜링스테이션, 돈키 Donkey, TAG 태그, LAG 래그, 샤크 Shark, 웨일 Whale. 오버페어, 탑페어, 미들페어, 바텀페어, 셋 Set, 트립스 Trips, 드로우, 거트샷 Gutshot, 양방드로우 OESD, 플러시드로우, 풀하우스, 스트레이트플러시, 포카인드, 넛츠. GTO 지티오, 익스플로잇, 레인지, 에쿼티 Equity, EV 기댓값, SPR, 팟오즈, 이펙티브스택. 팟 Pot, 스택 Stack, 빅블, 만원, 십만원.`;

    const whisperForm = new FormData();
    whisperForm.append('file', audioFile, audioFile.name);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'ko');  // 한국어 고정
    whisperForm.append('prompt', (clientPrompt as string) || POKER_HINT);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? 'Whisper API error');

    // Supabase에 사용량 기록
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from('ai_usages').insert({
      user_id: user.id,
      kind: 'whisper',
      model: 'whisper-1',
      cost_usd: 0.006 * Math.ceil(audioFile.size / (16000 * 2 * 60)), // 근사
    });

    return new Response(JSON.stringify({ text: result.text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('whisper-proxy error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
