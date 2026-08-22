(function () {
  'use strict';

  var cfg = window.BUTZIN_CONFIG || {};
  var PRODUCT_KEY = 'sleep-restart-14';
  var CHECKOUT_API = cfg.checkoutApiPath || '/api/checkout';

  var form = document.getElementById('checkout-form');
  if (!form) return;

  var emailInput = document.getElementById('checkout-email');
  var termsInput = document.getElementById('accept-terms');
  var digitalInput = document.getElementById('accept-digital');
  var submitBtn = document.getElementById('checkout-submit');
  var errorBox = document.getElementById('checkout-error');

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.hidden = false;
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = '';
  }

  function setLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.textContent = loading
      ? 'Пренасочване към плащане…'
      : '🔒 Завърши поръчката за 17 €';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var email = (emailInput && emailInput.value || '').trim();
    if (!email || email.indexOf('@') < 1) {
      showError('Моля, въведи валиден имейл.');
      return;
    }
    if (!termsInput || !termsInput.checked) {
      showError('Моля, приеми общите условия.');
      return;
    }
    if (!digitalInput || !digitalInput.checked) {
      showError('Моля, потвърди съгласието за незабавно предоставяне на дигиталния продукт.');
      return;
    }

    setLoading(true);

    fetch(CHECKOUT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productKey: PRODUCT_KEY,
        email: email,
      }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.url) {
          window.location.href = result.data.url;
          return;
        }
        setLoading(false);
        showError(
          (result.data && result.data.error) ||
            'Страницата за плащане временно не е налична. Опитай отново по-късно.',
        );
      })
      .catch(function () {
        setLoading(false);
        showError('Няма връзка със сървъра. Провери интернет връзката и опитай отново.');
      });
  });
})();
