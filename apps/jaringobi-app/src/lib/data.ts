// 정적 데이터 (실제로는 Supabase에서 로드 — UI_HANDOFF.md 참고)

export type MissionCategory = '식비' | '여가' | '충동' | '통장';
export type Difficulty = '쉬움' | '보통' | '어려움';

export interface Mission {
  id: string;
  category: MissionCategory;
  title: string;
  amount: number; // 원 (수익형은 + 표시 의미)
  difficulty: Difficulty;
  iconKey: string; // /jarin/chall/icon/chall_list_<key>.png
  intro: string;   // 한 줄 요약 (리스트 카드용)
  tips: string[];  // 실천 팁 불릿
  authMethod: string; // 인증 방법
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1', category: '식비', title: '편의점 최고의 조합', amount: 5000, difficulty: '쉬움', iconKey: 'cvs',
    intro: '편의점에서도 **영양 챙기면서 저렴하게** 먹을 수 있어요.',
    tips: [
      '든든한 한 끼 — 삼각김밥 2개 + 컵라면/국 = **3,500원 이하**',
      '단백질 조합 — 닭가슴살 + 삶은 계란 + 두유 = **4,000원 이하**',
      'PB 상품 활용 — CU 헤이루, GS25 유어스, 세븐셀렉트는 **20~30% 저렴**',
      '**1+1·2+1 행사**는 매주 화요일 변경, 행사 상품 위주로',
    ],
    authMethod: '편의점 영수증 또는 조합 사진 업로드',
  },
  {
    id: 'm2', category: '식비', title: '커피 참기', amount: 4000, difficulty: '쉬움', iconKey: 'coffee',
    intro: '매일 **4,000원**짜리 카페 대신 **집에서 만들어** 보세요.',
    tips: [
      '**텀블러**에 일회용 커피 스틱을 들고 나가기',
      '드립백·캡슐 한 박스(약 5,000원)로 일주일치 — **하루 700원**',
      '밖에서 꼭 마셔야 한다면 편의점 아이스커피(**1,800원**)',
    ],
    authMethod: '텀블러 사진 또는 집에서 만든 커피 사진',
  },
  {
    id: 'm3', category: '식비', title: '배달 금지', amount: 15000, difficulty: '어려움', iconKey: 'delivery',
    intro: '배달앱 켜는 순간 최소 **15,000원**이 나가요.',
    tips: [
      '배달앱을 **홈화면 폴더 안에 숨기기** — 충동 주문 줄이기',
      '방문 포장으로 대체 — **배달비 4,000~6,000원 절약**',
      '주 1회 냉장고 사진 찍어두고 “이걸로 뭘 해먹지?” 먼저 생각하기',
      '마감 할인 플랫폼 — **라스트오더, 요기요 라스트콜**',
    ],
    authMethod: '직접 요리한 음식 사진 또는 포장 영수증 업로드',
  },
  {
    id: 'm4', category: '식비', title: '싼 레시피 챌린지', amount: 30000, difficulty: '보통', iconKey: 'receipe',
    intro: '**1인분 3,000원 이하** 레시피로 도전해요.',
    tips: [
      '계란 한 판(약 6,000원)으로 **5일 반찬** 해결',
      '두부 한 모(**1,500원**) — 두부조림·된장찌개·순두부',
      '**냉동 야채** 활용 — 신선보다 저렴하고 오래감',
    ],
    authMethod: '완성된 요리 사진 + 재료비 영수증 업로드',
  },
  {
    id: 'm5', category: '식비', title: '저녁 줄이기', amount: 20000, difficulty: '쉬움', iconKey: 'dinner',
    intro: '저녁만 바꿔도 일주일에 **4만원**이 남아요.',
    tips: [
      '**비빔밥 데이** — 냉장고 남은 반찬 모아 비비기',
      '마트 PB 상품 공략 — 노브랜드, 시그니처 등 **30~40% 저렴**',
      '저녁 **8~9시 마감 할인** — 당일 식품 30~50% 할인',
    ],
    authMethod: '저녁 식사 사진 또는 마트 영수증 업로드',
  },
  {
    id: 'm6', category: '여가', title: '무료 문화생활 루틴', amount: 30000, difficulty: '쉬움', iconKey: 'culture',
    intro: '매달 문화생활에 쓰던 돈, 이번 달은 **0원**으로.',
    tips: [
      '네이버·카카오 무료 웹툰·웹소설 — **기다리면 무료**',
      '유튜브로 **클래식·뮤지컬 넘버·스탠드업 코미디** 시청',
      '**서울문화포털**(culture.seoul.go.kr)에서 주말 무료 행사 확인',
    ],
    authMethod: '관람 인증 사진 또는 행사 참여 캡처',
  },
  {
    id: 'm7', category: '여가', title: '혼술 챌린지', amount: 20000, difficulty: '보통', iconKey: 'drink',
    intro: '술집 한 번 **4만원**, 집에서는 **4,000원**.',
    tips: [
      '편의점 혼술 세팅 — 맥주 2캔 + 안주 = **5,000원 이하**',
      '약속 전 **막차 시간** 미리 확인 — 자연스럽게 2·3차 컷',
      '홈파티로 전환 — 1인당 **5,000~10,000원**',
      '월별 술자리 횟수·지출 기록 → **보이면 줄게 됨**',
    ],
    authMethod: '집 혼술 사진 또는 막차 전 귀가 지하철 인증',
  },
  {
    id: 'm8', category: '여가', title: '미용실 체험단', amount: 20000, difficulty: '보통', iconKey: 'hair',
    intro: '체험단으로 **무료 또는 저렴하게** 시술받기.',
    tips: [
      '**네이버 엑스퍼트·인플루언서 체험단**에서 미용실 모집 글 찾기',
      '**강남·홍대 신규 오픈** 미용실은 포트폴리오용 모델 모집',
      '인스타·블로그 후기 조건이 대부분, **팔로워 적어도** 성실하면 OK',
      '카카오헤어샵·네이버 예약 **신규 고객 50% 할인** 노리기',
    ],
    authMethod: '체험단 선정 화면 또는 시술 후기 게시 캡처',
  },
  {
    id: 'm9', category: '여가', title: '도서관·무료 콘텐츠', amount: 30000, difficulty: '쉬움', iconKey: 'library',
    intro: '돈 내고 배우던 것을 **무료로 대체**해요.',
    tips: [
      '**국립도서관·서울도서관** 전자책 앱 — 신간 포함 수만 권 무료',
      '구청 평생학습관 — 영어·요가·요리 강좌 **1만원 이하**',
      '시립·구립 박물관 **상설전 무료** (월 1회 방문 루틴)',
    ],
    authMethod: '도서관 대출 기록 또는 강좌 수강 인증 사진',
  },
  {
    id: 'm10', category: '충동', title: '쇼핑 참기', amount: 100000, difficulty: '어려움', iconKey: 'shopping',
    intro: '담아둔 건 **48시간 뒤** 다시 봐요. 대부분 안 사도 돼요.',
    tips: [
      '**장바구니 삭제 인증** — 쿠팡·무신사·지그재그 비운 화면 캡처',
      '**48시간 룰** — 사고 싶은 게 생기면 담아두고 48시간 뒤 재확인',
      '**알림 차단** — 쇼핑앱 푸시 끄거나 홈화면 뒤 페이지로',
      '대신할 행동 찾기 — **산책·유튜브**로 욕구 전환',
    ],
    authMethod: '장바구니 삭제 전/후 화면 캡처 업로드',
  },
  {
    id: 'm11', category: '충동', title: '통신비 절약', amount: 20000, difficulty: '보통', iconKey: 'phone',
    intro: '통신비는 **한 번만 바꿔도 매달 절약**돼요.',
    tips: [
      '**알뜰폰허브**(mvno.kr)에서 데이터 사용량 기반 비교 — 월 **8,000~15,000원** 요금제',
      '가족 결합 해지 검토 — 알뜰폰으로도 결합 유지 가능 여부 확인',
      '번호 이동 이벤트 — 분기별 **공시지원금**/추가 할인',
    ],
    authMethod: '새 요금제 가입 완료 화면 캡처',
  },
  {
    id: 'm12', category: '충동', title: '택시 금지 (2주)', amount: 30000, difficulty: '보통', iconKey: 'taxi',
    intro: '심야 택시 한 번 **3만원**, **막차**만 챙겨도 절약.',
    tips: [
      '약속 장소 기준 **막차 시간을 캘린더 알람**으로 등록',
      '**카풀 앱**으로 비용 분담',
      '약속 장소를 대중교통 편한 곳으로 잡기',
      '택시 부르기 전 “**이게 정말 필요한가?**” 5초만 생각',
    ],
    authMethod: '대중교통 탑승 기록 또는 막차 귀가 인증 사진',
  },
  {
    id: 'm13', category: '통장', title: '기프티콘 팔기', amount: 10000, difficulty: '쉬움', iconKey: 'gifticon',
    intro: '**유효기간 지나기 전에** 현금으로 바꿔요.',
    tips: [
      '**카카오톡 선물함**의 잊고 있던 기프티콘부터 정리',
      '**니콘내콘·기프티스타**에서 **80~95% 시세**로 현금화',
      '**부분 사용 후 잔액 판매**도 가능',
      '캐시워크·토스 행운복권 같은 **앱테크 병행**',
    ],
    authMethod: '기프티콘 판매 완료 화면 캡처',
  },
  {
    id: 'm14', category: '통장', title: '갑자기 5만원 저금', amount: 50000, difficulty: '쉬움', iconKey: 'save',
    intro: '지금 당장 **5만원을 봉투에 넣어두는** 챌린지.',
    tips: [
      '**현금 바인더** 만들기 — 봉투에 금액별 보관, 줄어드는 감각이 강함',
      '월급 다음 날 **자동이체**로 5만원 → 저축 통장',
      '안 쓰는 **OTT·구독 하나만 끊어도** 6개월에 10만원',
    ],
    authMethod: '현금 봉투 또는 저축 이체 완료 화면 캡처',
  },
  {
    id: 'm15', category: '통장', title: '당근마켓 챌린지', amount: 50000, difficulty: '쉬움', iconKey: 'carrot',
    intro: '안 쓰는 물건 **5개만 팔아도 5만원**은 쉽게 나와요.',
    tips: [
      '**1년 넘게 안 쓴 것·후회한 것·사이즈 안 맞는 옷**부터 뒤지기',
      '**밝은 곳·흰 배경 사진**은 판매 속도 2배',
      '같은 물건 시세 확인 후 **살짝 낮게** 부르면 당일 판매',
      '매월 **11일 나눔의 날** 이벤트 활용',
    ],
    authMethod: '판매 완료된 거래 후기 캡처',
  },
  {
    id: 'm16', category: '통장', title: '단기 알바', amount: 50000, difficulty: '어려움', iconKey: 'alba',
    intro: '짜투리 시간 단기 알바로 **추가 수입**.',
    tips: [
      '알바몬·알바천국 당일 알바 — 행사·서빙·포장 **6~8만원**',
      '**크몽·숨고**로 재능 판매 — 번역·디자인·과외',
      '쿠팡이츠·배민 라이더 주말 2~3시간 = **3~5만원**',
      '마크로밀 엠브레인·오픈서베이 패널 — 설문 1건당 **500~3,000P**',
    ],
    authMethod: '급여 입금 내역 또는 플랫폼 수익 화면 캡처',
  },
  {
    id: 'm17', category: '통장', title: '무지출 데이', amount: 30000, difficulty: '보통', iconKey: 'zero',
    intro: '하루를 **완전히 0원**으로 보내는 챌린지.',
    tips: [
      '**전날 밤 결정** + 식재료 미리 준비 (즉흥 어렵)',
      '동네 공원·하천 산책 + **팟캐스트** = 2시간 거뜬',
      '유튜브 요리 영상·도서관 전자책·밀린 드라마 등 = **0원**',
    ],
    authMethod: '당일 카드·계좌 지출 내역 캡처',
  },
  {
    id: 'm18', category: '통장', title: '물건 고치기', amount: 20000, difficulty: '보통', iconKey: 'repair',
    intro: '버리고 새로 사기 전에 **고치면 꽤 아껴요**.',
    tips: [
      '**유튜브 수리 영상** 먼저 검색 — 이어폰 단선·지퍼·밑창 다 나와요',
      '수선집 활용 — 옷 수선 **3,000~8,000원**',
      '**다이소 수리 용품** — 접착제·보수 테이프·복원제 1,000~2,000원',
      '못 고칠 것 같으면 “부품용”으로 **당근에 올려보기**',
    ],
    authMethod: '수리 전/후 사진 업로드',
  },
  {
    id: 'm19', category: '여가', title: '친구 금지', amount: 100000, difficulty: '어려움', iconKey: 'friend',
    intro: '약속을 줄이면 **교통비·식비·술값이 한꺼번에** 줄어요.',
    tips: [
      '약속 잡기 전 **이번 달 여가비 잔액**부터 확인',
      '혼자 즐기는 취미 개발 — **독서·러닝·요리**',
      '주말 계획을 **무지출 데이·도서관 방문**으로 미리 채우기',
    ],
    authMethod: '주간 지출 내역 캡처',
  },
  {
    id: 'm20', category: '여가', title: '한 달 여가비 5만원 쓰기', amount: 50000, difficulty: '어려움', iconKey: 'leisure',
    intro: '놀건 놀아야지. 근데 한 달에 **딱 5만원 안에서**.',
    tips: [
      '**여가비 전용 봉투** 만들기 — 봉투에서만 꺼내 쓰기',
      '이번 달 “꼭” 하고 싶은 활동 **1가지만**, 나머지는 무료 대체',
      '**인터파크·티켓베이**로 50% 이하 할인 티켓 노리기',
      '**통신사 여가생활 쿠폰** — 수요 적어 상대적으로 받기 쉬움',
    ],
    authMethod: '월말 여가 지출 내역 캡처 + 무료/할인 여가 인증 사진',
  },
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

// 칭호/업적 시스템 — title.md 기반
// 누적형, 같은 날 같은 미션은 1회만 인정 (savePhoto 시점에 (cycle,day) 키로 중복 제거)

export type TitleDifficulty = '쉬움' | '보통' | '어려움';

// 칭호 획득 조건. 모든 reqs를 만족해야 칭호 획득.
export type TitleReq =
  | { type: 'mission'; missionId: string; count: number }
  | { type: 'totalSaveCount'; count: number }
  | { type: 'cycleComplete' };

export interface Title {
  id: string;
  name: string;
  difficulty: TitleDifficulty;
  tagline: string;       // 한 줄 설명
  tip: string;           // 하단 tip!
  iconKey: string;       // 레거시 SVG fallback용
  img: string;           // 칭호 메인 이미지 경로 (/title/title_NN.png)
  reqs: TitleReq[];
}

export const TITLES: Title[] = [
  {
    id: 'h0', name: '초보 절약가', difficulty: '쉬움',
    tagline: '절약의 첫 발을 내딛다',
    tip: '하루에 한 가지씩만 줄여봐도 한 달이 다르게 느껴져요',
    iconKey: 'sprout',
    img: '/title/title_00.png',
    reqs: [],
  },
  {
    id: 'h1', name: '홈 바리스타', difficulty: '쉬움',
    tagline: '오늘도 커피 값을 아꼈다',
    tip: '텀블러를 들고 다니면 더 쉽게 성공할 수 있어요',
    iconKey: 'coffee',
    img: '/title/title_01.png',
    reqs: [{ type: 'mission', missionId: 'm2', count: 5 }],
  },
  {
    id: 'h2', name: '편의점 미식가', difficulty: '쉬움',
    tagline: '배달 대신 편의점 각',
    tip: '배달 앱을 열기 전에 편의점을 떠올려보세요',
    iconKey: 'cvs',
    img: '/title/title_02.png',
    reqs: [{ type: 'mission', missionId: 'm1', count: 5 }],
  },
  {
    id: 'h3', name: '방구석 선비', difficulty: '보통',
    tagline: '오늘은 집이 최고다',
    tip: '미리 약속을 줄여두면 자연스럽게 지출도 줄일 수 있어요',
    iconKey: 'friend',
    img: '/title/title_03.png',
    reqs: [{ type: 'mission', missionId: 'm19', count: 10 }],
  },
  {
    id: 'h5', name: '문화 한량', difficulty: '보통',
    tagline: '돈 없이도 잘 놀았다',
    tip: '무료 전시나 행사를 미리 찾아두면 더 자주 즐길 수 있어요',
    iconKey: 'culture',
    img: '/title/title_04.png',
    reqs: [{ type: 'mission', missionId: 'm6', count: 10 }],
  },
  {
    id: 'h6', name: '연금술사', difficulty: '어려움',
    tagline: '오늘도 하나 살렸다',
    tip: '안 쓰는 물건을 정리해보면 생각보다 쉽게 현금으로 바꿀 수 있어요',
    iconKey: 'repair',
    img: '/title/title_05.png',
    reqs: [
      { type: 'mission', missionId: 'm18', count: 10 },
      { type: 'mission', missionId: 'm13', count: 5 },
    ],
  },
  {
    id: 'h7', name: '현금술사', difficulty: '어려움',
    tagline: '수입 한 스푼 추가',
    tip: '작은 수입이라도 꾸준히 만들면 점점 차이가 커져요',
    iconKey: 'save',
    img: '/title/title_06.png',
    reqs: [
      { type: 'mission', missionId: 'm14', count: 5 },
      { type: 'mission', missionId: 'm16', count: 5 },
    ],
  },
  {
    id: 'h8', name: '디지털 폐지왕', difficulty: '어려움',
    tagline: '티끌 모아 디지털 부자',
    tip: '매일 조금씩 참여하면 부담 없이 포인트를 모을 수 있어요',
    iconKey: 'phone',
    img: '/title/title_07.png',
    reqs: [{ type: 'mission', missionId: 'm11', count: 15 }],
  },
  {
    id: 'h9', name: '배달 킬러', difficulty: '쉬움',
    tagline: '배달 끊으면 돈이 쌓인다',
    tip: '배달 앱 대신 다른 선택지를 먼저 떠올리면 도움이 돼요',
    iconKey: 'delivery',
    img: '/title/title_08.png',
    reqs: [{ type: 'mission', missionId: 'm3', count: 5 }],
  },
  {
    id: 'h10', name: '인내의 화신', difficulty: '어려움',
    tagline: '참을 수 있는 자가 이긴다',
    tip: '잠깐만 참아도 대부분의 소비 욕구는 금방 사라져요',
    iconKey: 'shopping',
    img: '/title/title_09.png',
    reqs: [
      { type: 'mission', missionId: 'm10', count: 10 },
      { type: 'mission', missionId: 'm12', count: 10 },
      { type: 'mission', missionId: 'm5', count: 10 },
    ],
  },
  {
    id: 'h11', name: '자린고비', difficulty: '어려움',
    tagline: '진짜 절약의 끝판왕',
    tip: '하루 한 번 무지출을 목표로 하면 점점 익숙해질 수 있어요',
    iconKey: 'zero',
    img: '/title/title_10.png',
    reqs: [
      { type: 'totalSaveCount', count: 30 },
      { type: 'mission', missionId: 'm17', count: 10 },
      { type: 'cycleComplete' },
    ],
  },
];

export interface TitleProgress {
  cur: number;
  max: number;
  met: boolean;
  label: string;     // "커피 참기 5회" 등 사람이 읽는 라벨
}

// 사용자 상태 기반으로 한 칭호의 각 req에 대한 진행도 계산
export function getTitleProgress(
  title: Title,
  ctx: {
    missionWinDays: Record<string, string[]>;
    totalSaveCount: number;
    cycle: number;
  },
): { entries: TitleProgress[]; achieved: boolean; ratio: number } {
  const entries: TitleProgress[] = title.reqs.map((req) => {
    if (req.type === 'mission') {
      const m = MISSIONS.find((x) => x.id === req.missionId);
      const cur = Math.min(ctx.missionWinDays[req.missionId]?.length ?? 0, req.count);
      return {
        cur,
        max: req.count,
        met: cur >= req.count,
        label: `${m?.title ?? req.missionId} ${req.count}회 성공`,
      };
    }
    if (req.type === 'totalSaveCount') {
      const cur = Math.min(ctx.totalSaveCount, req.count);
      return {
        cur,
        max: req.count,
        met: cur >= req.count,
        label: `총 절약 ${req.count}회 이상`,
      };
    }
    // cycleComplete
    const done = ctx.cycle > 1 ? 1 : 0;
    return {
      cur: done,
      max: 1,
      met: done >= 1,
      label: '챌린지 1회 완주',
    };
  });
  const achieved = entries.every((e) => e.met);
  const totalCur = entries.reduce((s, e) => s + e.cur, 0);
  const totalMax = entries.reduce((s, e) => s + e.max, 0);
  const ratio = totalMax > 0 ? totalCur / totalMax : 0;
  return { entries, achieved, ratio };
}

export type ShopCategory = '전체' | '사치품' | '티셔츠' | '리모델링';

// img/shop 폴더 실제 파일을 그대로 반영 (새 파일 추가/삭제 시 동기화)
const ACC_FILES: string[] = [
  'acc_shop_01','acc_shop_02','acc_shop_03','acc_shop_04','acc_shop_05','acc_shop_06','acc_shop_07','acc_shop_08','acc_shop_09',
  'acc_shop_11','acc_shop_12','acc_shop_13','acc_shop_14','acc_shop_15','acc_shop_16','acc_shop_17','acc_shop_18',
  'acc_shop_21','acc_shop_22','acc_shop_23','acc_shop_24','acc_shop_25','acc_shop_26','acc_shop_27','acc_shop_28','acc_shop_29','acc_shop_30',
  'acc_shop_31','acc_shop_32','acc_shop_33','acc_shop_34','acc_shop_35','acc_shop_36','acc_shop_37','acc_shop_38','acc_shop_39','acc_shop_40',
  'acc_shop_41','acc_shop_42','acc_shop_43','acc_shop_44','acc_shop_45','acc_shop_46','acc_shop_47','acc_shop_48','acc_shop_49','acc_shop_50',
  'acc_shop_51','acc_shop_52','acc_shop_53','acc_shop_54','acc_shop_55','acc_shop_56','acc_shop_57','acc_shop_58','acc_shop_59','acc_shop_60',
  'acc_shop_61','acc_shop_62','acc_shop_64','acc_shop_65','acc_shop_66','acc_shop_67','acc_shop_68','acc_shop_69','acc_shop_70',
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

// 사치품 서브 카테고리: 모자 / 안경 / 소지품 — 각각 독립 슬롯이라 동시 착용 가능
export type AccSub = '모자' | '안경' | '소지품';
export const ACC_SUBS: AccSub[] = ['모자', '안경', '소지품'];

// 사치품 파일별 서브 분류 (acc_fit 이미지 분석 기반)
const ACC_HAT_NUMS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  11, 12, 13, 14, 15, 16, 21,
  49, 50, 51, 52, 53,
  60, 61, 63, 64, 65, 66, 68,
  71, 72, 74,
  78, 79, 80, 81,
]);
const ACC_GLASSES_NUMS = new Set([
  17, 18, 27, 28,
  37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
  55, 56, 67, 73, 75,
]);

function accNumOf(src: string): number | null {
  const m = src.match(/acc_(?:shop|fit)_(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function accSubOf(src: string): AccSub {
  const n = accNumOf(src);
  if (n != null && ACC_HAT_NUMS.has(n)) return '모자';
  if (n != null && ACC_GLASSES_NUMS.has(n)) return '안경';
  return '소지품';
}

export const ACC_FILES_BY_SUB: Record<AccSub, string[]> = {
  모자: SHOP_GROUPS.사치품.filter((s) => accSubOf(s) === '모자'),
  안경: SHOP_GROUPS.사치품.filter((s) => accSubOf(s) === '안경'),
  소지품: SHOP_GROUPS.사치품.filter((s) => accSubOf(s) === '소지품'),
};

// 장착 시 동시 1개만 허용하기 위한 상위 카테고리 판별 (UI 그룹용)
export function topCategoryOf(src: string): Exclude<ShopCategory, '전체'> {
  if (src.startsWith('/shop/acc/') || src.startsWith('/fit/acc/')) return '사치품';
  if (src.startsWith('/shop/clothes/') || src.startsWith('/fit/clothes/')) return '티셔츠';
  return '리모델링';
}

// 장착 슬롯: 사치품 3종(모자/안경/소지품) + 티셔츠 + 리모델링 5종 = 9슬롯, 슬롯당 1개씩 동시 장착
export type EquipSlot =
  | '모자' | '안경' | '소지품'
  | '티셔츠'
  | '조명' | '소품' | '가구1' | '가구2' | '벽지';
export function equipSlotOf(src: string): EquipSlot {
  if (src.startsWith('/shop/acc/') || src.startsWith('/fit/acc/')) return accSubOf(src);
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

// 개별 가격 오버라이드 (운영에서 직접 지정한 항목)
const PRICE_OVERRIDE: Record<string, number> = {
  '/shop/acc/acc_shop_03.png': 400,
  '/shop/acc/acc_shop_47.png': 300,
  '/shop/acc/acc_shop_57.png': 200,
  '/shop/clothes/clo_shop_18.png': 500,
  '/shop/clothes/clo_shop_20.png': 500,
  '/shop/clothes/clo_shop_40.png': 180,
  '/shop/clothes/clo_shop_42.png': 150,
  '/shop/clothes/clo_shop_43.png': 150,
  '/shop/clothes/clo_shop_44.png': 150,
  '/shop/clothes/clo_shop_51.png': 0,   // 무료 — 자물쇠 미표시, 모든 사용자 기본 보유
  '/shop/clothes/clo_shop_53.png': 200,
  '/shop/clothes/clo_shop_54.png': 200,
  '/shop/right/right_shop_03.png': 200,
  '/shop/right/right_shop_16.png': 50,
  '/shop/front/front_shop_25.png': 300,
  '/shop/lamp/lamp_shop_06.png': 200,
};

// 벽지는 50~150 범위에서 결정적으로 분배
const WALL_PRICE_BUCKET = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];

function hashSrc(src: string): number {
  let h = 0;
  for (let i = 0; i < src.length; i += 1) h = (h * 31 + src.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function priceFor(src: string): number {
  if (src in PRICE_OVERRIDE) return PRICE_OVERRIDE[src];
  if (src.includes('/shop/wall_paper/')) {
    return WALL_PRICE_BUCKET[hashSrc(src) % WALL_PRICE_BUCKET.length];
  }
  return PRICE_BUCKET[hashSrc(src) % PRICE_BUCKET.length];
}
