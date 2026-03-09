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
// 🖼️ 이미지 URL 헬퍼 (파일명만 입력해도 자동으로 전체 URL 생성)
// ============================================================
function resolveImageUrl(val) {
  if (!val) return '';
  if (val.startsWith('http')) return val; // 이미 전체 URL
  return CONFIG.IMAGE_BASE + val;          // 파일명만 입력된 경우 자동 변환
}

// ============================================================
// 상품 데이터 (한글 헤더 매핑)
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
      detailImages: row['상세이미지'] ? row['상세이미지'].split('|').map(function(s){ return resolveImageUrl(s.trim()); }).join('|') : '',
      detailImages2: row['상세이미지2'] ? row['상세이미지2'].split('|').map(function(s){ return resolveImageUrl(s.trim()); }).join('|') : '',
      certImage: resolveImageUrl(row['인증이미지']),
      colors: row['색상'] || '',
      sizes: row['사이즈'] || '',
      supplier: row['공급사'] || '',
      youtube: row['유튜브'] || '',
      specs:   row['상세스펙'] || '', 
      caution: row['주의사항'] || '', 
    }))
    .filter(p => p.isActive && p.name)
    .sort((a, b) => {
      // 랭킹 공식: 판매수량×0.4 + 별점평균×0.4 + 리뷰수×0.2
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
        orderNo: row['주문번호'],
        author: row['작성자'],
        rating: parseInt(row['별점']) || 0,
        content: row['리뷰내용'],
        image: resolveImageUrl(row['리뷰이미지']),
        date: row['작성일'],
        reply: row['답글내용'],
        replyAuthor: row['답글작성자'],
        replyDate: row['답글작성일'],
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
      const target = row['대상'] || 'all';
      const targetOk = target === 'all' ||
        (CONFIG.IS_FRANCHISE && target === '가맹점') ||
        (!CONFIG.IS_FRANCHISE && target === '본사');
      return isActive && startOk && endOk && targetOk;
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
