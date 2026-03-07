var currentProduct = null;
var currentRating = 0;
var allReviews = [];
var images = [];
var currentImgIdx = 0;

function initPage() {
  try {
    var sn = document.getElementById('store-name');
    if (sn && typeof CONFIG !== 'undefined') sn.textContent = CONFIG.STORE.NAME;
  } catch(e){}
  try { Cart.init(); } catch(e){}

  loadShippingPolicy();
  var params = new URLSearchParams(location.search);
  var productId = params.get('id');
  if (!productId) { alert('상품 정보를 찾을 수 없습니다'); location.href = 'products.html'; return; }

  loadProduct(productId);
}

function loadProduct(id) {
  ProductAPI.getAll().then(function(products) {
    currentProduct = products.find(function(p){ return String(p.id) === String(id); });
    if (!currentProduct) throw new Error('not found');
    renderProduct(currentProduct);
    loadShippingPolicy();
    loadReviews(id);
    loadRelated();
  }).catch(function() {
    currentProduct = {
      id: id, name: '샘플 상품', price: 29000, salePrice: 19000,
      category: '의류', subCategory: '상의',
      image: 'https://picsum.photos/600/600?random=' + id,
      detailImages: 'https://picsum.photos/600/601?random='+id+'|https://picsum.photos/600/602?random='+id,
      description: '<h2>상품 소개</h2><p>고품질 소재를 사용하여 제작된 프리미엄 상품입니다.</p><div class="highlight-box">✅ 무료 반품 보장 · 정품 인증</div>',
      colors: '화이트|블랙|네이비', sizes: 'S|M|L|XL',
      stock: 100, badge: 'NEW', salesCount: 50, rating: 4.5, reviewCount: 12
    };
    renderProduct(currentProduct);
    loadShippingPolicy();
    loadReviews(id);
    loadRelated();
  });
}

function renderProduct(p) {
  document.title = p.name + ' - ' + (typeof CONFIG !== 'undefined' ? CONFIG.STORE.NAME : '담누리마켓');

  // 공급사는 sheets.js가 매핑한 값 사용 (없으면 '기본')

  var bcCat = document.getElementById('bc-category');
  var bcName = document.getElementById('bc-name');
  if (bcCat) bcCat.textContent = p.category;
  if (bcName) bcName.textContent = p.name;

  var detCat = document.getElementById('detail-category');
  if (detCat) detCat.textContent = p.category;

  if (p.subCategory) {
    var subWrap = document.getElementById('detail-subcategory-wrap');
    var subEl = document.getElementById('detail-subcategory');
    if (subEl) subEl.textContent = p.subCategory;
    if (subWrap) subWrap.style.display = 'inline';
  }

  var nameEl = document.getElementById('detail-name');
  if (nameEl) nameEl.textContent = p.name;

  // 이미지 갤러리
  var extraImages = p.detailImages ? p.detailImages.split('|').map(function(s){ return s.trim(); }).filter(Boolean) : [];
  images = [p.image].concat(extraImages).filter(Boolean);
  if (!images.length) images = ['https://picsum.photos/600/600?random=' + p.id];
  currentImgIdx = 0;
  renderGallery();

  // 뱃지
  if (p.badge) {
    var badge = document.getElementById('detail-badge');
    if (badge) {
      badge.textContent = p.badge;
      badge.className = 'gallery-badge product-badge badge-' + p.badge.toLowerCase();
      badge.style.display = 'block';
    }
  }

  // 별점
  var rating = p.rating || 0;
  var detRating = document.getElementById('detail-rating');
  var detReview = document.getElementById('detail-review-count');
  var detSales = document.getElementById('detail-sales');
  var tabReview = document.getElementById('tab-review-count');
  if (detRating) detRating.textContent = parseFloat(rating).toFixed(1);
  if (detReview) detReview.textContent = '(리뷰 ' + (p.reviewCount || 0) + '개)';
  if (detSales) detSales.textContent = '판매 ' + (p.salesCount || 0).toLocaleString() + '개';
  if (tabReview) tabReview.textContent = '(' + (p.reviewCount || 0) + ')';
  renderStars('detail-stars', rating);

  // 가격
  var price = p.salePrice || p.price;
  var detPrice = document.getElementById('detail-price');
  if (detPrice) detPrice.textContent = price.toLocaleString() + '원';
  if (p.salePrice && p.salePrice !== p.price) {
    var discount = Math.round((1 - p.salePrice / p.price) * 100);
    var origEl = document.getElementById('detail-original-price');
    var discEl = document.getElementById('detail-discount');
    if (origEl) { origEl.textContent = p.price.toLocaleString() + '원'; origEl.style.display = 'block'; }
    if (discEl) { discEl.textContent = discount + '% 할인'; discEl.style.display = 'inline-block'; }
  }
  if (price >= 50000) {
    var feeEl = document.getElementById('delivery-fee');
    if (feeEl) feeEl.textContent = '무료배송 🎉';
  }

  // 옵션 색상 (형식: 화이트:10|블랙:0|네이비:5 또는 화이트|블랙|네이비)
  if (p.colors) {
    var colorItems = p.colors.split('|').map(function(s){ return s.trim(); }).filter(Boolean);
    if (colorItems.length) {
      var sec = document.getElementById('option-color-section');
      var chips = document.getElementById('option-color-chips');
      if (sec) sec.classList.add('has-options');
      if (chips) chips.innerHTML = colorItems.map(function(c){
        var parts = c.split(':');
        var name = parts[0].trim();
        var stock = parts.length > 1 ? parseInt(parts[1]) : 999;
        var soldOut = stock === 0;
        return '<button class="option-chip' + (soldOut ? ' sold-out' : '') + '" '
          + 'onclick="selectOption(this,\'color\')" '
          + 'data-stock="' + stock + '" '
          + (soldOut ? 'disabled ' : '')
          + 'style="' + (soldOut ? 'opacity:0.4;text-decoration:line-through;cursor:not-allowed;' : '') + '">'
          + name + (soldOut ? ' (품절)' : '') + '</button>';
      }).join('');
    }
  }

  // 옵션 사이즈 (형식: S:10|M:5|L:0|XL:3 또는 S|M|L|XL)
  if (p.sizes) {
    var sizeItems = p.sizes.split('|').map(function(s){ return s.trim(); }).filter(Boolean);
    if (sizeItems.length) {
      var ssec = document.getElementById('option-size-section');
      var schips = document.getElementById('option-size-chips');
      if (ssec) ssec.classList.add('has-options');
      if (schips) schips.innerHTML = sizeItems.map(function(s){
        var parts = s.split(':');
        var name = parts[0].trim();
        var stock = parts.length > 1 ? parseInt(parts[1]) : 999;
        var soldOut = stock === 0;
        return '<button class="option-chip' + (soldOut ? ' sold-out' : '') + '" '
          + 'onclick="selectOption(this,\'size\')" '
          + 'data-stock="' + stock + '" '
          + (soldOut ? 'disabled ' : '')
          + 'style="' + (soldOut ? 'opacity:0.4;text-decoration:line-through;cursor:not-allowed;' : '') + '">'
          + name + (soldOut ? ' (품절)' : '') + '</button>';
      }).join('');
    }
  }

  // 재고
  var stockEl = document.getElementById('detail-stock');
  if (stockEl) stockEl.textContent = p.stock > 0 ? p.stock + '개 남음' : '품절';

  // 상품 설명
  var descEl = document.getElementById('detail-description');
  if (descEl) {
    var desc = p.description || '';
    var isHtml = /<[a-z][\s\S]*>/i.test(desc);
    if (isHtml) {
      descEl.classList.add('html-mode');
      descEl.innerHTML = desc || '<p>상품 상세 설명이 없습니다.</p>';
    } else {
      descEl.classList.add('text-mode');
      descEl.textContent = desc || '상품 상세 설명이 없습니다.';
    }
  }

  // 유튜브 영상
  renderYoutube(p.youtube);

  // 배송 예정일
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var days = ['일','월','화','수','목','금','토'];
  var dateEl = document.getElementById('delivery-date');
  if (dateEl) dateEl.textContent = (tomorrow.getMonth()+1) + '/' + tomorrow.getDate() + '(' + days[tomorrow.getDay()] + ') 도착 예정';

  updateTotal();
}

function renderYoutube(url) {
  var wrap = document.getElementById('youtube-wrap');
  if (!url || !url.trim()) {
    if (wrap) wrap.style.display = 'none';
    return;
  }
  // URL → embed ID 추출 (shorts, watch, youtu.be 모두 지원)
  var vid = '';
  var m = url.match(/shorts\/([^?&\/]+)/) ||
           url.match(/[?&]v=([^?&\/]+)/) ||
           url.match(/youtu\.be\/([^?&\/]+)/);
  if (m) vid = m[1];
  if (!vid) { if (wrap) wrap.style.display = 'none'; return; }

  if (!wrap) {
    // 동적으로 섹션 생성
    var descEl = document.getElementById('detail-description');
    if (!descEl) return;
    wrap = document.createElement('div');
    wrap.id = 'youtube-wrap';
    descEl.parentNode.insertBefore(wrap, descEl.nextSibling);
  }
  wrap.style.display = 'block';
  wrap.innerHTML = '<div style="margin-top:32px;border-top:1px solid var(--border);padding-top:24px;">'
    + '<h3 style="font-size:16px;font-weight:800;margin-bottom:16px;">🎬 상품 영상</h3>'
    + '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000;">'
    + '<iframe src="https://www.youtube.com/embed/' + vid + '?rel=0" '
    + 'style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" '
    + 'allowfullscreen loading="lazy"></iframe>'
    + '</div></div>';
}

function renderGallery() {
  var mainImg = document.getElementById('main-img');
  if (!mainImg) return;
  mainImg.src = images[currentImgIdx];
  mainImg.onerror = function(){ this.src = 'https://via.placeholder.com/600x600?text=이미지없음'; };

  var counter = document.getElementById('gallery-counter');
  if (counter && images.length > 1) {
    counter.textContent = (currentImgIdx + 1) + ' / ' + images.length;
    counter.style.display = 'block';
  }
  var prev = document.getElementById('gallery-prev');
  var next = document.getElementById('gallery-next');
  if (prev) prev.classList.toggle('gallery-nav-hidden', images.length <= 1);
  if (next) next.classList.toggle('gallery-nav-hidden', images.length <= 1);

  var thumbs = document.getElementById('gallery-thumbs');
  if (thumbs) {
    thumbs.innerHTML = images.map(function(img, i) {
      return '<div class="gallery-thumb ' + (i === currentImgIdx ? 'active' : '') + '" onclick="switchImage(' + i + ')">'
        + '<img src="' + img + '" alt="이미지' + (i+1) + '" loading="lazy" onerror="this.src=\'https://via.placeholder.com/72x72?text=?\'"></div>';
    }).join('');
  }
}

function switchImage(idx) { currentImgIdx = idx; renderGallery(); }

function galleryNav(dir, e) {
  if (e) e.stopPropagation();
  currentImgIdx = (currentImgIdx + dir + images.length) % images.length;
  renderGallery();
}

document.addEventListener('keydown', function(e) {
  var lb = document.getElementById('lightbox');
  if (lb && lb.classList.contains('open')) {
    if (e.key === 'ArrowLeft') lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
    if (e.key === 'Escape') closeLightboxBtn();
  } else {
    if (e.key === 'ArrowLeft') galleryNav(-1);
    if (e.key === 'ArrowRight') galleryNav(1);
  }
});

function openLightbox(idx) {
  currentImgIdx = idx;
  var lb = document.getElementById('lightbox');
  if (lb) { lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
  updateLightbox();
}

function updateLightbox() {
  var img = document.getElementById('lightbox-img');
  var cnt = document.getElementById('lightbox-counter');
  if (img) img.src = images[currentImgIdx];
  if (cnt) cnt.textContent = (currentImgIdx + 1) + ' / ' + images.length;
}

function closeLightbox(e) {
  if (e.target === document.getElementById('lightbox')) closeLightboxBtn();
}

function closeLightboxBtn() {
  var lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('open');
  document.body.style.overflow = '';
}

function lightboxNav(dir, e) {
  if (e) e.stopPropagation();
  currentImgIdx = (currentImgIdx + dir + images.length) % images.length;
  updateLightbox(); renderGallery();
}

function openLightboxUrl(url) {
  var img = document.getElementById('lightbox-img');
  var cnt = document.getElementById('lightbox-counter');
  var lb = document.getElementById('lightbox');
  if (img) img.src = url;
  if (cnt) cnt.textContent = '';
  if (lb) { lb.classList.add('open'); document.body.style.overflow = 'hidden'; }
}

var selectedOptions = {};

function selectOption(el, group) {
  el.closest('.option-chips').querySelectorAll('.option-chip').forEach(function(c){ c.classList.remove('active'); });
  el.classList.add('active');
  selectedOptions[group] = el.textContent.replace(' (품절)', '').trim();
  updateSelectedSummary();
}

function updateSelectedSummary() {
  var wrap = document.getElementById('selected-option-summary');
  if (!wrap) return;
  var parts = [];
  if (selectedOptions['color']) parts.push('색상: ' + selectedOptions['color']);
  if (selectedOptions['size']) parts.push('사이즈: ' + selectedOptions['size']);
  if (parts.length) {
    wrap.style.display = 'block';
    wrap.innerHTML = '<span style="font-size:13px;color:var(--accent);font-weight:600;">✅ ' + parts.join(' / ') + '</span>';
  } else {
    wrap.style.display = 'none';
  }
}

function checkRequiredOptions() {
  var hasColorOpt = document.getElementById('option-color-section') && 
                    document.getElementById('option-color-section').classList.contains('has-options');
  var hasSizeOpt = document.getElementById('option-size-section') && 
                   document.getElementById('option-size-section').classList.contains('has-options');
  if (hasColorOpt && !selectedOptions['color']) {
    alert('색상을 선택해주세요!');
    document.getElementById('option-color-section').scrollIntoView({behavior:'smooth'});
    return false;
  }
  if (hasSizeOpt && !selectedOptions['size']) {
    alert('사이즈를 선택해주세요!');
    document.getElementById('option-size-section').scrollIntoView({behavior:'smooth'});
    return false;
  }
  return true;
}

function renderStars(containerId, rating) {
  var el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = [1,2,3,4,5].map(function(i) {
    var filled = i <= Math.floor(rating) || (i - rating < 1 && rating % 1 >= 0.5);
    return '<span class="star" style="' + (filled ? '' : 'filter:grayscale(1);opacity:0.3') + '">⭐</span>';
  }).join('');
}

function changeQty(delta) {
  var input = document.getElementById('qty-input');
  input.value = Math.max(1, parseInt(input.value) + delta);
  updateTotal();
}

function updateTotal() {
  var qty = parseInt(document.getElementById('qty-input').value) || 1;
  var price = currentProduct ? (currentProduct.salePrice || currentProduct.price) : 0;
  var totalEl = document.getElementById('qty-total');
  if (totalEl) totalEl.textContent = '총 ' + (price * qty).toLocaleString() + '원';
}

function addToCart() {
  if (!currentProduct) return;
  if (!checkRequiredOptions()) return;
  var qty = parseInt(document.getElementById('qty-input').value) || 1;
  var productWithOptions = Object.assign({}, currentProduct);
  if (selectedOptions['color']) productWithOptions.selectedColor = selectedOptions['color'];
  if (selectedOptions['size']) productWithOptions.selectedSize = selectedOptions['size'];
  // 옵션 포함 상품명
  var optStr = [];
  if (selectedOptions['color']) optStr.push(selectedOptions['color']);
  if (selectedOptions['size']) optStr.push(selectedOptions['size']);
  if (optStr.length) productWithOptions.optionText = optStr.join(' / ');
  Cart.add(productWithOptions, qty);
}

function buyNow() {
  if (!currentProduct) return;
  if (!checkRequiredOptions()) return;
  alert('PG사 연동 후 결제 진행됩니다');
}

function toggleWish() {
  var btn = document.getElementById('wish-btn');
  if (btn) btn.textContent = btn.textContent === '🤍' ? '❤️' : '🤍';
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.detail-tab').forEach(function(b){ b.classList.remove('active'); });
  var panel = document.getElementById('tab-' + tabId);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
}

function loadReviews(productId) {
  try {
    ReviewAPI.getByProduct(productId).then(function(reviews) {
      allReviews = reviews || [];
      renderReviews(allReviews);
      renderReviewSummary(allReviews);
    }).catch(function(){ allReviews = []; renderReviews([]); renderReviewSummary([]); });
  } catch(e) { allReviews = []; renderReviews([]); renderReviewSummary([]); }
}

function renderReviewSummary(reviews) {
  var total = reviews.length;
  var avg = total ? (reviews.reduce(function(s,r){ return s + r.rating; }, 0) / total) : 0;
  var avgScore = document.getElementById('avg-score');
  var avgTotal = document.getElementById('avg-total');
  if (avgScore) avgScore.textContent = avg.toFixed(1);
  if (avgTotal) avgTotal.textContent = '총 ' + total + '개 리뷰';
  renderStars('avg-stars', avg);

  var bars = document.getElementById('review-bars');
  if (bars) {
    bars.innerHTML = [5,4,3,2,1].map(function(star) {
      var count = reviews.filter(function(r){ return r.rating === star; }).length;
      var pct = total ? (count/total*100) : 0;
      return '<div class="review-bar-row">'
        + '<span class="review-bar-label">' + star + '점</span>'
        + '<div class="review-bar-track"><div class="review-bar-fill" style="width:' + pct + '%"></div></div>'
        + '<span class="review-bar-count">' + count + '</span></div>';
    }).join('');
  }
}

function renderReviews(reviews) {
  var container = document.getElementById('review-list');
  if (!container) return;
  if (!reviews.length) {
    container.innerHTML = '<div class="review-empty"><div class="empty-icon">⭐</div><div>아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨주세요!</div></div>';
    return;
  }
  container.innerHTML = reviews.map(function(r) {
    return '<div class="review-item">'
      + '<div class="review-header">'
      + '<div class="review-avatar">' + (r.author ? r.author[0] : '?') + '</div>'
      + '<div><div class="review-author">' + (r.author || '익명') + '</div>'
      + '<div class="review-stars">' + [1,2,3,4,5].map(function(i){ return '<span class="star">' + (i <= r.rating ? '⭐' : '☆') + '</span>'; }).join('') + '</div></div>'
      + '<div class="review-date">' + (r.date || '') + '</div></div>'
      + '<div class="review-content">' + (r.content || '') + '</div>'
      + (r.image ? '<img src="' + r.image + '" class="review-img" alt="리뷰이미지" onclick="openLightboxUrl(\'' + r.image + '\')">' : '')
      + (r.reply ? '<div class="review-reply"><div class="review-reply-label">🏪 판매자 답글</div><div class="review-reply-content">' + r.reply + '</div></div>' : '')
      + '</div>';
  }).join('');
}

function filterReview(filter, btn) {
  document.querySelectorAll('.review-filter-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  if (filter === 'all') renderReviews(allReviews);
  else if (filter === 'photo') renderReviews(allReviews.filter(function(r){ return r.image; }));
  else if (filter === 3) renderReviews(allReviews.filter(function(r){ return r.rating <= 3; }));
  else renderReviews(allReviews.filter(function(r){ return r.rating === filter; }));
}

function setRating(val) {
  currentRating = val;
  document.querySelectorAll('.star-btn').forEach(function(btn, i){ btn.classList.toggle('active', i < val); });
}

function submitReview() {
  var text = document.getElementById('review-text').value.trim();
  if (!currentRating) { alert('별점을 선택해주세요'); return; }
  if (text.length < 10) { alert('리뷰를 10자 이상 입력해주세요'); return; }
  var newReview = { id: Date.now(), author: '나', rating: currentRating, content: text, date: new Date().toLocaleDateString('ko-KR'), reply: '', image: '' };
  allReviews.unshift(newReview);
  renderReviews(allReviews);
  renderReviewSummary(allReviews);
  document.getElementById('review-text').value = '';
  var charEl = document.getElementById('review-char');
  if (charEl) charEl.textContent = '0/500';
  setRating(0); currentRating = 0;
  alert('리뷰가 등록됐습니다!');
}

function loadRelated() {
  ProductAPI.getAll().then(function(products) {
    var related = products.filter(function(p){ return p.category === currentProduct.category && p.id !== currentProduct.id; }).slice(0, 4);
    var container = document.getElementById('related-products');
    if (!container) return;
    if (!related.length) { container.innerHTML = ''; return; }
    container.innerHTML = related.map(function(p) {
      var price = p.salePrice || p.price;
      var discount = p.salePrice ? Math.round((1-p.salePrice/p.price)*100) : 0;
      return '<div class="product-card" onclick="location.href=\'product.html?id=' + p.id + '\'">'
        + '<div class="product-img-wrap"><img src="' + p.image + '" alt="' + p.name + '" loading="lazy">'
        + (p.badge ? '<span class="product-badge badge-' + p.badge.toLowerCase() + '">' + p.badge + '</span>' : '') + '</div>'
        + '<div class="product-info"><div class="product-category">' + p.category + '</div>'
        + '<div class="product-name">' + p.name + '</div>'
        + '<div class="product-price"><span class="price-sale">' + price.toLocaleString() + '원</span>'
        + (p.salePrice ? '<span class="price-original">' + p.price.toLocaleString() + '원</span>' : '')
        + (discount ? '<span class="price-discount">' + discount + '%</span>' : '') + '</div></div></div>';
    }).join('');
  }).catch(function(){});
}

function copyLink() {
  navigator.clipboard.writeText(location.href).then(function(){ alert('링크가 복사됐습니다!'); });
}
function shareKakao() { alert('카카오 공유는 카카오 SDK 연동 후 사용 가능합니다'); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPage);
} else {
  initPage();
}

// ============================================================
// Q&A
// ============================================================
var allQna = [];
var currentQnaType = '배송문의';

function selectQnaType(btn, type) {
  currentQnaType = type;
  document.querySelectorAll('.qna-type-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
}

function submitQna() {
  var text = document.getElementById('qna-text');
  if (!text) return;
  var content = text.value.trim();
  if (content.length < 5) { alert('문의 내용을 5자 이상 입력해주세요'); return; }
  var isSecret = document.getElementById('qna-secret') && document.getElementById('qna-secret').checked;
  var newQna = {
    id: Date.now(),
    type: currentQnaType,
    title: currentQnaType + ' 문의',
    content: content,
    author: '고객',
    date: new Date().toLocaleDateString('ko-KR'),
    secret: isSecret,
    answer: ''
  };
  allQna.unshift(newQna);
  renderQna(allQna);
  text.value = '';
  var cnt = document.getElementById('tab-qna-count');
  if (cnt) cnt.textContent = '(' + allQna.length + ')';
  alert('문의가 등록됐습니다! 평일 24시간 이내 답변드립니다.');
}

function renderQna(list) {
  var container = document.getElementById('qna-list');
  if (!container) return;
  if (!list.length) {
    container.innerHTML = '<div class="qna-empty"><div class="empty-icon">❓</div><div>등록된 문의가 없습니다.</div></div>';
    return;
  }
  container.innerHTML = list.map(function(q) {
    var badgeClass = q.answer ? 'answered' : 'waiting';
    var badgeText  = q.answer ? '답변완료' : '답변대기';
    return '<div class="qna-item">'
      + '<div class="qna-header" onclick="toggleQna(' + q.id + ')">'
      + '<span class="qna-badge ' + badgeClass + '">' + badgeText + '</span>'
      + (q.secret ? '<span class="qna-badge secret">🔒 비밀글</span>' : '')
      + '<span class="qna-badge" style="background:#f0f0f0;color:#666;">' + q.type + '</span>'
      + '<span class="qna-title">' + (q.secret ? '비밀글입니다.' : q.content.substring(0,30) + (q.content.length>30?'...':'')) + '</span>'
      + '<span class="qna-meta">' + q.author + ' · ' + q.date + '</span>'
      + '</div>'
      + '<div class="qna-body" id="qna-body-' + q.id + '" style="display:none;">'
      + '<div style="padding:12px 0;color:var(--gray-dark);line-height:1.7;">' + q.content + '</div>'
      + (q.answer ? '<div class="qna-answer"><div class="qna-answer-label">🏪 판매자 답변</div><div>' + q.answer + '</div></div>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}

function toggleQna(id) {
  var body = document.getElementById('qna-body-' + id);
  if (body) body.style.display = body.style.display === 'none' ? 'block' : 'none';
}

// 배송/반품 탭에 구글시트 전화/이메일 반영
function updateShippingContact(phone, email) {
  var sp = document.getElementById('shipping-phone');
  var se = document.getElementById('shipping-email');
  if (sp && phone) sp.textContent = phone;
  if (se && email) se.textContent = email;
}

// ============================================================
// 배송정책 구글시트 자동 로드 (4단계 우선순위)
// 우선순위: ①가맹점+공급사 > ②기본+공급사 > ③가맹점+기본 > ④기본+기본
// ============================================================
function loadShippingPolicy() {
  var SHEET_ID = '1t804fRO8HfQtmOzpDAz2IZfzRDQ7t8LYllFGZr3ftUI';
  var url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
    + '/gviz/tq?tqx=out:csv&sheet=' + encodeURIComponent('배송정책');

  // 현재 가맹점ID (config.js에서 읽기, 없으면 '기본')
  var myFranchise = '기본';
  try {
    if (typeof CONFIG !== 'undefined' && CONFIG.FRANCHISE_ID) {
      myFranchise = CONFIG.FRANCHISE_ID;
    }
  } catch(e){}

  // 현재 상품의 공급사 (상품목록 C열 = supplier)
  var mySupplier = '기본';
  if (currentProduct) {
    // sheets.js가 supplier로 매핑하거나, 직접 col2로 접근
    mySupplier = currentProduct.supplier || currentProduct['공급사'] || '기본';
  }

  fetch(url).then(function(r){ return r.text(); }).then(function(csv) {
    // CSV 전체 파싱 → rows 배열
    var rows = [];
    var lines = csv.trim().split('\n').slice(1); // 헤더 제외
    lines.forEach(function(line) {
      var cols = parseCSVLine(line);
      if (cols.length >= 4) {
        rows.push({ franchise: cols[0], supplier: cols[1], key: cols[2], val: cols[3] });
      }
    });

    // 4단계 우선순위로 정책 조합
    var policy = {};
    var ITEMS = ['택배사','배송비','배송기간','교환반품기간','반품불가사유'];

    ITEMS.forEach(function(item) {
      var found = null;

      // ① 가맹점 + 공급사 (가장 구체적)
      if (!found && myFranchise !== '기본' && mySupplier !== '기본') {
        found = rows.find(function(r){ return r.franchise === myFranchise && r.supplier === mySupplier && r.key === item; });
      }
      // ② 기본 + 공급사
      if (!found && mySupplier !== '기본') {
        found = rows.find(function(r){ return r.franchise === '기본' && r.supplier === mySupplier && r.key === item; });
      }
      // ③ 가맹점 + 기본
      if (!found && myFranchise !== '기본') {
        found = rows.find(function(r){ return r.franchise === myFranchise && r.supplier === '기본' && r.key === item; });
      }
      // ④ 기본 + 기본 (전체 기본값)
      if (!found) {
        found = rows.find(function(r){ return r.franchise === '기본' && r.supplier === '기본' && r.key === item; });
      }

      if (found) policy[item] = found.val;
    });

    applyShippingPolicy(policy);
  }).catch(function(e){ console.log('배송정책 로드 실패:', e); });
}

function parseCSVLine(line) {
  var cols = [], cur = '', inQ = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
    else { cur += ch; }
  }
  cols.push(cur.trim());
  return cols;
}

function applyShippingPolicy(p) {
  // 택배사
  var methodEl = document.getElementById('ship-method');
  if (methodEl && p['택배사']) methodEl.textContent = p['택배사'];

  // 배송비
  var feeEl = document.getElementById('ship-fee');
  if (feeEl && p['배송비'] !== undefined) {
    var fee = parseInt(p['배송비']);
    feeEl.textContent = fee === 0 ? '무료배송 🎉' : fee.toLocaleString() + '원 (50,000원 이상 무료)';
    // 상단 배송비 표시도 업데이트
    var delivFee = document.getElementById('delivery-fee');
    if (delivFee) delivFee.textContent = fee === 0 ? '무료배송 🎉' : fee.toLocaleString() + '원 (50,000원 이상 무료)';
  }

  // 배송기간
  var periodEl = document.getElementById('ship-period');
  if (periodEl && p['배송기간']) periodEl.textContent = p['배송기간'];

  // 교환반품기간
  var retPeriodEl = document.getElementById('ret-period');
  if (retPeriodEl && p['교환반품기간']) retPeriodEl.textContent = '상품 수령 후 ' + p['교환반품기간'] + ' 이내';

  // 반품불가사유 (| 구분 → 줄바꿈)
  var rejectEl = document.getElementById('ret-reject');
  if (rejectEl && p['반품불가사유']) {
    var items = p['반품불가사유'].split('|');
    rejectEl.innerHTML = items.map(function(s){ return '• ' + s.trim(); }).join('<br>');
  }
}
