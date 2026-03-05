// ============================================================
// ⚙️ 설정 파일 - config.js
// 여기서 Google Sheets URL과 기본 설정을 관리합니다
// ============================================================

const CONFIG = {
  // ✅ 본사 Google Sheets 공개 URL (Sheet ID로 교체하세요)
  // Google Sheets → 파일 → 웹에 게시 → CSV 형식으로 게시 후 URL 입력
  SHEETS: {
    // 상품 목록 시트
    PRODUCTS: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=products',
    // 카테고리 시트
    CATEGORIES: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=categories',
    // 팝업 설정 시트
    POPUP: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=popup',
    // 가맹점 설정 시트
    FRANCHISE: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=franchise',
    // 배너 설정 시트
    BANNERS: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=banners',
  },

  // ✅ 본사 기본 정보
  STORE: {
    NAME: '담누리마켓',               // 쇼핑몰 이름
    LOGO: '🏪',                  // 로고 이모지 (이미지로 교체 가능)
    TAGLINE: '담누리마켓에서 모든 것을 담으세요',
    PHONE: '1588-0000',
    EMAIL: 'help@damnuri.co.kr',
    ADDRESS: '서울시 강남구 테헤란로 123',
    SNS: {
      INSTAGRAM: 'https://instagram.com/',
      KAKAO: 'https://pf.kakao.com/',
      YOUTUBE: 'https://youtube.com/',
    }
  },

  // ✅ 가맹점 여부 설정 (가맹점 쇼핑몰에서는 true로 변경)
  IS_FRANCHISE: false,
  FRANCHISE_ID: '',              // 가맹점 ID (가맹점만 사용)
  FRANCHISE_NAME: '',            // 가맹점명 (가맹점만 사용)

  // ✅ PG 설정 (PG사 확정 후 입력)
  PG: {
    PROVIDER: '',                // 'iamport' | 'tosspayments' | 'nice' 등
    MERCHANT_ID: '',             // 본사 가맹점 ID
    API_PROXY_URL: '',           // Apps Script 프록시 URL (보안)
  },

  // ✅ 기타 설정
  PRODUCTS_PER_PAGE: 12,         // 페이지당 상품 수
  CURRENCY: 'KRW',
  DEFAULT_THEME_COLOR: '#FF5733', // 메인 포인트 컬러
};

// 가맹점 설정 오버라이드 (Google Sheets에서 불러옴)
async function loadFranchiseConfig() {
  if (!CONFIG.IS_FRANCHISE || !CONFIG.FRANCHISE_ID) return;
  try {
    const data = await SheetAPI.fetch(CONFIG.SHEETS.FRANCHISE);
    const franchise = data.find(row => row.id === CONFIG.FRANCHISE_ID);
    if (franchise) {
      CONFIG.STORE.NAME = franchise.name || CONFIG.STORE.NAME;
      CONFIG.STORE.PHONE = franchise.phone || CONFIG.STORE.PHONE;
      CONFIG.DEFAULT_THEME_COLOR = franchise.color || CONFIG.DEFAULT_THEME_COLOR;
      document.documentElement.style.setProperty('--accent', franchise.color);
    }
  } catch(e) {
    console.log('가맹점 설정 로드 실패, 기본값 사용');
  }
}
