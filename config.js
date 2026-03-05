// ============================================================
// ⚙️ 설정 파일 - config.js (담누리마켓)
// ============================================================

const CONFIG = {
  // ✅ Google Sheets ID (아래 1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYlIFGZr3ftUI 를 실제 ID로 교체)
  // 주소창에서 확인: docs.google.com/spreadsheets/d/[여기가 ID]/edit
  SHEET_ID: '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYlIFGZr3ftUI',

  // 시트별 URL 자동 생성 (시트 이름만 관리)
  get SHEETS() {
    const base = `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
    return {
      상품목록: base + encodeURIComponent('상품목록'),
      카테고리: base + encodeURIComponent('카테고리'),
      가맹점상품: base + encodeURIComponent('가맹점상품'),
      리뷰: base + encodeURIComponent('리뷰'),
      가맹점: base + encodeURIComponent('가맹점'),
      주문: base + encodeURIComponent('주문'),
      정산: base + encodeURIComponent('정산'),
      수수료: base + encodeURIComponent('수수료'),
      PG설정: base + encodeURIComponent('PG설정'),
      팝업: base + encodeURIComponent('팝업'),
      배너: base + encodeURIComponent('배너'),
    };
  },

  // ✅ 본사 기본 정보
  STORE: {
    NAME: '담누리마켓',
    LOGO: '🏪',
    TAGLINE: '담누리마켓에서 모든 것을 담으세요',
    PHONE: '1588-0000',
    EMAIL: 'help@damnuri.co.kr',
    ADDRESS: '주소를 입력하세요',
    SNS: {
      INSTAGRAM: 'https://instagram.com/',
      KAKAO: 'https://pf.kakao.com/',
      YOUTUBE: 'https://youtube.com/',
    }
  },

  // ✅ 가맹점 설정 (가맹점 쇼핑몰에서만 변경)
  IS_FRANCHISE: false,
  FRANCHISE_ID: '',
  FRANCHISE_NAME: '',

  // ✅ PG 설정 (PG사 확정 후 입력)
  PG: {
    PROVIDER: '',
    MERCHANT_ID: '',
    API_PROXY_URL: '',
  },

  // ✅ 기타 설정
  PRODUCTS_PER_PAGE: 12,
  CURRENCY: 'KRW',
  DEFAULT_THEME_COLOR: '#FF5733',
};
