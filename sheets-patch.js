// ============================================================
// sheets.js 공급사 컬럼 패치
// sheets.js의 ProductAPI 파싱 이후 supplier 필드 추가
// sheets.js 파일 수정이 어려울 경우 이 파일을 sheets.js 뒤에 로드
// ============================================================
(function() {
  if (typeof ProductAPI === 'undefined') return;

  var _origGetAll = ProductAPI.getAll.bind(ProductAPI);
  ProductAPI.getAll = function() {
    return _origGetAll().then(function(products) {
      return products.map(function(p) {
        // 공급사 필드가 없으면 빈값 → '기본' 처리는 loadShippingPolicy에서
        if (!p.supplier && p['공급사']) p.supplier = p['공급사'];
        return p;
      });
    });
  };
})();
