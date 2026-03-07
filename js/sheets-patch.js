// ============================================================
// sheets.js 패치 - 공급사/유튜브/이미지URL 자동처리
// ============================================================
(function() {
  if (typeof ProductAPI === 'undefined') return;

  // 이미지 URL 자동완성 함수
  // 파일명만 입력하면 IMAGE_BASE 자동으로 앞에 붙임
  // 이미 http로 시작하면 그대로 사용
  function resolveImg(val) {
    if (!val || !val.trim()) return '';
    var v = val.trim();
    if (v.startsWith('http')) return v;
    var base = (typeof CONFIG !== 'undefined' && CONFIG.IMAGE_BASE)
      ? CONFIG.IMAGE_BASE
      : 'https://min323300.github.io/myshop/images/';
    return base + v;
  }

  var _origGetAll = ProductAPI.getAll.bind(ProductAPI);
  ProductAPI.getAll = function() {
    return _origGetAll().then(function(products) {
      return products.map(function(p) {
        // 공급사
        if (!p.supplier && p['공급사']) p.supplier = p['공급사'];
        // 유튜브
        if (!p.youtube && p['유튜브']) p.youtube = p['유튜브'];
        // 이미지 URL 자동완성
        p.image        = resolveImg(p.image);
        p.detailImages = resolveImg(p.detailImages);
        p.detailImages2= resolveImg(p.detailImages2);
        return p;
      });
    });
  };
})();
