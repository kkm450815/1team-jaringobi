import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { MISSIONS, MissionCategory } from '../lib/data';

const CATS: MissionCategory[] = ['식비', '여가', '충동', '통장'];

export default function ChallengeList() {
  const [cat, setCat] = useState<MissionCategory>('식비');
  const items = MISSIONS.filter((m) => m.category === cat);

  return (
    <main className="min-h-full pb-12">
      <TopBar back="/main" title="챌린지 정보" />

      <div className="px-5 grid grid-cols-4 gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`h-9 rounded-full text-[13px] font-bold flex items-center justify-center transition-colors ${
              cat === c
                ? 'bg-[#FFFFAD] text-[#514C44] shadow-soft'
                : 'bg-white text-text/70'
            }`}
          >{c} 절약</button>
        ))}
      </div>

      <ul className="px-5 mt-4 space-y-2.5">
        {items.map((m) => (
          <li key={m.id}>
            <Link
              to={`/challenges/${m.id}`}
              className="relative flex items-stretch bg-white rounded-2xl shadow-soft overflow-hidden active:scale-[.99] transition"
            >
              <div className="w-24 grid place-items-center bg-[#ABBCA2] shrink-0 rounded-2xl">
                <img
                  src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`}
                  alt=""
                  className="w-[72px] h-[72px] object-contain"
                  onError={(e) => { (e.currentTarget.style.visibility = 'hidden'); }}
                />
              </div>
              <div className="flex-1 p-3 pr-12 min-w-0 relative">
                <p className="font-bold text-[20pt] text-[#514C44] truncate leading-tight">
                  {m.title}
                </p>
                <p className="text-[16pt] text-[#514C44] mt-2 line-clamp-2 leading-snug">
                  {m.intro}
                </p>
              </div>
              <span className="absolute top-3 right-3">
                <Tag color="pink">{m.difficulty}</Tag>
              </span>
              <span className="absolute bottom-3 right-3 text-[#514C44] text-lg font-bold">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
