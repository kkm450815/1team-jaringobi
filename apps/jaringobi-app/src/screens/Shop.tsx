import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ACC_FILES_BY_SUB, ACC_SUBS, AccSub,
  REMODEL_FILES, REMODEL_SUBS, RemodelSub,
  SHOP_ALL, SHOP_GROUPS, ShopCategory, priceFor,
  equipSlotOf,
} from '../lib/data';
import { BackButton } from '../components/UI';
import { RoomPreview } from '../components/RoomPreview';
import { useUser } from '../lib/userState';
import { useEscape } from '../lib/useEscape';
import { useCustomShopItems } from '../lib/useCustomShopItems';
import { playClickSfx, playPurchaseSfx, playDeniedSfx, vibrate } from '../lib/feedback';

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
  // 장바구니 — 미보유 아이템들. equipSlot 당 1개 제한 (티셔츠/모자/안경/소품 등 9슬롯).
  // 같은 슬롯에 다른 아이템을 담으면 이전 것은 자동 제외.
  const [cart, setCart] = useState<string[]>([]);
  const [confirmBuy, setConfirmBuy] = useState(false);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [cartListOpen, setCartListOpen] = useState(false);
  // 이미 보유한 아이템을 시착하려 했을 때 잠깐 띄우는 안내 토스트
  const [ownedToast, setOwnedToast] = useState<string | null>(null);

  const cartTotal = cart.reduce((sum, src) => sum + priceFor(src), 0);
  const canAfford = u.coins >= cartTotal;

  function toggleCart(src: string) {
    if (u.owned.includes(src)) {
      playDeniedSfx();
      setOwnedToast('이미 보유 중 — 옷장에서 입어보세요');
      window.setTimeout(() => setOwnedToast(null), 2000);
      return;
    }
    playClickSfx();
    setCart((prev) => {
      if (prev.includes(src)) return prev.filter((x) => x !== src);
      const slot = equipSlotOf(src);
      const withoutSameSlot = prev.filter((x) => equipSlotOf(x) !== slot);
      return [...withoutSameSlot, src];
    });
  }

  function removeFromCart(src: string) {
    playClickSfx();
    setCart((prev) => prev.filter((x) => x !== src));
  }

  const customItems = useCustomShopItems();

  const items = useMemo(() => {
    // 기존 하드코딩 항목 + 같은 카테고리/서브의 DB 커스텀 항목
    const customForView = customItems
      .filter((i) => {
        if (cat === '전체') return true;
        if (i.category !== cat) return false;
        if (cat === '리모델링') return i.subCategory === remodelSub;
        if (cat === '사치품') return i.subCategory === accSub;
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((i) => i.shopImageUrl);

    let base: string[];
    if (cat === '전체') base = SHOP_ALL;
    else if (cat === '리모델링') base = REMODEL_FILES[remodelSub];
    else if (cat === '사치품') base = ACC_FILES_BY_SUB[accSub];
    else base = SHOP_GROUPS[cat];

    // 커스텀 신상은 위에 노출 (관리자가 의도적으로 추가한 거니)
    return [...customForView, ...base];
  }, [cat, remodelSub, accSub, customItems]);

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
  useEscape(cartListOpen, () => setCartListOpen(false));

  // 구매 완료 토스트 — 3초 후 자동 사라짐
  useEffect(() => {
    if (!purchased) return;
    const t = setTimeout(() => setPurchased(null), 3000);
    return () => clearTimeout(t);
  }, [purchased]);

  // 한 번에 카트 전체 구매 — 각 아이템에 대해 u.buy 호출.
  // 합계가 코인 보다 작으면 모두 성공 (buy 가 functional setState 라 순차 차감 안전).
  function purchaseCart() {
    if (cart.length === 0) return;
    if (!canAfford) {
      playDeniedSfx();
      return;
    }
    let success = 0;
    for (const src of cart) {
      const ok = u.buy(src, priceFor(src));
      if (ok) success++;
    }
    if (success > 0) {
      // 마지막 구매 아이템을 토스트에 노출 (대표)
      setPurchased(cart[cart.length - 1]);
      playPurchaseSfx();
      if (u.settings.vibration) vibrate([20, 30, 20]);
    }
    setCart([]);
    setConfirmBuy(false);
  }

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
          extra={cart}
          className="mx-auto w-[60%] max-w-[260px]"
        />

        <div className="px-5 mt-3 grid grid-cols-4 gap-2.5">
          {CATS.map((c) => {
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => { setCat(c); playClickSfx(); }}
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
                  onClick={() => { setRemodelSub(s); playClickSfx(); }}
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
                  onClick={() => { setAccSub(s); playClickSfx(); }}
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

      {/* 아이템 그리드 (스크롤 대상) — 하단 고정 바 높이 만큼 추가 패딩 */}
      <section
        className="px-5 mt-3 grid grid-cols-3 gap-2.5"
        style={cart.length > 0
          // 카트 바가 차지하는 높이(약 76px) + 카트 바 자체 하단 패딩(16px) + safe-area
          ? { paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))' }
          : undefined}
      >
        {items.slice(0, visible).map((src) => {
          const owned = u.owned.includes(src);
          const inCart = cart.includes(src);
          const price = priceFor(src);
          return (
            <button
              key={src}
              onClick={() => toggleCart(src)}
              className={`relative rounded-xl overflow-hidden transition-colors ${
                inCart ? 'bg-accent/30 ring-2 ring-accent' : owned ? 'bg-white/40' : 'bg-white/70'
              }`}
              aria-pressed={inCart}
            >
              {inCart && (
                <span
                  className="absolute top-1.5 right-1.5 z-10 bg-accent text-white text-[10px] font-bold rounded-full w-5 h-5 grid place-items-center shadow"
                  aria-hidden
                >✓</span>
              )}
              {!owned && price > 0 && !inCart && (
                <span className="absolute top-1.5 left-1.5 text-text/80" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
              )}
              {owned && (
                <span
                  className="absolute top-1.5 left-1.5 z-10 bg-text/70 text-bg text-[9px] font-bold rounded-full px-1.5 py-0.5 shadow"
                  aria-hidden
                >보유</span>
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

      {/* 카트 구매 확인 모달 — 합계/잔액/카트 안 미리보기 */}
      {confirmBuy && cart.length > 0 && (
        <div
          className="fixed inset-0 z-30 bg-black/45 grid place-items-center px-7"
          onClick={() => setConfirmBuy(false)}
        >
          <div
            className="w-full max-w-[320px] bg-bg rounded-3xl p-5 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-bold text-text">담은 {cart.length}개를 구매하시겠어요?</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <CoinIcon size={22} />
              <span className="text-[20px] font-bold text-text">−{cartTotal.toLocaleString()}P</span>
            </div>
            <ul className="mt-3 max-h-[28vh] overflow-y-auto thin-scrollbar grid grid-cols-4 gap-1.5 px-1 py-1">
              {cart.map((src) => (
                <li key={src} className="bg-white rounded-lg aspect-square grid place-items-center">
                  <img src={src} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }} />
                </li>
              ))}
            </ul>
            <div className="mt-4 bg-white rounded-2xl px-4 py-3 shadow-soft">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-text/55">현재 보유</span>
                <span className="font-bold text-text text-[15px]">{u.coins.toLocaleString()}P</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[13px]">
                <span className="text-text/55">구매 후 잔액</span>
                <span className="font-bold text-accent text-[15px]">
                  {(u.coins - cartTotal).toLocaleString()}P
                </span>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmBuy(false)}
                className="flex-1 bg-primary/70 text-text font-bold rounded-2xl py-3 active:scale-[.98]"
              >취소</button>
              <button
                onClick={purchaseCart}
                className="flex-1 bg-accent text-white font-bold rounded-2xl py-3 active:scale-[.98]"
              >구매</button>
            </div>
          </div>
        </div>
      )}

      {/* 장바구니 상세 — 담긴 옷 목록 + 슬롯별 X 제거 */}
      {cartListOpen && cart.length > 0 && (
        <div
          className="fixed inset-0 z-30 bg-black/45 grid place-items-end sm:place-items-center px-4 pb-24"
          onClick={() => setCartListOpen(false)}
        >
          <div
            className="w-full max-w-[360px] bg-bg rounded-3xl p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <p className="text-center font-bold text-[16px] text-text">장바구니 ({cart.length})</p>
              <button
                onClick={() => setCartListOpen(false)}
                aria-label="닫기"
                className="absolute -right-1 -top-1 w-10 h-10 grid place-items-center text-[26px] leading-none text-text/70 font-bold"
              >×</button>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {cart.map((src) => (
                <li key={src} className="relative bg-white rounded-xl aspect-square grid place-items-center p-2 shadow-soft">
                  <img src={src} alt="" className="max-w-full max-h-full object-contain" onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }} />
                  <span className="absolute bottom-1 inset-x-1 text-center text-[11px] font-bold text-text bg-white/85 rounded">
                    {priceFor(src)}P
                  </span>
                  <button
                    onClick={() => removeFromCart(src)}
                    aria-label="장바구니에서 제거"
                    className="absolute -right-1 -top-1 w-7 h-7 grid place-items-center bg-pink text-white text-[16px] font-bold rounded-full shadow"
                  >×</button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between px-1">
              <span className="text-[13px] text-text/60 font-bold">합계</span>
              <div className="flex items-center gap-1.5">
                <CoinIcon size={18} />
                <span className="text-[18px] font-bold text-text">{cartTotal.toLocaleString()}P</span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { playClickSfx(); setCart([]); setCartListOpen(false); }}
                className="px-4 py-3 rounded-2xl text-[14px] font-bold bg-text/10 text-text/70 active:scale-[.98]"
              >
                전체 비우기
              </button>
              <button
                onClick={() => { setCartListOpen(false); setConfirmBuy(true); }}
                disabled={!canAfford}
                className={`flex-1 rounded-2xl py-3 text-[15px] font-bold transition ${
                  canAfford ? 'bg-accent text-white active:scale-[.98]' : 'bg-text/20 text-text/50'
                }`}
              >
                {canAfford ? `${cart.length}개 구매하기` : '코인 부족'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 고정 장바구니 바 — 카트에 1개 이상이면 노출.
          안드로이드 제스처 바·iOS Home Indicator 에 가려지지 않도록 env(safe-area-inset-bottom) 적용 +
          기본 패딩 16px 로 살짝 더 띄움. */}
      {cart.length > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-20 pointer-events-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="mx-auto max-w-[420px] px-3 pb-4 pointer-events-auto">
            <div className="bg-bg/95 backdrop-blur-sm border border-text/10 rounded-2xl shadow-2xl px-3 py-2.5 flex items-center gap-2">
              <button
                onClick={() => setCartListOpen(true)}
                className="flex items-center gap-1.5 px-1 active:scale-[.98]"
                aria-label="장바구니 열기"
              >
                <span className="relative inline-grid place-items-center w-9 h-9 rounded-full bg-accent/15">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
                  </svg>
                  <span className="absolute -top-1 -right-1 bg-pink text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">{cart.length}</span>
                </span>
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <CoinIcon size={16} />
                <span className="text-[15px] font-bold text-text">{cartTotal.toLocaleString()}P</span>
                {!canAfford && (
                  <span className="text-[11px] text-pink font-bold ml-1">코인 부족</span>
                )}
              </div>
              <button
                onClick={() => canAfford && setConfirmBuy(true)}
                disabled={!canAfford}
                className={`px-4 py-2 rounded-full text-[14px] font-bold transition ${
                  canAfford ? 'bg-accent text-white active:scale-[.98]' : 'bg-text/20 text-text/50'
                }`}
              >
                구매
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미 보유 안내 토스트 */}
      {ownedToast && (
        <div className="fixed inset-x-0 bottom-24 z-40 grid place-items-center pointer-events-none" aria-live="polite">
          <div className="pointer-events-auto bg-text/90 text-bg rounded-2xl px-4 py-2 text-[12px] font-bold shadow-2xl">
            {ownedToast}
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
