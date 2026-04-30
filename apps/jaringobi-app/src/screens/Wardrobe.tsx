import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';

const OWNED = [
  { src: '/shop/clothes/clo_shop_01.png', name: '기본 티셔츠', equipped: true },
  { src: '/shop/clothes/clo_shop_02.png', name: '체크 셔츠' },
  { src: '/shop/acc/acc_shop_01.png',     name: '안경' },
  { src: '/shop/acc/acc_shop_02.png',     name: '모자' },
  { src: '/shop/wall_paper/interior_shop_01.png', name: '방 - 베이직' },
  { src: '/shop/lamp/lamp_shop_01.png',   name: '램프' },
];

export default function Wardrobe() {
  const [stars, setStars] = useState<string[]>(['/shop/clothes/clo_shop_01.png']);

  return (
    <main className="min-h-full bg-[#E2EBDD] pb-10">
      <TopBar
        back="/shop"
        title={<>MY <span className="ml-1">👕</span></>}
        right={<Link to="/shop" aria-label="상점으로">🛍</Link>}
      />

      {/* 캐릭터 미리보기 */}
      <section className="mx-5 rounded-2xl bg-bg p-5 shadow-soft grid place-items-center">
        <img src="/jarin/main_character.png" alt="캐릭터" className="h-[180px] object-contain" />
      </section>

      {/* 보유 아이템 */}
      <section className="px-5 mt-4 grid grid-cols-3 gap-2.5">
        {OWNED.map((it) => {
          const star = stars.includes(it.src);
          return (
            <div key={it.src} className="relative aspect-square bg-bg rounded-2xl shadow-soft grid place-items-center">
              <button
                aria-label="즐겨찾기"
                onClick={() =>
                  setStars((s) => (s.includes(it.src) ? s.filter((x) => x !== it.src) : [...s, it.src]))
                }
                className={`absolute top-1.5 left-1.5 text-[16px] ${star ? 'text-pink' : 'text-text/30'}`}
              >★</button>
              <img src={it.src} alt={it.name} className="w-3/4 h-3/4 object-contain" />
              {it.equipped && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                  <Tag color="accent">사용 중</Tag>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
