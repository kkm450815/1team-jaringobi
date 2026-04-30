import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  REMODEL_FILES, REMODEL_SUBS, RemodelSub,
  SHOP_GROUPS, ShopCategory,
} from '../lib/data';
import { RoomPreview } from '../components/RoomPreview';
import { useUser } from '../lib/userState';

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

  const ownedSet = useMemo(() => new Set(u.owned), [u.owned]);
  const items = useMemo(() => {
    let pool: string[];
    if (cat === '전체') pool = [...SHOP_GROUPS.사치품, ...SHOP_GROUPS.티셔츠, ...SHOP_GROUPS.리모델링];
    else if (cat === '리모델링') pool = REMODEL_FILES[remodelSub];
    else pool = SHOP_GROUPS[cat];
    return pool.filter((src) => ownedSet.has(src));
  }, [cat, remodelSub, ownedSet]);

  return (
    <main className="min-h-full pb-10 bg-bg">
      <div className="sticky top-0 z-10 bg-bg pb-3">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 pt-9 pb-3 border-b border-text/10">
          <Link
            to="/main"
            aria-label="뒤로"
            className="w-14 h-14 grid place-items-center text-[48px] leading-none text-text/80 -ml-1"
          >‹</Link>
          <h1 className="text-[24px] font-bold tracking-[6px] text-text">MY</h1>
          <Link to="/shop" aria-label="상점" className="justify-self-end pr-1">
            <img
              src="/jarin/main_shop.png"
              alt="상점"
              className="w-[58px] h-[58px] object-contain"
              draggable={false}
            />
          </Link>
        </header>

        <RoomPreview equipped={u.equipped} className="mx-5 mt-4" />

        <div className="px-5 mt-4 flex gap-2.5 overflow-x-auto no-scrollbar">
          {CATS.map((c) => {
            const active = c === cat;
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-5 py-2 rounded-full text-[15px] font-bold whitespace-nowrap transition-colors ${
                  active ? 'bg-accent text-white' : 'bg-primary/70 text-text/80'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {cat === '리모델링' && (
          <div className="px-5 mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {REMODEL_SUBS.map((s) => {
              const active = s === remodelSub;
              return (
                <button
                  key={s}
                  onClick={() => setRemodelSub(s)}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
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
            return (
              <button
                key={src}
                onClick={() => u.toggleEquip(src)}
                className="relative rounded-xl overflow-hidden bg-primary/35"
              >
                <span className="absolute top-1.5 left-1.5">
                  <StarIcon filled={equipped} />
                </span>
                <div className="aspect-[3/4] grid place-items-center px-3 pt-7 pb-3">
                  <img
                    src={src}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>
              </button>
            );
          })}
        </section>
      )}
    </main>
  );
}
