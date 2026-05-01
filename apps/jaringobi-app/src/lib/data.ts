// 정적 데이터 (실제로는 Supabase에서 로드 — UI_HANDOFF.md 참고)

export type MissionCategory = '식비' | '여가' | '충동' | '통장';
export type Difficulty = '쉬움' | '보통' | '어려움';

export interface Mission {
  id: string;
  category: MissionCategory;
  title: string;
  amount: number; // 원 (1회 절약 금액)
  difficulty: Difficulty;
  iconKey: string; // /jarin/chall/icon/chall_list_<key>.png
  description: string;
  tips: string[];
  proof: string;
  monthlySaving?: number; // 명시된 한 달 기대 절약액 (없으면 amount * 22로 추정)
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1', category: '식비', title: '커피 참기', amount: 4000, difficulty: '쉬움', iconKey: 'coffee',
    description: '매일 4,000원짜리 카페 대신 집에서 만들어 보세요.',
    tips: [
      '텀블러에 일회용 커피 스틱을 들고 나가기',
      '드립백·캡슐 한 박스(약 5,000원)로 일주일치 — 하루 700원',
      '밖에서 꼭 마셔야 한다면 편의점 아이스커피(1,800원)',
    ],
    proof: '텀블러 사진 또는 집에서 만든 커피 사진',
    monthlySaving: 88000,
  },
  {
    id: 'm2', category: '식비', title: '배달 금지', amount: 15000, difficulty: '어려움', iconKey: 'delivery',
    description: '배달앱 켜는 순간 최소 15,000원은 나가요.',
    tips: [
      '배달앱을 홈화면 폴더 안에 숨기기 — 충동 주문 줄이기',
      '방문 포장으로 대체 — 배달비 4,000~6,000원 절약',
      '주 1회 냉장고 사진 찍어두고 "이걸로 뭘 해먹지?" 먼저 생각하기',
      '마감 할인 플랫폼 — 라스트오더, 요기요 라스트콜',
    ],
    proof: '직접 요리한 음식 사진 또는 포장 영수증 업로드',
    monthlySaving: 330000,
  },
  {
    id: 'm3', category: '식비', title: '저녁 줄이기', amount: 20000, difficulty: '쉬움', iconKey: 'dinner',
    description: '저녁만 바꿔도 일주일에 4만원이 남아요.',
    tips: [
      '비빔밥 데이 — 냉장고 남은 반찬 모아 비비기',
      '마트 PB 상품 공략 — 노브랜드, 시그니처 등 30~40% 저렴',
      '저녁 8~9시 마감 할인 — 당일 식품 30~50% 할인',
    ],
    proof: '저녁 식사 사진 또는 마트 영수증 업로드',
    monthlySaving: 440000,
  },
  {
    id: 'm4', category: '식비', title: '편의점 최고의 조합', amount: 5000, difficulty: '쉬움', iconKey: 'cvs',
    description: '편의점에서도 영양 챙기면서 저렴하게 먹을 수 있어요.',
    tips: [
      '든든한 한 끼 — 삼각김밥 2개 + 컵라면/국 = 3,500원 이하',
      '단백질 조합 — 닭가슴살 + 삶은 계란 + 두유 = 4,000원 이하',
      'PB 상품 활용 — CU 헤이루, GS25 유어스, 세븐셀렉트는 20~30% 저렴',
      '1+1·2+1 행사는 매주 화요일 변경, 행사 상품 위주로',
    ],
    proof: '편의점 영수증 또는 조합 사진 업로드',
    monthlySaving: 110000,
  },
  {
    id: 'm5', category: '식비', title: '싼 레시피 챌린지', amount: 30000, difficulty: '보통', iconKey: 'receipe',
    description: '1인분에 3,000원 이하로 만들 수 있는 레시피만 골라서 도전해요.',
    tips: [
      '계란 한 판(약 6,000원)으로 5일 반찬 해결',
      '두부 한 모(1,500원) — 두부조림·된장찌개·순두부',
      '냉동 야채 활용 — 신선보다 저렴하고 오래감',
    ],
    proof: '완성된 요리 사진 + 재료비 영수증 업로드',
    monthlySaving: 660000,
  },
  {
    id: 'm6', category: '여가', title: '도서관·무료 콘텐츠', amount: 30000, difficulty: '쉬움', iconKey: 'library',
    description: '돈 내고 배우던 것들을 무료로 대체해요.',
    tips: [
      '전자도서관 앱 설치 — 국립도서관 앱, 서울도서관 전자책 서비스에서 신간 포함 수만 권을 무료로 빌릴 수 있어요.',
      '지자체 평생학습관 검색 — 주민센터나 구청 홈페이지에서 영어·요가·요리·컴퓨터 강좌를 무료나 1만원 이하로 들을 수 있어요.',
      '지자체 운영 박물관·전시 — 서울시립미술관, 각 구립 박물관은 상설전 무료. 월 1회 방문 루틴으로 만들어두면 문화비 0원.',
    ],
    proof: '도서관 대출 기록 또는 강좌 수강 인증 사진',
  },
  {
    id: 'm7', category: '여가', title: '혼술 챌린지', amount: 20000, difficulty: '보통', iconKey: 'drink',
    description: '술집 한 번 가면 1인 4만원은 기본. 집에서 마시면 4,000원.',
    tips: [
      '편의점 혼술 세팅 — 맥주 2캔 + 안주 하나 = 5,000원 이하. 분위기 안 나도 취하는 건 똑같아요.',
      '막차 시간 미리 확인 — 약속 전에 막차 시간을 알아두고 그 안에 귀가 목표 설정. 자연스럽게 2차 3차를 줄일 수 있어요.',
      '친구 초대 홈파티로 전환 — 각자 안주 하나씩 들고 집에 모이면 1인당 5,000~10,000원으로 술집 분위기 그대로 즐겨요.',
      '술자리 횟수 기록하기 — 월별로 술자리 횟수와 지출을 적어보면 얼마나 쓰는지 실감해요. 보이면 줄이게 돼요.',
    ],
    proof: '집 혼술 사진 또는 막차 전 귀가 지하철 인증',
  },
  {
    id: 'm8', category: '여가', title: '무료 문화생활 루틴', amount: 30000, difficulty: '쉬움', iconKey: 'culture',
    description: '매달 문화생활에 쓰던 돈, 이번 달은 0원으로 채워봐요.',
    tips: [
      '네이버·카카오 무료 웹툰·웹소설 — 기다리면 무료. 정주행 욕심만 조금 내려놓으면 콘텐츠비 0원.',
      '유튜브로 공연 대체 — 클래식 공연, 뮤지컬 넘버, 스탠드업 코미디까지 유튜브에 다 있어요. 대형 스크린 TV로 보면 분위기 꽤 나요.',
      '지역 축제·플리마켓 — 서울 기준으로 주말마다 무료 야외 행사가 있어요. 서울문화포털(culture.seoul.go.kr)에서 미리 확인.',
    ],
    proof: '참여한 무료 행사 사진 또는 콘텐츠 캡처',
  },
  {
    id: 'm9', category: '여가', title: '미용실 체험단', amount: 20000, difficulty: '보통', iconKey: 'hair',
    description: '체험단으로 무료 시술 또는 추가 수입까지 만들 수 있어요.',
    tips: [
      "네이버 체험단 신청 — 네이버 '엑스퍼트' 또는 '인플루언서 체험단'에서 미용실 모집 글을 찾을 수 있어요. 블로그 지수 높을수록 유리해요.",
      '강남·홍대 신규 오픈 미용실 공략 — 오픈 초기에 포트폴리오용 모델을 무료로 구하는 미용실이 많아요. 인스타 DM으로 직접 연락해도 돼요.',
      '인스타·블로그 후기 조건 — 대부분 시술 전후 사진 + 인스타 or 블로그 후기가 조건이에요. 팔로워 적어도 성실한 후기면 선정되는 경우 많아요.',
      '미용 앱 이용 — 카카오헤어샵, 네이버 예약에서 신규 고객 할인 쿠폰을 노리면 첫 방문 50% 할인도 가능해요.',
    ],
    proof: '체험단 선정 화면 또는 시술 후기 게시 캡처',
  },
  {
    id: 'm10', category: '여가', title: '한 달 여가비 5만원 쓰기', amount: 50000, difficulty: '어려움', iconKey: 'leisure',
    description: '놀건 놀아야지. 근데 한달에 딱 5만원 내에서만.',
    tips: [
      '여가비 전용 봉투 만들기 — 현금 5만원을 봉투에 넣어두고 그 봉투에서만 꺼내 써요. 눈에서 보이면 아끼게 돼요.',
      '우선순위 정하기 — 이번 달 꼭 하고 싶은 여가 활동 하나만 소비하고 나머지는 무료로 대체하는 식으로 접근해요.',
      '할인 앱 챙기기 — 대학로 공연, 영화, 전시 등 문화 할인 앱(인터파크, 티켓베이)에서 50% 이하 티켓을 노려요.',
      '통신사 할인 확인하기 — 통신사 할인 중 여가생활 쿠폰은 공급은 많은데 수요는 적은편이라 상대적으로 쉽게 얻을 수 있어요.',
    ],
    proof: '월말 여가 관련 지출 내역 캡처, 무료/할인 여가 생활 사진 업로드',
  },
  {
    id: 'm11', category: '충동', title: '쇼핑 참기', amount: 100000, difficulty: '어려움', iconKey: 'shopping',
    description: '장바구니에 담아두면 살 것 같지만, 지우고 나면 꼭 필요하지 않았던 경우가 많아요.',
    tips: [
      '장바구니 삭제 인증 — 쿠팡·무신사·지그재그 장바구니를 비운 화면 캡처가 이 챌린지의 핵심',
      '48시간 룰 적용 — 사고 싶은 게 생기면 바로 사지 말고 장바구니에만 담고 48시간 뒤에 다시 봐요. 대부분 생각이 바뀌어 있어요.',
      '알림 차단 — 쇼핑앱 푸시 알림을 끄거나 앱을 홈화면 뒤 페이지로 이동. 보이지 않으면 생각도 덜 나요.',
      '대신할 것 찾기 — 쇼핑 욕구는 보통 심심하거나 스트레스받을 때 와요. 산책이나 유튜브 보는 것으로 다른 행동으로 대체해요.',
    ],
    proof: '장바구니 삭제 전/후 화면 캡처 업로드',
  },
  {
    id: 'm12', category: '충동', title: '택시 금지 (2주)', amount: 30000, difficulty: '보통', iconKey: 'taxi',
    description: '심야 택시 한 번에 15,000~30,000원. 막차 챙기면 그냥 아끼는 돈이에요.',
    tips: [
      '막차 시간 알림 설정 — 약속 장소 기준 막차 시간을 캘린더에 알람으로 등록해두면 자동으로 자리를 뜰 수 있어요.',
      '카풀 앱 활용 — 택시가 꼭 필요한 상황이라면 카풀로 비용을 분담하는 것도 방법이에요.',
      '약속 장소 조정 — 갈 때부터 대중교통 편한 곳으로 약속 잡기. 집에서 가까운 곳일수록 막차 걱정이 줄어요.',
      "지출 전 5초 생각 — 택시 부를 때 '이게 정말 필요한 비용인가?' 5초만 생각해봐요. 조금만 기다리면 버스 온다는 걸 알게 돼요.",
    ],
    proof: '대중교통 탑승 기록 또는 막차 귀가 인증 사진',
  },
  {
    id: 'm13', category: '충동', title: '통신비 절약', amount: 20000, difficulty: '보통', iconKey: 'phone',
    description: '통신비는 한 번만 바꿔도 매달 돈이 절약되는 구조예요.',
    tips: [
      '알뜰폰 요금제 비교 — 알뜰폰허브(mvno.kr)에서 데이터 사용량 기반으로 비교하면 월 8,000~15,000원짜리 요금제도 충분히 있어요.',
      '가족 결합 해지 검토 — 알뜰폰으로 전환해도 결합 유지되는 상품인지 먼저 확인하세요.',
      '번호 이동 이벤트 노리기 — 통신사 이동 시 공시지원금이나 추가 할인 이벤트가 분기마다 나와요. 타이밍 잘 맞추면 첫 달 공짜도 가능.',
    ],
    proof: '새 요금제 가입 완료 화면 캡처',
  },
  {
    id: 'm14', category: '충동', title: '물건 고치기', amount: 20000, difficulty: '보통', iconKey: 'repair',
    description: '버리고 새로 사기 전에 고쳐보는 것만으로도 꽤 많이 아낄 수 있어요.',
    tips: [
      '유튜브 수리 영상 먼저 검색 — 이어폰 단선, 가방 지퍼, 신발 밑창 등 웬만한 수리 방법은 다 나와요. 생각보다 어렵지 않아요.',
      '수선집 활용 — 옷 수선은 3,000~8,000원이면 돼요. 새 옷 사는 것보다 훨씬 저렴하고 애착도 생겨요.',
      '다이소 수리 용품 — 순간접착제, 보수 테이프, 가죽 복원제, 방수 스프레이 등 웬만한 수리 도구가 1,000~2,000원이에요.',
      "못 고칠 것 같으면 당근 먼저 — 수리가 어렵다면 버리기 전에 당근에 '부품용'으로 올려봐요. 누군가에겐 필요한 물건일 수 있어요.",
    ],
    proof: '수리 사진 업로드',
  },
  {
    id: 'm15', category: '충동', title: '친구 금지', amount: 100000, difficulty: '어려움', iconKey: 'friend',
    description: '약속을 줄이면 교통비·식비·술값이 한꺼번에 줄어요.',
    tips: [
      '약속 잡기 전에 잔액 확인 — 약속 잡기전 이번달 여가비 예산 확인하고 약속을 잡는 습관을 들이면 충동 지출이 확 줄어요.',
      '혼자 즐기는 취미 개발 — 한 달 동안 혼자 할 수 있는 것들(독서, 러닝, 요리)에 집중하면 외로움도 덜하고 돈도 덜 써요.',
      '주말 계획 미리 채우기 — 약속 없는 주말은 무지출 데이나 도서관·박물관 방문으로 미리 채워두면 충동적으로 약속 잡는 걸 막을 수 있어요.',
    ],
    proof: '주간 지출 내역 캡처',
  },
  {
    id: 'm16', category: '통장', title: '무지출 데이', amount: 30000, difficulty: '보통', iconKey: 'zero',
    description: '하루를 완전히 0원으로 보내는 챌린지. 생각보다 할 수 있어요.',
    tips: [
      '아침부터 계획 세우기 — 무지출 데이는 즉흥적으로 되기 어려워요. 전날 밤 결정하고 집에 식재료를 준비해두세요.',
      '산책 코스 개발 — 동네 공원이나 하천 변 걷기. 이어폰 꽂고 좋아하는 팟캐스트 들으면 2시간도 그냥 가요.',
      '집에서 즐기는 루틴 — 유튜브 요리 영상 따라 만들기, 도서관 앱에서 전자책 빌려 읽기, 밀린 드라마 몰아보기. 모두 0원.',
    ],
    proof: '당일 카드·계좌 지출 내역 캡처',
  },
  {
    id: 'm17', category: '통장', title: '당근마켓 챌린지', amount: 50000, difficulty: '쉬움', iconKey: 'carrot',
    description: '집에 안 쓰는 물건 5개만 팔아도 5만원은 쉽게 나와요.',
    tips: [
      '팔 물건 찾는 법 — 1년 넘게 안 쓴 것, 사놓고 후회한 것, 사이즈 안 맞는 옷. 이 세 가지 카테고리만 뒤져도 10개는 나와요.',
      '사진이 반이다 — 밝은 곳에서 깔끔하게 찍은 사진은 판매 속도를 2배 이상 높여줘요. 배경은 흰 벽이나 바닥이 제일 좋아요.',
      '가격 책정 팁 — 당근에서 같은 물건 검색하면 시세가 금방 파악돼요. 조금 낮게 부르면 당일 판매도 가능.',
      '나눔의 날 이벤트 (매월 11일) — 당근마켓이 매월 11일을 나눔의 날로 운영해요. 이날 물품 나눔·교환 이벤트에 참여하면 더 활발히 거래가 돼요.',
    ],
    proof: '판매 완료된 물건 거래 후기 캡처',
  },
  {
    id: 'm18', category: '통장', title: '기프티콘 팔기', amount: 10000, difficulty: '쉬움', iconKey: 'gifticon',
    description: '유효기간 지나기 전에 현금으로 바꿔요.',
    tips: [
      '카카오톡 선물함 먼저 확인 — 선물함에 잊고 있던 기프티콘이 꽤 많을 수 있어요. 유효기간 체크부터 시작.',
      '팔 수 있는 플랫폼 — 니콘내콘, 기프티스타 — 원래 금액의 80~95%로 현금화할 수 있어요.',
      '부분 사용 후 잔액 판매 — 일부만 쓴 기프티콘도 잔액 기준으로 판매 가능해요. 못 쓸 것 같으면 남은 금액이라도 회수.',
      '앱테크 병행 — 캐시워크, 토스 행운복권 등 리워드 앱. 짜투리 시간에 틈틈이 하면 한 달 5,000~10,000원은 모여요.',
    ],
    proof: '기프티콘 판매 완료 화면 캡처',
  },
  {
    id: 'm19', category: '통장', title: '갑자기 5만원 저금', amount: 50000, difficulty: '쉬움', iconKey: 'save',
    description: '지금 당장 5만원을 뽑아서 봉투에 넣어두는 챌린지.',
    tips: [
      "현금 바인더 만들기 — 봉투나 파일에 금액별로 나눠서 현금을 보관해요. 디지털보다 현금이 '돈이 줄어드는 감각'을 훨씬 강하게 느끼게 해줘요.",
      '자동 이체 설정 — 월급날 바로 다음 날 자동으로 5만원이 저축 통장으로 빠져나가게 설정해두면 아예 없는 돈이 돼요.',
      'OTT·구독 서비스 점검 — 쓰지 않는 구독 서비스 하나만 끊어도 월 1~2만원. 6개월이면 10만원.',
    ],
    proof: '현금 봉투 또는 저축 이체 완료 화면 캡처',
  },
  {
    id: 'm20', category: '통장', title: '단기 알바', amount: 50000, difficulty: '어려움', iconKey: 'alba',
    description: '짜투리 시간에 할 수 있는 단기 알바로 추가 수입을 만들어요.',
    tips: [
      '알바몬·알바천국 당일 알바 — 행사 도우미, 서빙, 포장 알바는 하루 6~8만원이에요. 전날 밤 검색하면 다음 날 바로 출근 가능한 자리도 있어요.',
      '크몽·숨고로 재능 판매 — 번역, 디자인, 영상 편집, 과외 등 갖고 있는 기술을 서비스로 올려봐요. 첫 주문이 어렵지 한 번 받으면 계속 들어와요.',
      '배달 플랫폼 주말 한정 — 쿠팡이츠, 배달의민족 라이더를 주말 2~3시간만 해도 3~5만원 가능해요. 자전거도 돼요.',
      '리서치 패널 참여 — 마크로밀 엠브레인, 오픈서베이 등 설문 패널 가입하면 설문 1건에 500~3,000포인트씩 쌓여요.',
    ],
    proof: '급여 입금 내역 또는 플랫폼 수익 화면 캡처',
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
