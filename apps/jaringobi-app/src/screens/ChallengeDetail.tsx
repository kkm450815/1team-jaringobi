import { useParams } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { MISSIONS } from '../lib/data';

export default function ChallengeDetail() {
  const { id } = useParams();
  const m = MISSIONS.find((x) => x.id === id) ?? MISSIONS[0];
  const monthly = m.monthlySaving ?? m.amount * 22;

  return (
    <main className="min-h-full pb-12 bg-grid-paper">
      <TopBar back="/challenges" title="" />

      <section className="mx-5">
        <Tag color="accent">{m.category} 절약</Tag>
        <h2 className="font-bold text-[22px] mt-2 leading-tight">{m.title}</h2>
        <div className="flex items-center gap-2 mt-1.5">
          <Tag color="pink">{m.difficulty}</Tag>
          <span className="text-[12px] text-text/60">+{m.amount.toLocaleString()}원 절약</span>
        </div>

        <p className="mt-3 text-[14px] text-text/80 leading-relaxed">{m.description}</p>

        <img
          src={`/jarin/chall/ex/chall_eximg_${m.iconKey}.png`}
          alt=""
          className="w-full max-h-[220px] object-contain mt-4 mx-auto"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />

        <h3 className="mt-5 font-bold text-[15px]">기대 절약 효과</h3>
        <p className="mt-1 text-[13px] text-text/80">
          한 달 기준 약 {monthly.toLocaleString()}원, 1년이면 {(monthly * 12).toLocaleString()}원의 절약 효과를 기대할 수 있어요.
        </p>

        <h3 className="mt-4 font-bold text-[15px]">실천 팁</h3>
        <ul className="mt-2 space-y-1.5">
          {m.tips.map((tip) => (
            <li key={tip} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="text-accent font-bold flex-shrink-0">✔</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 font-bold text-[15px]">인증 방법</h3>
        <div className="mt-2 rounded-2xl bg-white shadow-soft p-3 text-[13px] text-text/80 leading-relaxed">
          {m.proof}
        </div>
      </section>
    </main>
  );
}
