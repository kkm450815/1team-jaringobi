import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { SHOP_ITEMS, PRICES } from '../lib/data';

const CATS = ['전체', '사치품', '티셔츠', '리모델링'] as const;
type Cat = typeof CATS[number];

export default function Shop() {
  const [cat, setCat] = useState<Cat>('전체');
  const [coin] = useState(180);
  const [bought, setBought] = useState<string[]>(['/shop/clothes/clo_shop_01.png']);
  const [preview, setPreview] = useState<string | null>(null);

  const items = useMemo(() => {
    if (cat === '전체') return SHOP_ITEMS.filter((g) => g.category !== '전체').flatMap((g) => g.items);
    return SHOP_ITEMS.find((g) => g.category === cat)?.items ?? [];
  }, [cat]);

  return (
    <main className="min-h-full pb-10 bg-bg">
      <TopBar
        back="/main"
        title={<span className="flex items-center gap-1.5"><span>🪙</span><span>{coin}P</span></span>}
        right={
          <Link to="/wardrobe" aria-label="옷장">
            <img src="/jarin/wardrobe_icon.png" alt="옷장" className="w-7 h-7 object-contain" />
          </Link>
        }
      />

      {/* 미리보기 룸 */}
      <section className="relative mx-5 rounded-2xl overflow-hidden bg-white shadow-soft">
        <img src="/jarin/main_ room.png" alt="미리보기" className="w-full h-auto" />
        {preview && (
          <img
            src={preview}
            alt="미리보기 아이템"
            className="absolute inset-0 m-auto w-1/2 h-1/2 object-contain pointer-events-none"
          />
        )}
      </section>

      {/* 카테고리 탭 */}
      <div className="px-5 mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap ${
              cat === c ? 'bg-accent text-white' : 'bg-white text-text/70'
            }`}
          >{c}</button>
        ))}
      </div>

      {/* 그리드 */}
      <section className="px-5 mt-3 grid grid-cols-3 gap-2.5">
        {items.map((it, i) => {
          const owned = bought.includes(it.src);
          const price = PRICES[i % PRICES.length];
          return (
            <button
              key={it.src + i}
              onClick={() => {
                setPreview(it.src);
                if (!owned) setBought((b) => Math.random() < 0.001 ? b : b); // 데모: 구매 토글은 별도 로직
              }}
              className="relative aspect-square bg-white rounded-2xl shadow-soft overflow-hidden grid place-items-center"
            >
              <img src={it.src} alt="" className="w-3/4 h-3/4 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
              {!owned && (
                <>
                  <div className="absolute inset-0 bg-text/30" />
                  <div className="absolute inset-0 grid place-items-center text-white text-[20px]">🔒</div>
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                    <Tag color="accent">{price}P</Tag>
                  </div>
                </>
              )}
            </button>
          );
        })}
      </section>
    </main>
  );
}
