// ============================================================
// ⚙️ 설정 파일 - config.js (담누리마켓)
// ============================================================
const CONFIG = {
  // ✅ Google Sheets ID
  SHEET_ID: '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI',
  // ✅ 이미지 기본 URL (파일명만 입력하면 자동으로 앞에 붙음)
  IMAGE_BASE: 'https://min323300.github.io/myshop/images/',
  // 시트별 URL 자동 생성
  get SHEETS() {
    const base = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
    return {
      상품목록:   base + encodeURIComponent('상품목록'),
      카테고리:   base + encodeURIComponent('카테고리'),
      가맹점상품: base + encodeURIComponent('가맹점상품'),
      리뷰:       base + encodeURIComponent('리뷰'),
      가맹점:     base + encodeURIComponent('가맹점'),
      주문:       base + encodeURIComponent('주문'),
      정산:       base + encodeURIComponent('정산'),
      수수료:     base + encodeURIComponent('수수료'),
      PG설정:     base + encodeURIComponent('PG설정'),
      팝업:       base + encodeURIComponent('팝업'),
      배너:       base + encodeURIComponent('배너'),
      배송정책:   base + encodeURIComponent('배송정책'),
      사업자정보: base + encodeURIComponent('사업자정보'),
    };
  },
  // ✅ 본사 기본 정보 (구글시트 '사업자정보' 로드 전 기본값)
  STORE: {
    BRAND:   '담누리마켓',       // ← 헤더 로고에 표시 (구글시트 브랜드명으로 덮어씀)
    NAME:    '(주)비에스컴퍼니', // ← 푸터 사업자정보에만 표시 (구글시트 상호로 덮어씀)
    LOGO:    '🏪',
    TAGLINE: '담누리마켓에서 모든 것을 담으세요',
    PHONE:   '031-876-6606',
    EMAIL:   'hypo3300@naver.com',
    ADDRESS: '경기도 의정부시 호국로 1195-1 4층',
    SNS: {
      INSTAGRAM: 'https://instagram.com/',
      KAKAO:     'https://pf.kakao.com/',
      YOUTUBE:   'https://youtube.com/',
    }
  },
  // ✅ 가맹점 설정
  IS_FRANCHISE: false,
  FRANCHISE_ID: '',
  FRANCHISE_NAME: '',
  // ✅ PG 설정
  PG: {
    PROVIDER:      '',   // 윈글로벌 계약 후 입력 (예: 'winglobal')
    MERCHANT_ID:   '',   // 윈글로벌 MID 입력
    API_PROXY_URL: 'https://script.google.com/macros/s/AKfycbwWt00YBOSwCRK174BJD6QjhoPNwik123oeQKh8Lx8Cqm144RXmKNMvuD5KeyUsgmMg7w/exe',
  },
  // ✅ 기타 설정
  PRODUCTS_PER_PAGE: 12,
  CURRENCY: 'KRW',
  DEFAULT_THEME_COLOR: '#FF5733',
};
