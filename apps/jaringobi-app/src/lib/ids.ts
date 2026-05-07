// 모바일 Safari·구버전 브라우저에서 crypto.randomUUID 가 없을 수 있어
// 폴백 포함한 안전한 ID 생성 헬퍼.
export function newId(): string {
  try {
    const c: Crypto | undefined = typeof crypto !== 'undefined' ? crypto : undefined;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    if (c && typeof c.getRandomValues === 'function') {
      const buf = new Uint8Array(16);
      c.getRandomValues(buf);
      // RFC4122 v4 형태
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0'));
      return (
        hex.slice(0, 4).join('') + '-' +
        hex.slice(4, 6).join('') + '-' +
        hex.slice(6, 8).join('') + '-' +
        hex.slice(8, 10).join('') + '-' +
        hex.slice(10, 16).join('')
      );
    }
  } catch {
    /* ignore — fallback 사용 */
  }
  // 최후 폴백 — 충돌 가능성 매우 낮은 timestamp + random
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}
