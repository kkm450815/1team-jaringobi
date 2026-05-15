import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ACC_FILES_BY_SUB, ACC_SUBS, AccSub,
  REMODEL_FILES, REMODEL_SUBS, RemodelSub,
  SHOP_GROUPS, ShopCategory,
} from '../lib/data';
import { BackButton } from '../components/UI';
import { RoomPreview } from '../components/RoomPreview';
import { useUser } from '../lib/userState';
import { useCustomShopItems } from '../lib/useCustomShopItems';
import { playClickSfx } from '../lib/feedback';

const CATS: ShopCategory[] = ['전체', '사치품', '티셔츠', '리모델링'];

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22" height="22" viewBox="0 0 24 24"
      fill={filled ? '#F4C430' : 'none'}
      stroke={filled ? '#D9A91A' : '#514C44'}
      strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
    >
      <polygon points="12 2 15 9 22.5 9.7 17 14.5 18.7 22 12 18 5.3 22 7 14.5 1.5 9.7 9 9" />
    </svg>
  );
}

export default function Wardrobe() {
  const u = useUser();
  const [cat, setCat] = useState<ShopCategory>('전체');
  const [remodelSub, setRemodelSub] = useState<RemodelSub>('조명');
  const [accSub, setAccSub] = useState<AccSub>('모자');

  const ownedSet = useMemo(() => new Set(u.owned), [u.owned]);
  const favoritesSet = useMemo(() => new Set(u.favorites), [u.favorites]);
  const customItems = useCustomShopItems();
  const items = useMemo(() => {
    // 카테고리/서브 필터에 맞는 커스텀 아이템 (관리자가 추가한 항목)
    const customForView = customItems
      .filter((i) => {
        if (cat === '전체') return true;
        if (i.category !== cat) return false;
        if (cat === '리모델링') return i.subCategory === remodelSub;
        if (cat === '사치품') return i.subCategory === accSub;
        return true;
      })
      .map((i) => i.shopImageUrl);

    let pool: string[];
    if (cat === '전체') pool = [...SHOP_GROUPS.사치품, ...SHOP_GROUPS.티셔츠, ...SHOP_GROUPS.리모델링];
    else if (cat === '리모델링') pool = REMODEL_FILES[remodelSub];
    else if (cat === '사치품') pool = ACC_FILES_BY_SUB[accSub];
    else pool = SHOP_GROUPS[cat];
    pool = [...customForView, ...pool];
    const owned = pool.filter((src) => ownedSet.has(src));
    // 즐겨찾기 항목을 맨 앞으로 정렬. 동률 내에서는 원래 순서 유지(stable sort).
    // 별표(즐겨찾기) 는 착용 여부와 별개로 사용자가 명시적으로 토글하는 값.
    return owned.slice().sort((a, b) => Number(favoritesSet.has(b)) - Number(favoritesSet.has(a)));
  }, [cat, remodelSub, accSub, ownedSet, favoritesSet, customItems]);

  return (
    <main className="min-h-full pb-10 bg-bg">
      <div className="sticky top-0 z-10 bg-bg pb-2">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-6 pb-2">
          <BackButton className="w-14 h-14 grid place-items-center text-text/80 -ml-1" fallback="/main" />
          <h1 className="text-[24px] font-bold tracking-[6px] text-text">MY</h1>
          <Link to="/shop" aria-label="상점" className="justify-self-end pr-1">
            <img
              src="/jarin/main_shop.png"
              alt="상점"
              className="w-[44px] h-[44px] object-contain"
              draggable={false}
            />
          </Link>
        </header>

        <RoomPreview equipped={u.equipped} className="mx-auto w-[60%] max-w-[260px]" />

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
      </div>

      {items.length === 0 ? (
        <div className="px-5 mt-10 text-center text-text/55 text-[14px] leading-relaxed">
          아직 보유한 아이템이 없어요.<br />
          상점에서 마음에 드는 아이템을 구매해보세요!
          <div className="mt-4">
            <Link to="/shop" className="inline-block bg-accent text-white text-[14px] font-bold rounded-full px-5 py-2">
              상점으로
            </Link>
          </div>
        </div>
      ) : (
        <section className="px-5 mt-3 grid grid-cols-3 gap-2.5">
          {items.map((src) => {
            const equipped = u.equipped.includes(src);
            const favorited = u.favorites.includes(src);
            return (
              // 별표(즐겨찾기 토글) 와 카드 본체(착용 토글) 가 분리된 히트 영역을 가져야 해서
              // div + 내부 button 두 개로 구성. 별표는 absolute 로 카드 위에 올림.
              <div
                key={src}
                className={`relative rounded-xl overflow-hidden bg-primary/35 transition ${
                  equipped ? 'ring-2 ring-accent' : ''
                }`}
              >
                <button
                  onClick={() => { u.toggleEquip(src); playClickSfx(); }}
                  className="w-full active:scale-[.98] transition-transform"
                  aria-label={equipped ? '벗기' : '입어보기'}
                  aria-pressed={equipped}
                >
                  <div className="aspect-[3/4] grid place-items-center px-3 pt-7 pb-3">
                    <img
                      src={src}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      draggable={false}
                    />
                  </div>
                </button>
                {/* 별표 = 사용자 즐겨찾기 토글 (착용 여부와 무관) */}
                <button
                  onClick={(e) => { e.stopPropagation(); u.toggleFavorite(src); playClickSfx(); }}
                  className="absolute top-1 left-1 w-8 h-8 grid place-items-center rounded-full active:scale-95 transition"
                  aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                  aria-pressed={favorited}
                >
                  <StarIcon filled={favorited} />
                </button>
                {/* 착용 중 뱃지 — 별표 우측 상단. 별표와 헷갈리지 않게 색·문구 명확하게 */}
                {equipped && (
                  <span
                    className="absolute top-1.5 right-1.5 bg-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow"
                    aria-hidden
                  >
                    착용 중
                  </span>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
