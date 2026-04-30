import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TopBar, Tag } from '../components/UI';
import { MISSIONS, MissionCategory } from '../lib/data';

const CATS: MissionCategory[] = ['식비', '여가', '충동', '통장'];
const TIPS: Record<string, string> = {
  cvs: '편의점, 한 달이면\n10만원이 우습게 빠집니다',
  coffee: '매일 4,000원짜리 카페 대신\n집에서 만들어 보세요',
  delivery: '배달 앱 켜는 순간\n최소 15,000원은 나가요',
  receipe: '집밥 + 도시락이면\n식비 절반은 줄어들어요',
  dinner: '저녁만 아껴도\n일주일에 4만원이 남아요',
  culture: '문화비 한 달에 두 번이면\n충분합니다',
  drink: '술집 한번 가면 1인 4만원은 기본\n집에서 마시면 4,000원',
  hair: '미용실 한 달만 미루면\n5만원이 절약돼요',
  library: '도서관 = 무료 카페\n+ 무료 헬스장',
  shopping: '충동구매는 24시간 룰\n하루만 참아보세요',
  phone: '약정 만료 후에도 그대로?\n통신비 한 번 점검해보세요',
  taxi: '심야 택시 대신 새벽 첫차\n하루 2만원 절약',
  gifticon: '기프티콘 자제\n쌓이는 게 다 돈입니다',
  save: '잔돈은 무조건 저금통\n티끌 모아 태산',
  carrot: '안 쓰는 물건 = 현금\n당근에 올려보세요',
  alba: '주말 알바 한 번이면\n5만원이 들어와요',
  zero: '하루 무지출 챌린지\n0원의 즐거움',
  repair: '간단 수리는 유튜브로\n수리비 0원',
  friend: '친구찬스 활용하기\n같이 쓰면 절반',
  leisure: '비싼 레저는 다음 달\n이번 달은 무료로',
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
              <div className="w-28 grid place-items-center bg-accent">
                <img src={`/jarin/chall/icon/chall_list_${m.iconKey}.png`} alt="" className="w-24 h-24 object-contain" />
              </div>
              <div className="flex-1 p-3 flex flex-col min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold">{m.title}</p>
                  <Tag color="pink">{m.difficulty}</Tag>
                </div>
                <p className="text-[12px] text-text/60 mt-2 whitespace-pre-line leading-snug">{TIPS[m.iconKey]}</p>
                <p className="mt-auto self-end text-[16px] text-text/70 font-bold leading-none" aria-label="바로가기">→</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
