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
  { id: 't1', title: '편의점 꿀조합',     icon: '/jarin/talk_list_store.png',      bg: '#CFE2EA' },
  { id: 't2', title: '가성비 레시피',     icon: '/jarin/talk_list_cook.png',       bg: '#D8E6CF' },
  { id: 't3', title: '체험단 꿀팁',       icon: '/jarin/talk_list_experience.png', bg: '#F3CFD2' },
  { id: 't4', title: '혼놀 취미 공유',    icon: '/jarin/talk_list_solo.png',       bg: '#D7D5EC' },
];

export interface TalkPost {
  id: string;
  roomId: string;
  nick: string;
  body: string;
}

export const ME_NICK = '자린이 1호';

export const TALK_POSTS: TalkPost[] = [
  { id: 'p1',  roomId: 't1', nick: '자린이 103호', body: '돈 모으기 힘들어요' },
  { id: 'p2',  roomId: 't1', nick: '자린이 2호',
    body: '제육볶음은 돼지고기에 고추장과 고추가루로 만든 양념장을 넣고 굽거나 볶아서 만든 음식이다. 된장찌개·김치찌개처럼 대표적인 집밥이자 남초 음식이다.' },
  { id: 'p3',  roomId: 't1', nick: '자린이 103호', body: '돈 모으기 힘들어요' },
  { id: 'p4',  roomId: 't1', nick: '자린이 103호', body: '돈 모으기 힘들어요' },
  { id: 'p5',  roomId: 't1', nick: '자린이 103호', body: '돈 모으기 힘들어요' },
  { id: 'p6',  roomId: 't1', nick: '자린이 103호', body: '돈 모으기 힘들어요' },
  { id: 'p7',  roomId: 't2', nick: '자린이 12호',  body: '레토르트 + 계란 + 김치 = 1식 1500원으로 해결' },
  { id: 'p8',  roomId: 't2', nick: '자린이 47호',  body: '주말에 한 번 만들어두면 한 주 도시락 끝!' },
  { id: 'p9',  roomId: 't3', nick: '자린이 88호',  body: '체험단 신청 꿀팁: 후기 짧게라도 꾸준히' },
  { id: 'p10', roomId: 't4', nick: '자린이 33호',  body: '도서관에서 책 + 노트북 = 하루 0원 코스' },
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

export type ShopCategory = '전체' | '사치품' | '티셔츠' | '리모델링';

// img/shop 폴더 실제 파일을 그대로 반영 (새 파일 추가/삭제 시 동기화)
const ACC_FILES: string[] = [
  'acc_shop_01','acc_shop_02','acc_shop_03','acc_shop_04','acc_shop_05','acc_shop_06','acc_shop_07','acc_shop_08','acc_shop_09',
  'acc_shop_11','acc_shop_12','acc_shop_13','acc_shop_14','acc_shop_15','acc_shop_16','acc_shop_17','acc_shop_18',
  'acc_shop_21','acc_shop_22','acc_shop_23','acc_shop_24','acc_shop_25','acc_shop_26','acc_shop_27','acc_shop_28','acc_shop_29','acc_shop_30',
  'acc_shop_31','acc_shop_32','acc_shop_33','acc_shop_34','acc_shop_35','acc_shop_36','acc_shop_37','acc_shop_38','acc_shop_39','acc_shop_40',
  'acc_shop_41','acc_shop_42','acc_shop_43','acc_shop_44','acc_shop_45','acc_shop_46','acc_shop_47','acc_shop_48','acc_shop_49','acc_shop_50',
  'acc_shop_51','acc_shop_52','acc_shop_53','acc_shop_54','acc_shop_55','acc_shop_56','acc_shop_57','acc_shop_58','acc_shop_59','acc_shop_60',
  'acc_shop_61','acc_shop_62','acc_shop_63','acc_shop_64','acc_shop_65','acc_shop_66','acc_shop_67','acc_shop_68','acc_shop_69','acc_shop_70',
  'acc_shop_71','acc_shop_72','acc_shop_73','acc_shop_74','acc_shop_75','acc_shop_77','acc_shop_78','acc_shop_79','acc_shop_80','acc_shop_81',
].map((n) => `/shop/acc/${n}.png`);

const CLO_FILES: string[] = Array.from({ length: 55 }, (_, i) =>
  `/shop/clothes/clo_shop_${String(i + 1).padStart(2, '0')}.png`,
);

const WALL_FILES: string[] = Array.from({ length: 27 }, (_, i) =>
  `/shop/wall_paper/interior_shop_${String(i + 1).padStart(2, '0')}.png`,
);

// 'lamp_shop_01-1.png'은 fit 매칭이 없어서 제외
const LAMP_FILES: string[] = [
  'lamp_shop_01','lamp_shop_02','lamp_shop_03','lamp_shop_04','lamp_shop_05','lamp_shop_06','lamp_shop_07','lamp_shop_08','lamp_shop_09','lamp_shop_10',
  'lamp_shop_11','lamp_shop_12','lamp_shop_13','lamp_shop_14','lamp_shop_15','lamp_shop_16','lamp_shop_17','lamp_shop_18','lamp_shop_19','lamp_shop_20',
  'lamp_shop_21','lamp_shop_22','lamp_shop_23','lamp_shop_24','lamp_shop_25','lamp_shop_26','lamp_shop_27','lamp_shop_28','lamp_shop_29','lamp_shop_30',
  'lamp_shop_31','lamp_shop_32','lamp_shop_33','lamp_shop_34','lamp_shop_35','lamp_shop_36','lamp_shop_37','lamp_shop_38','lamp_shop_39',
].map((n) => `/shop/lamp/${n}.png`);

const LEFT_FILES: string[] = Array.from({ length: 12 }, (_, i) =>
  `/shop/left/left_shop_${String(i + 1).padStart(2, '0')}.png`,
);
const RIGHT_FILES: string[] = Array.from({ length: 21 }, (_, i) =>
  `/shop/right/right_shop_${String(i + 1).padStart(2, '0')}.png`,
);
const FRONT_FILES: string[] = Array.from({ length: 32 }, (_, i) =>
  `/shop/front/front_shop_${String(i + 1).padStart(2, '0')}.png`,
);

// 리모델링 서브 카테고리 (조명/소품/가구1/가구2/벽지)
export type RemodelSub = '조명' | '소품' | '가구1' | '가구2' | '벽지';
export const REMODEL_SUBS: RemodelSub[] = ['조명', '소품', '가구1', '가구2', '벽지'];
export const REMODEL_FILES: Record<RemodelSub, string[]> = {
  조명: LAMP_FILES,
  소품: LEFT_FILES,
  가구1: FRONT_FILES,
  가구2: RIGHT_FILES,
  벽지: WALL_FILES,
};

export const SHOP_GROUPS: Record<Exclude<ShopCategory, '전체'>, string[]> = {
  사치품: ACC_FILES,
  티셔츠: CLO_FILES,
  리모델링: [
    ...REMODEL_FILES.조명,
    ...REMODEL_FILES.소품,
    ...REMODEL_FILES.가구1,
    ...REMODEL_FILES.가구2,
    ...REMODEL_FILES.벽지,
  ],
};

export const SHOP_ALL: string[] = [
  ...SHOP_GROUPS.사치품,
  ...SHOP_GROUPS.티셔츠,
  ...SHOP_GROUPS.리모델링,
];

// 장착 시 동시 1개만 허용하기 위한 상위 카테고리 판별
export function topCategoryOf(src: string): Exclude<ShopCategory, '전체'> {
  if (src.startsWith('/shop/acc/') || src.startsWith('/fit/acc/')) return '사치품';
  if (src.startsWith('/shop/clothes/') || src.startsWith('/fit/clothes/')) return '티셔츠';
  return '리모델링';
}

// 장착 슬롯: 사치품/티셔츠/조명/소품/가구1/가구2/벽지 — 슬롯당 동시 1개씩만 장착 가능
export type EquipSlot = '사치품' | '티셔츠' | '조명' | '소품' | '가구1' | '가구2' | '벽지';
export function equipSlotOf(src: string): EquipSlot {
  if (src.startsWith('/shop/acc/') || src.startsWith('/fit/acc/')) return '사치품';
  if (src.startsWith('/shop/clothes/') || src.startsWith('/fit/clothes/')) return '티셔츠';
  if (src.startsWith('/shop/lamp/') || src.startsWith('/fit/lamp/')) return '조명';
  if (src.startsWith('/shop/left/') || src.startsWith('/fit/left/')) return '소품';
  if (src.startsWith('/shop/front/') || src.startsWith('/fit/front/')) return '가구1';
  if (src.startsWith('/shop/right/') || src.startsWith('/fit/right/')) return '가구2';
  return '벽지'; // /shop/wall_paper/, /fit/wall_paper/
}

// shop 경로의 표시용 PNG → 캐릭터 좌표계에 정렬된 fit 경로 PNG
// 예) /shop/clothes/clo_shop_03.png → /fit/clothes/clo_fit_03.png
export function fitSrc(shopSrc: string): string {
  return shopSrc.replace('/shop/', '/fit/').replace('_shop_', '_fit_');
}

// 가격은 src 해시 기반으로 결정적 분배 (재렌더해도 같은 값 유지)
const PRICE_BUCKET = [20, 50, 80, 100, 120, 150, 180, 200];
export function priceFor(src: string): number {
  let h = 0;
  for (let i = 0; i < src.length; i += 1) h = (h * 31 + src.charCodeAt(i)) | 0;
  return PRICE_BUCKET[Math.abs(h) % PRICE_BUCKET.length];
}
