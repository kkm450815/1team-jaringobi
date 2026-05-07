// 메인 화면 상단의 공지/이벤트 배너.
// 활성 공지가 있으면 첫 번째를 표시. 사용자는 닫을 수 있고, 닫은 공지 ID 는
// localStorage 에 저장돼 재표시되지 않음 (admin 이 공지를 새로 만들면 다시 노출).

import { useEffect, useState } from 'react';
import { Announcement } from '../lib/announcementsRepo';
import { useActiveAnnouncements } from '../lib/useAnnouncements';

const DISMISSED_KEY = 'jaringobi.announcements.dismissed.v1';

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function dismiss(id: string) {
  const next = readDismissed();
  next.add(id);
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  } catch { /* ignore */ }
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function AnnouncementBanner() {
  const list = useActiveAnnouncements();
  const [dismissed, setDismissed] = useState<Set<string>>(() => readDismissed());

  // 새 공지 도착 시 dismissed 갱신 트리거 — list 변경 useEffect 가 처리.
  useEffect(() => {
    setDismissed(readDismissed());
  }, [list]);

  if (!list || list.length === 0) return null;

  // dismissed 가 아닌 첫 번째 공지
  const visible = list.find((a) => !dismissed.has(a.id));
  if (!visible) return null;

  function close(a: Announcement) {
    dismiss(a.id);
    setDismissed((prev) => new Set(prev).add(a.id));
  }

  const bg = /^#[0-9a-fA-F]{6}$/.test(visible.bgColor) ? visible.bgColor : '#FCE0BF';
  const link = visible.linkUrl;
  const label = visible.linkLabel || '자세히 보기';

  return (
    <div className="px-5 mt-2">
      <div
        className="rounded-xl px-4 py-3 shadow-soft relative"
        style={{ background: bg }}
      >
        <button
          onClick={() => close(visible)}
          aria-label="공지 닫기"
          className="absolute right-2 top-2 w-7 h-7 grid place-items-center text-text/55 hover:text-text"
        >
          ✕
        </button>
        <p className="font-bold text-[14px] text-text pr-7 leading-tight">{visible.title}</p>
        {visible.body && (
          <p className="mt-1 text-[12px] text-text/75 leading-relaxed whitespace-pre-wrap pr-2">
            {visible.body}
          </p>
        )}
        {link && (
          <div className="mt-2">
            {isExternalUrl(link) ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[12px] font-bold text-accent underline"
              >
                {label} ↗
              </a>
            ) : (
              <a
                href={link}
                className="inline-block text-[12px] font-bold text-accent underline"
              >
                {label}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
