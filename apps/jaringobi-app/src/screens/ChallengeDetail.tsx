import { useParams } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { MISSIONS } from '../lib/data';

export default function ChallengeDetail() {
  const { id } = useParams();
  const m = MISSIONS.find((x) => x.id === id) ?? MISSIONS[0];

  return (
    <main className="min-h-full pb-12 bg-grid-paper">
      <TopBar back="/challenges" title="" />

      <section className="mx-5">
        <Tag color="accent">{m.category} 절약</Tag>
        <h2 className="font-bold text-[22px] mt-2 leading-tight">{m.title}</h2>
        <div className="flex gap-2 mt-1.5 items-center">
          <Tag color="pink">{m.difficulty}</Tag>
          <span className="text-[13px] text-text/70 font-bold">
            +{m.amount.toLocaleString()}원 절약
          </span>
        </div>

        <p className="mt-4 text-[14px] text-text/85 leading-relaxed">
          {m.intro}
        </p>

        <h3 className="mt-5 font-bold text-[15px]">기대 절약 효과</h3>
        <p className="mt-1 text-[13px] text-text/80 leading-relaxed">
          한 달 기준 약 {(m.amount * 22).toLocaleString()}원의 절약 효과를 기대할 수 있어요.
        </p>

        <h3 className="mt-5 font-bold text-[15px]">실천 팁</h3>
        <ul className="mt-2 space-y-2">
          {m.tips.map((t) => (
            <li key={t} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="text-accent font-bold shrink-0">✔</span>
              <span className="text-text/85">{t}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 font-bold text-[15px]">인증샷 가이드</h3>
        <div className="mt-2 rounded-2xl overflow-hidden bg-white shadow-soft p-4 text-center">
          <p className="text-[13px] text-text/70 mb-3 leading-relaxed">
            {m.authMethod}
          </p>
          <img
            src={`/jarin/chall/ex/chall_eximg_${m.iconKey}.png`}
            alt=""
            className="mx-auto max-h-[180px] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      </section>
    </main>
  );
}
