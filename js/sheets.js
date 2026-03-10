// ============================================================
// 📊 Google Sheets 연동 모듈 - sheets.js (한글 헤더 버전)
// ============================================================

const SheetAPI = {
  parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const values = [];
      let cur = '', inQ = false;
      for (let ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { values.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      values.push(cur.trim());
      const obj = {};
      headers.forEach((h, i) => obj[h] = (values[i] || '').replace(/"/g, '').trim());
      return obj;
    }).filter(row => Object.values(row).some(v => v));
  },

  async fetch(url) {
    try {
      const res = await fetch(url);
      const csv = await res.text();
      return this.parseCSV(csv);
    } catch(e) { console.warn('시트 로드 실패:', url); return []; }
  },

  _cache: {},
  async fetchCached(url, ttl = 300000) {
    const now = Date.now();
    if (this._cache[url] && now - this._cache[url].time < ttl) return this._cache[url].data;
    const data = await this.fetch(url);
    this._cache[url] = { data, time: now };
    return data;
  }
};

// ============================================================
// 🖼️ 이미지 URL 헬퍼
// ============================================================
function resolveImageUrl(val) {
  if (!val) return '';
  if (val.startsWith('http')) return val;
  return CONFIG.IMAGE_BASE + val;
}

// ============================================================
// 상품 데이터
// ============================================================
const ProductAPI = {
  async getAll() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.상품목록);
    return rows.map(row => ({
      id: row['번호'] || '',
      name: row['상품명'] || '',
      price: parseInt(row['가격']) || 0,
      salePrice: parseInt(row['할인가']) || 0,
      category: row['카테고리'] || '',
      subCategory: row['세부카테고리'] || '',
      image: resolveImageUrl(row['이미지']) || 'https://via.placeholder.com/400x400?text=상품이미지',
      description: row['상품설명'] || '',
      stock: parseInt(row['재고']) || 0,
      badge: row['뱃지'] || '',
      isFeatured: row['추천여부'] === 'TRUE',
      isActive: row['사용여부'] !== 'FALSE',
      salesCount: parseInt(row['판매수량']) || 0,
      rating: parseFloat(row['별점평균']) || 0,
      reviewCount: parseInt(row['리뷰수']) || 0,
      detailImages: row['상세이미지'] ? row['상세이미지'].split('|').map(s => resolveImageUrl(s.trim())).join('|') : '',
      detailImages2: row['상세이미지2'] ? row['상세이미지2'].split('|').map(s => resolveImageUrl(s.trim())).join('|') : '',
      certImage: resolveImageUrl(row['인증이미지']),
      colors: row['색상'] || '',
      sizes: row['사이즈'] || '',
      supplier: row['공급사'] || '',
      youtube: row['유튜브'] || '',
      specs: row['상세스펙'] || '',
      caution: row['주의사항'] || '',
    }))
    .filter(p => p.isActive && p.name)
    .sort((a, b) => {
      const scoreA = (a.salesCount * 0.4) + (a.rating * 20 * 0.4) + (a.reviewCount * 0.2);
      const scoreB = (b.salesCount * 0.4) + (b.rating * 20 * 0.4) + (b.reviewCount * 0.2);
      return scoreB - scoreA;
    });
  },

  async getById(id) {
    const all = await this.getAll();
    return all.find(p => p.id === id) || null;
  },

  async getByCategory(category) {
    const all = await this.getAll();
    return all.filter(p => p.category === category);
  },

  async getFeatured() {
    const all = await this.getAll();
    return all.filter(p => p.isFeatured).slice(0, 8);
  },

  async search(query) {
    const all = await this.getAll();
    const q = query.toLowerCase();
    return all.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }
};

// ============================================================
// 카테고리 데이터
// ============================================================
const CategoryAPI = {
  _icons: {
    '의류':'👗','신발':'👟','뷰티':'💄','생활':'🏠',
    '전자':'📱','식품':'🍕','스포츠':'🏃','도서':'📚',
    '가방':'👜','액세서리':'💍','반려동물':'🐾','유아':'🍼',
    '가전':'🖥️','주방':'🍳','침구':'🛏️','욕실':'🚿',
  },
  async getAll() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.카테고리);
    return rows.map(row => ({
      id: row['번호'] || '',
      name: row['카테고리명'] || '',
      icon: this._icons[row['카테고리명']] || '📦',
      parentId: row['상위카테고리'] || '',
      order: parseInt(row['순서']) || 0,
    })).sort((a, b) => a.order - b.order);
  },
  async getMain() {
    const all = await this.getAll();
    return all.filter(c => !c.parentId);
  },
  async getSubs(parentId) {
    const all = await this.getAll();
    return all.filter(c => c.parentId === parentId);
  }
};

// ============================================================
// 리뷰 데이터
// ============================================================
const ReviewAPI = {
  async getByProduct(productId) {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.리뷰, 60000);
    return rows
      .filter(row => row['상품번호'] === String(productId) && row['공개여부'] !== 'FALSE')
      .map(row => ({
        id: row['번호'],
        productId: row['상품번호'],
        author: row['작성자'],
        rating: parseInt(row['별점']) || 0,
        content: row['리뷰내용'],
        image: resolveImageUrl(row['리뷰이미지']),
        date: row['작성일'],
        reply: row['답글내용'],
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async getAvgRating(productId) {
    const reviews = await this.getByProduct(productId);
    if (!reviews.length) return 0;
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  }
};

// ============================================================
// 팝업 데이터
// ============================================================
const PopupAPI = {
  async getActive() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.팝업, 60000);
    const today = new Date().toISOString().split('T')[0];
    return rows.filter(row => {
      const isActive = row['사용여부'] === 'TRUE';
      const startOk = !row['시작일'] || row['시작일'] <= today;
      const endOk = !row['종료일'] || row['종료일'] >= today;
      return isActive && startOk && endOk;
    }).map(row => ({
      id: row['번호'],
      title: row['제목'],
      content: row['내용'],
      image: resolveImageUrl(row['이미지']),
      link: row['링크'],
      width: row['팝업너비'] || '500px',
    }));
  }
};

// ============================================================
// 배너 데이터
// ============================================================
const BannerAPI = {
  async getActive() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.배너);
    const today = new Date().toISOString().split('T')[0];
    return rows.filter(row => {
      const isActive = row['사용여부'] === 'TRUE';
      const startOk = !row['시작일'] || row['시작일'] <= today;
      const endOk = !row['종료일'] || row['종료일'] >= today;
      return isActive && startOk && endOk;
    }).map(row => ({
      id: row['번호'],
      title: row['제목'],
      subtitle: row['부제목'],
      image: resolveImageUrl(row['이미지']),
      bgColor: row['배경색'] || '#FF5733',
      textColor: row['글자색'] || '#ffffff',
      link: row['링크'] || '#',
      btnText: row['버튼텍스트'] || '자세히 보기',
    })).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
};

// ============================================================
// 가맹점 데이터
// ============================================================
const FranchiseAPI = {
  async getById(id) {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.가맹점);
    return rows.find(row => row['가맹점ID'] === id) || null;
  },

  async getAll() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.가맹점);
    return rows.map(row => ({
      id: row['가맹점ID'],
      name: row['가맹점명'],
      owner: row['대표자명'],
      phone: row['연락처'],
      email: row['이메일'],
      address: row['주소'],
      domain: row['도메인'],
      color: row['테마색상'],
      logo: resolveImageUrl(row['로고이미지']),
      contractStart: row['계약일'],
      contractEnd: row['계약종료일'],
      status: row['상태'],
      commissionRate: parseFloat(row['수수료율']) || 2,
      bankAccount: row['정산계좌'],
    })).filter(f => f.status !== '해지');
  }
};

// ============================================================
// 👥 공동구매 API
// ============================================================
// 구글시트 "공동구매" 시트 컬럼:
// 번호 | 상품번호 | 제목 | 공동구매가 | 목표수량 | 현재참여 |
// 시작일시 | 종료일시 | 배송예정일 | 사용여부 | 설명
// ============================================================
const GroupBuyAPI = {

  parseDateTime(str) {
    if (!str) return null;
    return new Date(str.replace(' ', 'T'));
  },

  getStatus(item) {
    const now = new Date();
    if (!item.isActive) return 'disabled';
    if (item.startAt && now < item.startAt) return 'upcoming';
    if (item.endAt && now > item.endAt) return 'ended';
    return 'active';
  },

  getRemaining(endAt) {
    if (!endAt) return '';
    const diff = endAt - new Date();
    if (diff <= 0) return '마감';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return (d > 0 ? d + '일 ' : '')
      + String(h).padStart(2,'0') + ':'
      + String(m).padStart(2,'0') + ':'
      + String(s).padStart(2,'0');
  },

  getPct(current, target) {
    if (!target) return 0;
    return Math.min(100, Math.round((current / target) * 100));
  },

  async getAll() {
    const SHEET_ID = '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
    const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
      + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('공동구매');
    const rows = await SheetAPI.fetch(url);
    return rows.map(row => ({
      id:           row['번호'] || '',
      productId:    row['상품번호'] || '',
      title:        row['제목'] || '',
      groupPrice:   parseInt(row['공동구매가']) || 0,
      targetQty:    parseInt(row['목표수량']) || 100,
      currentQty:   parseInt(row['현재참여']) || 0,
      startAt:      this.parseDateTime(row['시작일시']),
      endAt:        this.parseDateTime(row['종료일시']),
      deliveryDate: row['배송예정일'] || '',
      isActive:     row['사용여부'] !== 'FALSE',
      description:  row['설명'] || '',
    }));
  },

  // 진행중인 공동구매 + 상품정보 병합 (쇼핑몰 메인용)
  async getActive() {
    const [all, products] = await Promise.all([this.getAll(), ProductAPI.getAll()]);
    return all
      .filter(g => this.getStatus(g) === 'active')
      .map(g => {
        const prod = products.find(p => String(p.id) === String(g.productId)) || {};
        return Object.assign({}, g, {
          name:          g.title || prod.name || '',
          image:         prod.image || '',
          category:      prod.category || '',
          originalPrice: prod.price || 0,
          pct:           this.getPct(g.currentQty, g.targetQty),
        });
      });
  },

  // 전체 상태 포함 + 상품정보 병합 (관리자용)
  async getAllWithProduct() {
    const [all, products] = await Promise.all([this.getAll(), ProductAPI.getAll()]);
    return all.map(g => {
      const prod = products.find(p => String(p.id) === String(g.productId)) || {};
      return Object.assign({}, g, {
        name:          g.title || prod.name || '',
        image:         prod.image || '',
        category:      prod.category || '',
        originalPrice: prod.price || 0,
        pct:           this.getPct(g.currentQty, g.targetQty),
        status:        this.getStatus(g),
      });
    });
  }
};
