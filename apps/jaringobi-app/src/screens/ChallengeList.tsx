import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { MISSIONS, MissionCategory } from '../lib/data';

const CATS: MissionCategory[] = ['식비', '여가', '충동', '통장'];
const TIPS: Record<string, string> = {
  coffee: '매일 4,000원짜리 카페 대신\n집에서 만들어 보세요',
  delivery: '배달앱 켜는 순간\n최소 15,000원은 나가요',
  dinner: '저녁만 바꿔도\n일주일에 4만원이 남아요',
  cvs: '편의점에서도 영양 챙기며\n저렴하게 먹어요',
  receipe: '1인분 3,000원 이하\n레시피로 도전해요',
  library: '돈 내고 배우던 것들을\n무료로 대체해요',
  drink: '술집 한 번 1인 4만원\n집에서 마시면 4,000원',
  culture: '매달 문화생활비\n이번 달은 0원으로',
  hair: '체험단으로 무료 시술\n+ 추가 수입까지',
  leisure: '놀건 놀자\n근데 한 달 5만원 안에서',
  shopping: '장바구니 비우면\n안 사도 되더라',
  taxi: '심야 택시 한 번에\n15,000~30,000원',
  phone: '통신비 한 번만 바꿔도\n매달 절약돼요',
  repair: '버리기 전에\n고쳐서 써봐요',
  friend: '약속 줄이면 교통·식·술\n한꺼번에 줄어요',
  zero: '하루를 0원으로\n생각보다 할 수 있어요',
  carrot: '안 쓰는 물건 5개만\n팔아도 5만원',
  gifticon: '유효기간 지나기 전에\n현금으로 바꿔요',
  save: '지금 당장 5만원을\n봉투에 넣어두세요',
  alba: '짜투리 시간 단기 알바로\n추가 수입 만들기',
};

export default function ChallengeList() {
  const [cat, setCat] = useState<MissionCategory>('식비');
  const items = MISSIONS.filter((m) => m.category === cat);

  return (
    <main className="min-h-full pb-12">
      <TopBar
        back="/main"
        title={
          <Link to="/main" aria-label="홈으로" className="block">
            <img
              src="/jarin/logo_nobg.png"
              alt="자린고비"
              className="h-20 w-auto object-contain"
              draggable={false}
            />
          </Link>
        }
      />

      <div className="px-5 flex gap-2 overflow-x-auto no-scrollbar">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap ${
              cat === c ? 'bg-accent text-[#FFFFAD]' : 'bg-white text-text/70'
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
              <div className="w-28 grid place-items-center bg-accent">
                <img src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`} alt="" className="w-24 h-24 object-contain" />
              </div>
              <div className="flex-1 p-3 flex flex-col min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-[20px] leading-tight">{m.title}</p>
                  <Tag color="pink">{m.difficulty}</Tag>
                </div>
                <p className="text-[16px] font-light text-text/70 mt-2 whitespace-pre-line leading-snug">{TIPS[m.iconKey]}</p>
                <p className="mt-auto self-end text-[28px] text-text/70 font-bold leading-none" aria-label="바로가기">→</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
