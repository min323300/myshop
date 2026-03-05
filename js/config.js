const CONFIG = {
  SHEET_ID: '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI',

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

  IS_FRANCHISE: false,
  FRANCHISE_ID: '',
  FRANCHISE_NAME: '',

  PG: {
    PROVIDER: '',
    MERCHANT_ID: '',
    API_PROXY_URL: '',
  },

  PRODUCTS_PER_PAGE: 12,
  CURRENCY: 'KRW',
  DEFAULT_THEME_COLOR: '#FF5733',
};

// SHEETS URL 별도 생성 (this 문제 해결)
const BASE_URL = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
CONFIG.SHEETS = {
  상품목록: BASE_URL + encodeURIComponent('상품목록'),
  카테고리: BASE_URL + encodeURIComponent('카테고리'),
  가맹점상품: BASE_URL + encodeURIComponent('가맹점상품'),
  리뷰: BASE_URL + encodeURIComponent('리뷰'),
  가맹점: BASE_URL + encodeURIComponent('가맹점'),
  주문: BASE_URL + encodeURIComponent('주문'),
  정산: BASE_URL + encodeURIComponent('정산'),
  수수료: BASE_URL + encodeURIComponent('수수료'),
  PG설정: BASE_URL + encodeURIComponent('PG설정'),
  팝업: BASE_URL + encodeURIComponent('팝업'),
  배너: BASE_URL + encodeURIComponent('배너'),
};
