import { useParams } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { MISSIONS } from '../lib/data';

const PLANS: Record<string, string[]> = {
  default: [
    '집을 나서기 전 도시락 미리 챙기기',
    '편의점 / 카페 동선 피해서 다니기',
    '인증샷은 빈 도시락 + 영수증 OR 매장 외부 컷',
    '하루 끝, 절약한 금액을 자유 적금으로 자동 이체',
  ],
  zero: [
    '아침에 카드/지갑 두고 가볍게 외출하기',
    '점심은 집에 있는 재료로 한 끼 해결',
    '집에서 즐기는 루틴 - 유튜브 요리 영상, 도서관 전자책, 밀린 드라마 등 = 0원',
    '하루 끝, 절약한 금액을 자유 적금으로 자동 이체',
  ],
};

export default function ChallengeDetail() {
  const { id } = useParams();
  const m = MISSIONS.find((x) => x.id === id) ?? MISSIONS[0];
  const plans = PLANS[m.iconKey] ?? PLANS.default;

  return (
    <main className="min-h-full pb-12 bg-grid-paper">
      <TopBar back="/challenges" title="" />

      <section className="mx-5">
        <Tag color="accent">{m.category} 절약</Tag>
        <h2 className="font-bold text-[22px] mt-2 leading-tight">{m.title}</h2>
        <div className="flex gap-1 mt-1.5">
          <Tag color="pink">{m.difficulty}</Tag>
          <span className="text-[12px] text-text/60">+{m.amount.toLocaleString()}원 절약</span>
        </div>

        <img
          src={`/jarin/chall/ex/chall_eximg_${m.iconKey}.png`}
          alt=""
          className="w-full max-h-[220px] object-contain mt-4 mx-auto"
          onError={(e) => (e.currentTarget.style.display = 'none')}
        />

        <h3 className="mt-5 font-bold text-[15px]">기대 절약 효과</h3>
        <p className="mt-1 text-[13px] text-text/80">
          한 달 기준 약 {(m.amount * 22).toLocaleString()}원, 1년이면 {(m.amount * 22 * 12).toLocaleString()}원의 절약 효과를 기대할 수 있어요.
        </p>

        <h3 className="mt-4 font-bold text-[15px]">실천 가이드</h3>
        <ul className="mt-2 space-y-1.5">
          {plans.map((p) => (
            <li key={p} className="flex gap-2 text-[13px]">
              <span className="text-accent font-bold">✔</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 font-bold text-[15px]">인증샷 가이드</h3>
        <div className="mt-2 rounded-2xl overflow-hidden bg-white shadow-soft p-3 text-center text-[12px] text-text/70">
          <p className="mb-2">이런 식으로 찍으면 성공 인증!</p>
          <img
            src={`/jarin/chall/ex/chall_eximg_${m.iconKey}.png`}
            alt=""
            className="mx-auto max-h-[160px] object-contain"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      </section>
    </main>
  );
}
