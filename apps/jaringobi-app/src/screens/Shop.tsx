import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ACC_FILES_BY_SUB, ACC_SUBS, AccSub,
  REMODEL_FILES, REMODEL_SUBS, RemodelSub,
  SHOP_ALL, SHOP_GROUPS, ShopCategory, priceFor,
} from '../lib/data';
import { BackButton } from '../components/UI';
import { RoomPreview } from '../components/RoomPreview';
import { useUser } from '../lib/userState';
import { useEscape } from '../lib/useEscape';

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
  const [accSub, setAccSub] = useState<AccSub>('모자');
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [purchased, setPurchased] = useState<string | null>(null);

  const selectedPrice = selected ? priceFor(selected) : 0;
  const selectedOwned = !!selected && u.owned.includes(selected);
  const showBuyCta = !!selected && !selectedOwned;
  const canAfford = u.coins >= selectedPrice;

  const items = useMemo(() => {
    if (cat === '전체') return SHOP_ALL;
    if (cat === '리모델링') return REMODEL_FILES[remodelSub];
    if (cat === '사치품') return ACC_FILES_BY_SUB[accSub];
    return SHOP_GROUPS[cat];
  }, [cat, remodelSub, accSub]);

  // 점진 로드: 카테고리/서브가 바뀔 때 30개부터, 스크롤이 하단 근처 도달하면 30개씩 추가
  const [visible, setVisible] = useState(CHUNK);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setVisible(CHUNK); }, [cat, remodelSub, accSub]);

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

  useEscape(confirmBuy, () => setConfirmBuy(false));

  // 구매 완료 토스트 — 3초 후 자동 사라짐
  useEffect(() => {
    if (!purchased) return;
    const t = setTimeout(() => setPurchased(null), 3000);
    return () => clearTimeout(t);
  }, [purchased]);

  return (
    <main className="min-h-full pb-10 bg-bg">
      {/* 상단 고정 영역: 헤더 + 미리보기 + 카테고리 (+ 리모델링 서브) */}
      <div className="sticky top-0 z-10 bg-bg pb-2">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-6 pb-2">
          <BackButton className="w-14 h-14 grid place-items-center text-text/80 -ml-1" fallback="/main" />
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
          className="mx-auto w-[60%] max-w-[260px]"
        />

        <div className="px-5 mt-3 grid grid-cols-4 gap-2.5">
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

        {cat === '사치품' && (
          <div className="px-5 mt-2 grid grid-cols-3 gap-2">
            {ACC_SUBS.map((s) => {
              const active = s === accSub;
              return (
                <button
                  key={s}
                  onClick={() => setAccSub(s)}
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

        {/* 미보유 아이템 미리보기 시 구매 CTA (sticky 영역 안쪽 - 항상 상단에 노출) */}
        {showBuyCta && (
          <div className="px-5 mt-3 flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <CoinIcon size={18} />
              <span className="text-[16px] font-bold text-text">{selectedPrice.toLocaleString()}P</span>
              {!canAfford && (
                <span className="text-[12px] text-pink font-bold">코인 부족</span>
              )}
            </div>
            <button
              onClick={() => canAfford && setConfirmBuy(true)}
              disabled={!canAfford}
              className={`px-5 py-2 rounded-full text-[14px] font-bold transition ${
                canAfford ? 'bg-accent text-white active:scale-[.98]' : 'bg-text/20 text-text/50'
              }`}
            >
              구매하기
            </button>
            <button
              onClick={() => setSelected(null)}
              aria-label="미리보기 닫기"
              className="w-8 h-8 grid place-items-center text-text/60 text-[20px]"
            >×</button>
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
              onClick={() => setSelected(src)}
              className={`relative rounded-xl overflow-hidden transition-colors ${
                isSelected ? 'bg-text/25' : 'bg-white/70'
              }`}
            >
              {!owned && price > 0 && (
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

      {/* 구매 확인 모달 */}
      {confirmBuy && selected && (
        <div
          className="fixed inset-0 z-30 bg-black/45 grid place-items-center px-7"
          onClick={() => setConfirmBuy(false)}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-bold text-text">이 아이템을 구매하시겠어요?</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <CoinIcon size={22} />
              <span className="text-[20px] font-bold text-text">−{selectedPrice.toLocaleString()}P</span>
            </div>
            <div className="mt-4 bg-white rounded-2xl px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text/55">현재 보유</span>
                <span className="font-bold text-text text-[15px]">{u.coins.toLocaleString()}P</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[13px]">
                <span className="text-text/55">구매 후 잔액</span>
                <span className="font-bold text-accent text-[15px]">
                  {(u.coins - selectedPrice).toLocaleString()}P
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmBuy(false)}
                className="flex-1 bg-primary/70 text-text font-bold rounded-2xl py-3 active:scale-[.98]"
              >취소</button>
              <button
                onClick={() => {
                  if (u.buy(selected, selectedPrice)) {
                    setPurchased(selected);
                  }
                  setConfirmBuy(false);
                }}
                className="flex-1 bg-accent text-white font-bold rounded-2xl py-3 active:scale-[.98]"
              >구매</button>
            </div>
          </div>
        </div>
      )}

      {/* 구매 완료 토스트 */}
      {purchased && (
        <div
          className="fixed inset-x-0 bottom-8 z-40 grid place-items-center pointer-events-none"
          aria-live="polite"
        >
          <div className="pointer-events-auto bg-text/90 text-bg rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[300px]">
            <img src={purchased} alt="" className="w-10 h-10 object-contain bg-white/15 rounded-lg" onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold">획득! 옷장에서 입어보세요</p>
            </div>
            <Link
              to="/wardrobe"
              onClick={() => setPurchased(null)}
              className="text-[12px] font-bold bg-accent text-white px-2.5 py-1 rounded-full whitespace-nowrap"
            >옷장</Link>
            <button
              onClick={() => setPurchased(null)}
              aria-label="닫기"
              className="text-bg/70 text-[16px] leading-none w-5 h-5 grid place-items-center"
            >×</button>
          </div>
        </div>
      )}
    </main>
  );
}
