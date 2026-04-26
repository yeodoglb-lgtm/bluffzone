// 모든 Supabase read 쿼리에 강제 타임아웃 적용.
// fetch 레벨 타임아웃(supabase.ts)이 supabase-js 내부에서 swallowing되는 경우 대비
// Promise.race로 한 번 더 보장. 타임아웃 도달 시 reject → React Query 재시도 발동.
//
// 사용법:
//   export async function fetchHands(...) {
//     return withTimeout((async () => {
//       const { data, error } = await supabase.from('hands')...
//       if (error) throw error;
//       return data;
//     })(), 15000);
//   }

export function withTimeout<T>(promise: Promise<T>, ms: number = 15000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout (${ms}ms)`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}
