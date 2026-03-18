/**
 * 윈글로벌페이 연동 모듈 (winpay.js) v3.3
 * 실제 PG 샘플 6개 파일 완전 분석 기반
 *
 * ▶ PC  : 팝업 오픈 → 닫힘 감지 → /api/payment/status/{tid} 조회
 * ▶ 모바일 : window.location.href 페이지 이동 → userResultUrl?tid={tid} 로 리다이렉트
 *
 * v3.1: taxFreeCd '0000'→'00', cashReceipt 0→'0', btn id 수정
 * v3.2: order.html 파라미터명 불일치 수정 (amt/amount, ordNm/buyerName 등)
 * v3.3: saveOrder 호출 시 data 키로 감싸기 수정 (구글 시트 주문 저장 안 되는 문제 수정)
 *
 * 설치 위치: js/winpay.js
 */

const WinPay = {

  SERVER_URL:   'https://jh.winglobalpay.com',
  COMPLETE_URL: 'https://gasway.shop/order-complete.html',

  tmnId:    '',
  payKey:   '',
  jwtToken: '',

  // ─────────────────────────────────────────────────
  // 1. PG설정 시트에서 tmnId / payKey 로드
  // ─────────────────────────────────────────────────
  async loadConfig() {
    try {
      const res  = await fetch(CONFIG.APPS_SCRIPT_URL + '?action=getPGConfig');
      const data = await res.json();
      if (!data.tmnId || !data.payKey) throw new Error('PG 설정값 없음');
      this.tmnId  = data.tmnId;
      this.payKey = data.payKey;
      return true;
    } catch (e) {
      console.error('[WinPay] loadConfig 실패:', e);
      return false;
    }
  },

  // ─────────────────────────────────────────────────
  // 2. 터미널 로그인 → JWT 발급
  // ─────────────────────────────────────────────────
  async login() {
    try {
      const res = await fetch(`${this.SERVER_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${this.payKey}`
        },
        body: JSON.stringify({ tmnId: this.tmnId })
      });
      if (!res.ok) throw new Error(`로그인 HTTP ${res.status}`);
      const data = await res.json();
      if (!data.token) throw new Error('JWT 토큰 없음');
      this.jwtToken = data.token;
      sessionStorage.setItem('wp_jwt',    this.jwtToken);
      sessionStorage.setItem('wp_tmnId',  this.tmnId);
      sessionStorage.setItem('wp_payKey', this.payKey);
      return true;
    } catch (e) {
      console.error('[WinPay] login 실패:', e);
      return false;
    }
  },

  // ─────────────────────────────────────────────────
  // 3. 결제 요청 (PC/모바일 자동 분기)
  // ─────────────────────────────────────────────────
  async requestPayment(orderInfo) {
    const now  = new Date();
    const pad  = n => String(n).padStart(2, '0');
    const ts   = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const rand = Math.floor(Math.random() * 9000 + 1000);
    const tid  = `${this.tmnId}_${ts}${rand}`;

    const isMobile  = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const payMethod = orderInfo.payMethod || 'CARD';
    const mobileResultUrl = `${this.COMPLETE_URL}?tid=${tid}`;

    // ✅ order.html 파라미터명 양쪽 모두 수용
    const amt       = Number(orderInfo.amt       || orderInfo.amount    || 0);
    const ordNm     = orderInfo.ordNm            || orderInfo.buyerName  || '';
    const email     = orderInfo.email            || orderInfo.buyerEmail || '';
    const userId    = orderInfo.userId           || orderInfo.buyerTel   || 'guest';
    const goodsName = orderInfo.goodsName        || orderInfo.goodsname  || '';
    const prodCode  = 'P001'; // 상품코드 고정 (최대 10자 제한)

    if (!amt || amt <= 0) throw new Error('결제 금액이 올바르지 않습니다 (amt: ' + amt + ')');

    const payload = {
      tmnId:             this.tmnId,
      tid,
      amt,
      goodsName,
      ordNm,
      email,
      userId,
      productCode:       prodCode,
      productType:       '2',
      payMethod,
      taxFreeCd:         '00',
      cashReceipt:       '0',
      cashReceiptInfo:   '',
      isMandatoryIssuer: false,
      redirectUrl:       this.COMPLETE_URL,
      returnUrl:         this.COMPLETE_URL,
      userResultUrl:     mobileResultUrl,
    };

    console.log('[WinPay] 결제 요청 payload:', JSON.stringify(payload));

    const apiUrl = payMethod === 'BPAY'
      ? `${this.SERVER_URL}/api/bankpay/${isMobile ? 'mobile/' : ''}request`
      : `${this.SERVER_URL}/api/payment/${isMobile ? 'mobile/' : ''}request`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${this.jwtToken}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401 || res.status === 403) {
      this.jwtToken = '';
      sessionStorage.removeItem('wp_jwt');
      throw new Error('인증이 만료되었습니다. 다시 시도해주세요.');
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`결제요청 HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    if (!data.success) throw new Error(data.message || '결제요청 실패');

    // 임시 주문 정보 저장
    localStorage.setItem('wp_tid',   tid);
    localStorage.setItem('wp_order', JSON.stringify({
      tid,
      amt,
      goodsName,
      ordNm,
      email,
      userId,
      phone:         orderInfo.buyerTel      || orderInfo.phone      || '',
      receiverName:  orderInfo.receiverName  || ordNm,
      receiverPhone: orderInfo.receiverPhone || orderInfo.buyerTel   || '',
      address:       orderInfo.address       || '',
      zipCode:       orderInfo.zipCode       || '',
      productCode:   prodCode,
      dealerId:      orderInfo.dealerId      || '',
      referralCode:  orderInfo.referralCode  || '',
      memo:          orderInfo.memo          || '',
      qty:           orderInfo.qty           || 1,
    }));

    if (isMobile) {
      const paymentUrl = data.paymentUrl;
      if (payMethod === 'BPAY') {
        let pd = paymentUrl;
        if (typeof pd === 'string') pd = JSON.parse(pd);
        this._submitMobileBankPayForm(pd);
      } else {
        window.location.href = paymentUrl;
      }
    } else {
      if (payMethod === 'BPAY') {
        let pd = data.paymentUrl;
        if (typeof pd === 'string') pd = JSON.parse(pd);
        this._openBankPayPopup(pd, tid);
      } else {
        this._openPaymentPopup(data.paymentUrl, tid);
      }
    }

    return tid;
  },

  // ─────────────────────────────────────────────────
  // PC - 키움페이 팝업
  // ─────────────────────────────────────────────────
  _openPaymentPopup(paymentUrl, tid) {
    const W = 700, H = 1000;
    const popup = window.open(
      paymentUrl, 'WinPayment',
      `width=${W},height=${H},left=${(screen.width-W)/2},top=${(screen.height-H)/2},scrollbars=yes`
    );
    if (!popup || popup.closed) {
      alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
      return;
    }
    const timer = setInterval(() => {
      if (popup.closed) { clearInterval(timer); this._onPopupClosed(tid); }
    }, 1000);
  },

  // ─────────────────────────────────────────────────
  // PC - 뱅크페이 팝업
  // ─────────────────────────────────────────────────
  _openBankPayPopup(urlData, tid) {
    const W = 720, H = 600;
    const popup = window.open('', 'BankPayPopup',
      `width=${W},height=${H},left=${(screen.width-W)/2},top=${(screen.height-H)/2}`);
    if (!popup || popup.closed) {
      alert('팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도해주세요.');
      return;
    }
    this._postForm(urlData, 'BankPayPopup');
    const timer = setInterval(() => {
      if (popup.closed) { clearInterval(timer); this._onPopupClosed(tid); }
    }, 1000);
  },

  _submitMobileBankPayForm(urlData) {
    this._postForm(urlData, '_self');
  },

  _postForm(urlData, target) {
    const form = document.createElement('form');
    form.method = 'post';
    form.action = urlData.url;
    form.target = target;
    Object.entries(urlData).forEach(([k, v]) => {
      if (k !== 'url') {
        const inp = document.createElement('input');
        inp.type = 'hidden'; inp.name = k; inp.value = v;
        form.appendChild(inp);
      }
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  },

  // ─────────────────────────────────────────────────
  // PC - 팝업 닫힌 후 결제 결과 조회
  // ─────────────────────────────────────────────────
  async _onPopupClosed(tid) {
    try {
      const res  = await fetch(`${this.SERVER_URL}/api/payment/status/${tid}`, {
        headers: { 'Authorization': `Bearer ${this.jwtToken}` }
      });
      const data = await res.json();
      if (data.success) {
        await this._saveAndRedirect(tid, data);
      } else {
        alert('결제가 완료되지 않았습니다.\n' + (data.message || ''));
        const btn = document.getElementById('btn-order');
        if (btn) { btn.disabled = false; btn.textContent = '결제하기'; }
      }
    } catch (e) {
      console.error('[WinPay] 결제결과 확인 실패:', e);
      alert('결제 결과를 확인할 수 없습니다.\n마이페이지에서 주문 내역을 확인해주세요.');
    }
  },

  // ─────────────────────────────────────────────────
  // 주문 저장 → 완료 페이지 이동
  // ✅ v3.3 핵심 수정: action + data 구조로 감싸기
  // ─────────────────────────────────────────────────
  async _saveAndRedirect(tid, pgResult) {
    const saved   = JSON.parse(localStorage.getItem('wp_order') || '{}');
    const orderNo = 'ORD' + Date.now();
    const dealer  = saved.dealerId || localStorage.getItem('dealerId') || '';

    try {
      await fetch(CONFIG.APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveOrder',
          data: {                                           // ✅ v3.3 수정: data 키로 감싸기
            주문번호:     orderNo,
            주문일시:     new Date().toLocaleString('ko-KR'),
            대리점ID:     dealer,
            주문자명:     saved.ordNm        || '',
            연락처:       saved.phone        || '',
            이메일:       saved.email        || '',
            받는분:       saved.receiverName  || saved.ordNm || '',
            받는분연락처: saved.receiverPhone || saved.phone || '',
            배송주소:     saved.address      || '',
            우편번호:     saved.zipCode      || '',
            상품번호:     saved.productCode  || '',
            주문상품:     saved.goodsName    || '',
            수량:         saved.qty          || 1,
            결제금액:     pgResult.amt       || saved.amt || 0,
            결제방법:     'card',
            추천인코드:   saved.referralCode || '',
            회원구분:     (saved.userId && saved.userId !== 'guest') ? '회원' : '비회원',
            주문상태:     '결제완료',
            메모:         saved.memo         || '',
            PG주문번호:   tid,
            PG거래번호:   pgResult.wTid      || '',
          }
        })
      });
      console.log('[WinPay] 주문 저장 완료:', orderNo);
    } catch (e) {
      console.warn('[WinPay] 주문 저장 실패 (결제는 성공):', e);
    }

    localStorage.removeItem('cart');
    localStorage.removeItem('wp_tid');
    localStorage.removeItem('wp_order');

    const q = `?orderNo=${orderNo}`
      + `&amt=${pgResult.amt || saved.amt || 0}`
      + `&goodsName=${encodeURIComponent(saved.goodsName || '')}`
      + `&ordNm=${encodeURIComponent(saved.ordNm || '')}`
      + (dealer ? `&dealer=${dealer}` : '');

    window.location.href = `order-complete.html${q}`;
  },

  // ─────────────────────────────────────────────────
  // 전체 결제 시작
  // ─────────────────────────────────────────────────
  async startPayment(orderInfo) {
    const btn = document.getElementById('btn-order');
    if (btn) { btn.disabled = true; btn.textContent = '결제 준비중...'; }

    try {
      const cfgOk = await this.loadConfig();
      if (!cfgOk) throw new Error('PG 설정을 불러올 수 없습니다.\n잠시 후 다시 시도해주세요.');

      if (btn) btn.textContent = '인증 중...';
      const loginOk = await this.login();
      if (!loginOk) throw new Error('결제사 인증에 실패했습니다.\n잠시 후 다시 시도해주세요.');

      if (btn) btn.textContent = '결제창 열기...';
      await this.requestPayment(orderInfo);

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!isMobile && btn) btn.textContent = '결제 진행 중...';

    } catch (e) {
      alert('결제 오류:\n' + e.message);
      if (btn) { btn.disabled = false; btn.textContent = '결제하기'; }
    }
  }
};

// ✅ order.html의 WinPay.pay() 호출 호환용 별칭
WinPay.pay = function(opts) { return WinPay.startPayment(opts); };
