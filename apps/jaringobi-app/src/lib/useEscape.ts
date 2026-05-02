import { useEffect } from 'react';

/**
 * 활성 모달에서 ESC 키로 닫기.
 * @param active - 모달이 열려있을 때만 true (false면 리스너 미등록)
 * @param onClose - ESC 누르면 호출될 콜백
 */
export function useEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, onClose]);
}
