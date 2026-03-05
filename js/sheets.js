// ============================================================
// 📊 Google Sheets 연동 모듈 - sheets.js
// ============================================================

const SheetAPI = {

  // CSV → JSON 변환
  parseCSV(csv) {
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = (values[i] || '').replace(/"/g, '').trim();
      });
      return obj;
    }).filter(row => Object.values(row).some(v => v));
  },

  // 시트 데이터 가져오기
  async fetch(url) {
    try {
      const res = await fetch(url);
      const csv = await res.text();
      return this.parseCSV(csv);
    } catch (e) {
      console.warn('시트 로드 실패:', url);
      return [];
    }
  },

  // 캐시 적용 fetch (5분)
  _cache: {},
  async fetchCached(url, ttl = 300000) {
    const now = Date.now();
    if (this._cache[url] && now - this._cache[url].time < ttl) {
      return this._cache[url].data;
    }
    const data = await this.fetch(url);
    this._cache[url] = { data, time: now };
    return data;
  }
};

// ============================================================
// 상품 데이터 모듈
// ============================================================
const ProductAPI = {

  async getAll() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.PRODUCTS);
    return rows.map(row => ({
      id: row.id || '',
      name: row.name || '',
      price: parseInt(row.price) || 0,
      salePrice: parseInt(row.sale_price) || 0,
      category: row.category || '',
      subCategory: row.sub_category || '',
      image: row.image || 'https://via.placeholder.com/400x400?text=상품이미지',
      description: row.description || '',
      stock: parseInt(row.stock) || 0,
      badge: row.badge || '',        // NEW, BEST, SALE 등
      isFeatured: row.is_featured === 'TRUE',
      isActive: row.is_active !== 'FALSE',
    })).filter(p => p.isActive && p.name);
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
// 카테고리 데이터 모듈
// ============================================================
const CategoryAPI = {
  async getAll() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.CATEGORIES);
    return rows.map(row => ({
      id: row.id || '',
      name: row.name || '',
      icon: row.icon || '📦',
      parentId: row.parent_id || '',
      order: parseInt(row.order) || 0,
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
// 팝업 데이터 모듈
// ============================================================
const PopupAPI = {
  async getActive() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.POPUP, 60000);
    const today = new Date().toISOString().split('T')[0];
    return rows.filter(row => {
      const isActive = row.is_active === 'TRUE';
      const startOk = !row.start_date || row.start_date <= today;
      const endOk = !row.end_date || row.end_date >= today;
      const targetOk = !row.target || row.target === 'all' ||
        (CONFIG.IS_FRANCHISE && row.target === 'franchise') ||
        (!CONFIG.IS_FRANCHISE && row.target === 'hq');
      return isActive && startOk && endOk && targetOk;
    }).map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      image: row.image,
      link: row.link,
      width: row.width || '500px',
      position: row.position || 'center',
    }));
  }
};

// ============================================================
// 배너 데이터 모듈
// ============================================================
const BannerAPI = {
  async getActive() {
    const rows = await SheetAPI.fetchCached(CONFIG.SHEETS.BANNERS);
    const today = new Date().toISOString().split('T')[0];
    return rows.filter(row => {
      const isActive = row.is_active === 'TRUE';
      const startOk = !row.start_date || row.start_date <= today;
      const endOk = !row.end_date || row.end_date >= today;
      return isActive && startOk && endOk;
    }).map(row => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      image: row.image || '',
      bgColor: row.bg_color || '#FF5733',
      textColor: row.text_color || '#ffffff',
      link: row.link || '#',
      btnText: row.btn_text || '자세히 보기',
    })).sort((a, b) => (a.order || 0) - (b.order || 0));
  }
};
