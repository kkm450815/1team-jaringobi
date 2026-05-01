import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  REMODEL_FILES, REMODEL_SUBS, RemodelSub,
  SHOP_ALL, SHOP_GROUPS, ShopCategory, priceFor,
} from '../lib/data';
import { RoomPreview } from '../components/RoomPreview';
import { useUser } from '../lib/userState';

const CATS: ShopCategory[] = ['전체', '사치품', '티셔츠', '리모델링'];
const CHUNK = 30;

function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-grid place-items-center rounded-full text-text font-black"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.55,
        background: 'radial-gradient(circle at 35% 30%, #FFD56A 0%, #E8AB2A 70%)',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18)',
      }}
      aria-hidden
    >
      ★
    </span>
  );
}

export default function Shop() {
  const u = useUser();
  const [cat, setCat] = useState<ShopCategory>('전체');
  const [remodelSub, setRemodelSub] = useState<RemodelSub>('조명');
  const [selected, setSelected] = useState<string | null>(null);

  const items = useMemo(() => {
    if (cat === '전체') return SHOP_ALL;
    if (cat === '리모델링') return REMODEL_FILES[remodelSub];
    return SHOP_GROUPS[cat];
  }, [cat, remodelSub]);

  // 점진 로드: 카테고리/서브가 바뀔 때 30개부터, 스크롤이 하단 근처 도달하면 30개씩 추가
  const [visible, setVisible] = useState(CHUNK);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setVisible(CHUNK); }, [cat, remodelSub]);

  useEffect(() => {
    function check() {
      const el = sentinelRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // 센티넬이 화면 하단 200px 이내로 들어오면 다음 청크 노출
      if (r.top < window.innerHeight + 200) {
        setVisible((v) => (v < items.length ? Math.min(v + CHUNK, items.length) : v));
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    const scroller = document.querySelector('.no-scrollbar');
    scroller?.addEventListener('scroll', check, { passive: true });
    return () => {
      window.removeEventListener('scroll', check);
      scroller?.removeEventListener('scroll', check);
    };
  }, [items.length]);

  return (
    <main className="min-h-full pb-10 bg-bg">
      {/* 상단 고정 영역: 헤더 + 미리보기 + 카테고리 (+ 리모델링 서브) */}
      <div className="sticky top-0 z-10 bg-bg pb-3">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-9 pb-4">
          <Link
            to="/main"
            aria-label="뒤로"
            className="w-11 h-11 grid place-items-center text-[34px] leading-none text-text/80 -ml-1"
          >‹</Link>
          <div className="flex items-center gap-2">
            <CoinIcon size={26} />
            <span className="text-[22px] font-bold text-text">{u.coins}P</span>
          </div>
          <Link to="/wardrobe" aria-label="옷장" className="justify-self-end pr-1">
            <img
              src="/jarin/wardrobe_icon.png"
              alt="옷장"
              className="w-[44px] h-[44px] object-contain"
              draggable={false}
            />
          </Link>
        </header>

        <RoomPreview
          equipped={u.equipped}
          extra={selected ? [selected] : []}
          className="mx-5"
        />

        <div className="px-5 mt-4 grid grid-cols-4 gap-2.5">
          {CATS.map((c) => {
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`py-2 rounded-full text-[15px] font-bold text-center transition-colors ${
                  active ? 'bg-accent text-white' : 'bg-primary/70 text-text/80'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {cat === '리모델링' && (
          <div className="px-5 mt-2 grid grid-cols-5 gap-2">
            {REMODEL_SUBS.map((s) => {
              const active = s === remodelSub;
              return (
                <button
                  key={s}
                  onClick={() => setRemodelSub(s)}
                  className={`py-1.5 rounded-full text-[13px] font-bold text-center transition-colors ${
                    active ? 'bg-accent text-white' : 'bg-primary/40 text-text/70'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 아이템 그리드 (스크롤 대상) */}
      <section className="px-5 mt-3 grid grid-cols-3 gap-2.5">
        {items.slice(0, visible).map((src) => {
          const owned = u.owned.includes(src);
          const isSelected = src === selected;
          const price = priceFor(src);
          return (
            <button
              key={src}
              onClick={() => {
                setSelected(src);
                if (!owned) u.buy(src, price);
              }}
              className={`relative rounded-xl overflow-hidden transition-colors ${
                isSelected ? 'bg-text/25' : 'bg-white/70'
              }`}
            >
              {!owned && (
                <span className="absolute top-1.5 left-1.5 text-text/80" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
              )}
              <div className="aspect-square grid place-items-center px-3 pt-4 pb-2">
                <img
                  src={src}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                  draggable={false}
                  onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                />
              </div>
              <div className="flex items-center justify-center gap-1 pb-2 -mt-1">
                <CoinIcon size={14} />
                <span className="text-[13px] font-bold text-text">{price}P</span>
              </div>
            </button>
          );
        })}
        {visible < items.length && (
          <div
            ref={sentinelRef}
            className="col-span-3 h-12 grid place-items-center text-text/40 text-[12px]"
          >
            더 불러오는 중…
          </div>
        )}
      </section>
    </main>
  );
}
