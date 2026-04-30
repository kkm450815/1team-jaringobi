// 정적 데이터 (실제로는 Supabase에서 로드 — UI_HANDOFF.md 참고)

export type MissionCategory = '식비' | '여가' | '충동' | '통장';
export type Difficulty = '쉬움' | '보통' | '어려움';

export interface Mission {
  id: string;
  category: MissionCategory;
  title: string;
  amount: number; // 원
  difficulty: Difficulty;
  iconKey: string; // /jarin/chall/icon/chall_list_<key>.png
}

export const MISSIONS: Mission[] = [
  { id: 'm1', category: '식비', title: '편의점 안 가기',     amount: 5000,  difficulty: '쉬움',   iconKey: 'cvs' },
  { id: 'm2', category: '식비', title: '카페 음료 참기',     amount: 5000,  difficulty: '쉬움',   iconKey: 'coffee' },
  { id: 'm3', category: '식비', title: '배달 음식 끊기',     amount: 12000, difficulty: '보통',   iconKey: 'delivery' },
  { id: 'm4', category: '식비', title: '집밥 직접 해먹기',   amount: 8000,  difficulty: '보통',   iconKey: 'receipe' },
  { id: 'm5', category: '식비', title: '저녁 굶기',         amount: 10000, difficulty: '어려움', iconKey: 'dinner' },
  { id: 'm6', category: '여가', title: '문화생활 한 번 참기', amount: 15000, difficulty: '보통',   iconKey: 'culture' },
  { id: 'm7', category: '여가', title: '술자리 빠지기',     amount: 30000, difficulty: '어려움', iconKey: 'drink' },
  { id: 'm8', category: '여가', title: '미용실 미루기',     amount: 20000, difficulty: '보통',   iconKey: 'hair' },
  { id: 'm9', category: '여가', title: '도서관 이용',       amount: 5000,  difficulty: '쉬움',   iconKey: 'library' },
  { id: 'm10', category: '충동', title: '충동 쇼핑 참기',   amount: 25000, difficulty: '어려움', iconKey: 'shopping' },
  { id: 'm11', category: '충동', title: '폰 약정 안 바꾸기', amount: 10000, difficulty: '보통',   iconKey: 'phone' },
  { id: 'm12', category: '충동', title: '택시 대신 대중교통', amount: 8000, difficulty: '쉬움',   iconKey: 'taxi' },
  { id: 'm13', category: '충동', title: '기프티콘 안 사기',  amount: 5000,  difficulty: '쉬움',   iconKey: 'gifticon' },
  { id: 'm14', category: '통장', title: '잔돈 저금하기',     amount: 3000,  difficulty: '쉬움',   iconKey: 'save' },
  { id: 'm15', category: '통장', title: '당근 정리해서 팔기', amount: 10000, difficulty: '보통',   iconKey: 'carrot' },
  { id: 'm16', category: '통장', title: '알바비 모으기',     amount: 50000, difficulty: '어려움', iconKey: 'alba' },
  { id: 'm17', category: '통장', title: '무지출 데이',       amount: 15000, difficulty: '어려움', iconKey: 'zero' },
  { id: 'm18', category: '통장', title: '공구 직접 수리',     amount: 12000, difficulty: '보통',   iconKey: 'repair' },
  { id: 'm19', category: '통장', title: '친구에게 빌리기',   amount: 8000,  difficulty: '쉬움',   iconKey: 'friend' },
  { id: 'm20', category: '여가', title: '레저활동 미루기',   amount: 20000, difficulty: '보통',   iconKey: 'leisure' },
];

export const TALK_ROOMS = [
  { id: 't1', title: '편의점 꿀조합',   icon: '/jarin/talk_list_store.png',     bg: '#F4D8D8' },
  { id: 't2', title: '가성비 레시피',   icon: '/jarin/talk_list_cook.png',      bg: '#E8E1D2' },
  { id: 't3', title: '체험단 꿀팁',     icon: '/jarin/talk_list_experience.png', bg: '#D5E4D2' },
  { id: 't4', title: '혼놀 취미',       icon: '/jarin/talk_list_solo.png',      bg: '#E2DBE9' },
];

export const TITLES = [
  { id: 'h1', name: '홈 바리스타', got: true,  active: true  },
  { id: 'h2', name: '배달 킬러',   got: true,  active: false },
  { id: 'h3', name: '통장 지킴이', got: true,  active: false },
  { id: 'h4', name: '충동 차단',   got: true,  active: false },
  { id: 'h5', name: '편의점 단절', got: false, active: false },
  { id: 'h6', name: '카페 절제',   got: false, active: false },
  { id: 'h7', name: '무지출왕',   got: false, active: false },
  { id: 'h8', name: '미니멀리스트', got: false, active: false },
  { id: 'h9', name: '재테크 입문', got: false, active: false },
];

export const SHOP_ITEMS: { category: '전체' | '사치품' | '티셔츠' | '리모델링'; items: { src: string }[] }[] = [
  { category: '전체', items: [] }, // 런타임에 전 카테고리 합쳐서 보여줌
  { category: '사치품', items: Array.from({ length: 12 }, (_, i) => ({
      src: `/shop/acc/acc_shop_${String(i + 1).padStart(2, '0')}.png`,
    })) },
  { category: '티셔츠', items: Array.from({ length: 12 }, (_, i) => ({
      src: `/shop/clothes/clo_shop_${String(i + 1).padStart(2, '0')}.png`,
    })) },
  { category: '리모델링', items: Array.from({ length: 12 }, (_, i) => ({
      src: `/shop/wall_paper/interior_shop_${String(i + 1).padStart(2, '0')}.png`,
    })) },
];

export const PRICES = [50, 80, 100, 120, 150, 180, 200, 250, 300, 350, 400, 450];
