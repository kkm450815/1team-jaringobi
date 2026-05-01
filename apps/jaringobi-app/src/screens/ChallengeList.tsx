import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag } from '../components/UI';
import { MISSIONS, MissionCategory } from '../lib/data';

const CATS: MissionCategory[] = ['식비', '여가', '충동', '통장'];

export default function ChallengeList() {
  const [cat, setCat] = useState<MissionCategory>('식비');
  const items = MISSIONS.filter((m) => m.category === cat);

  return (
    <main className="min-h-full pb-12">
      <header className="relative pt-10 pb-4">
        <Link
          to="/main"
          aria-label="뒤로"
          className="absolute left-3 top-8 w-14 h-14 grid place-items-center text-[44px] leading-none text-text/80 font-bold"
        ><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="15 6 9 12 15 18" /></svg></Link>
        <div className="flex flex-col items-center">
          <Link to="/main" aria-label="홈으로">
            <img
              src="/jarin/logo_nobg.png"
              alt=""
              className="w-[96px] h-[96px] object-contain"
              draggable={false}
            />
          </Link>
          <h2 className="mt-1 font-bold text-[18px] text-text">챌린지 정보</h2>
        </div>
      </header>

      <div className="px-5 grid grid-cols-4 gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`py-1.5 rounded-full text-[13px] font-bold text-center transition-colors ${
              cat === c ? 'bg-accent text-white' : 'bg-white text-text/70'
            }`}
          >{c} 절약</button>
        ))}
      </div>

      <ul className="px-5 mt-4 space-y-2.5">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              to={`/challenges/${m.id}`}
              className="flex items-stretch bg-white rounded-2xl shadow-soft overflow-hidden active:scale-[.99] transition"
            >
              <div className="w-20 grid place-items-center bg-bg shrink-0">
                <img
                  src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`}
                  alt=""
                  className="w-12 h-12 object-contain"
                  onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                />
              </div>
              <div className="flex-1 p-3 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[15px] text-text truncate">{m.title}</p>
                  <Tag color="pink">{m.difficulty}</Tag>
                </div>
                <p className="text-[12px] text-text/65 mt-1 line-clamp-2 leading-snug">
                  {m.intro}
                </p>
                <p className="text-[12px] text-accent font-bold mt-1.5">
                  +{m.amount.toLocaleString()}원 · 바로가기 →
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}