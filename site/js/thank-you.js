(function () {
  'use strict';

  var cfg = window.BUTZIN_CONFIG || {};
  var STATUS_API = cfg.statusApiPath || '/api/post-purchase';
  var MAX_POLLS = 10;
  var POLL_MS = 1600;

  var params = new URLSearchParams(window.location.search);
  var sessionId = params.get('session_id') || '';

  var titleEl = document.getElementById('ty-title');
  var messageEl = document.getElementById('ty-message');
  var emailEl = document.getElementById('ty-email');
  var actionsEl = document.getElementById('ty-actions');
  var supportEl = document.getElementById('ty-support');

  if (!sessionId) {
    setState('invalid', 'Липсва валидна сесия. Ако плащането е минало, пиши на поддръжка.');
    return;
  }

  var attempts = 0;
  var cancelled = false;

  function setState(kind, message) {
    if (messageEl) messageEl.textContent = message;
    if (titleEl) {
      if (kind === 'access_granted') titleEl.textContent = 'Покупката е потвърдена';
      else if (kind === 'invalid' || kind === 'canceled') titleEl.textContent = 'Нужна е проверка';
      else titleEl.textContent = 'Подготвяме достъпа ти';
    }
    if (supportEl) {
      supportEl.hidden = !(kind === 'delayed' || kind === 'invalid' || kind === 'canceled' || kind === 'error');
    }
  }

  function renderActions(data) {
    if (!actionsEl) return;
    actionsEl.innerHTML = '';
    actionsEl.hidden = false;

    var primary = document.createElement('a');
    primary.className = 'ty-btn ty-btn-primary';
    if (data.activationUrl && !data.alreadyHasAccount) {
      primary.href = data.activationUrl;
      primary.textContent = 'Създай профил в Somniora';
    } else {
      primary.href = data.loginUrl || '/app/login';
      primary.textContent = 'Вход в Somniora Academy';
    }
    actionsEl.appendChild(primary);

    var secondary = document.createElement('a');
    secondary.className = 'ty-btn ty-btn-secondary';
    secondary.href = data.classroomUrl || '/app/';
    secondary.textContent = 'Към програмата';
    actionsEl.appendChild(secondary);
  }

  function poll() {
    if (cancelled) return;
    attempts += 1;

    fetch(STATUS_API + '?session_id=' + encodeURIComponent(sessionId) + '&funnel=1')
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .then(function (result) {
        if (cancelled) return;
        var data = result.data || {};

        if (result.status === 400 || result.status === 404) {
          setState('invalid', data.error || 'Невалидна или неизвестна сесия.');
          return;
        }

        if (!result.ok && result.status !== 402) {
          if (attempts < MAX_POLLS) {
            setState('preparing', 'Достъпът се подготвя…');
            setTimeout(poll, POLL_MS);
            return;
          }
          setState(
            'delayed',
            'Плащането може да е успешно, но достъпът още се обработва. Не плащай повторно.',
          );
          return;
        }

        if (data.email && emailEl) {
          emailEl.textContent = 'Имейл на поръчката: ' + data.email;
          emailEl.hidden = false;
        }

        if (data.pending || data.status === 'preparing_access' || data.status === 'checking') {
          setState('preparing', data.message || 'Плащането е потвърдено. Достъпът се подготвя…');
          if (attempts < MAX_POLLS) {
            setTimeout(poll, POLL_MS);
          } else {
            setState('delayed', 'Достъпът се обработва. Опитай да презаредиш страницата след минута.');
          }
          return;
        }

        if (data.status === 'canceled') {
          setState('canceled', data.message || 'Плащането е отказано или сесията е изтекла.');
          return;
        }

        if (data.ok || data.status === 'access_granted') {
          setState(
            'access_granted',
            data.message ||
              (data.alreadyHasAccount
                ? 'Плащането е успешно. Влез с имейла от покупката в Somniora Academy.'
                : 'Плащането е успешно. Създай профил с имейла от поръчката, за да получиш достъп.'),
          );
          renderActions(data);
          return;
        }

        setState('error', data.error || data.message || 'Неуспешна проверка.');
      })
      .catch(function () {
        if (cancelled) return;
        if (attempts < MAX_POLLS) {
          setTimeout(poll, POLL_MS);
          return;
        }
        setState('delayed', 'Временен проблем с проверката. Опитай да презаредиш страницата след минута.');
      });
  }

  setState('checking', 'Проверяваме плащането…');
  poll();

  window.addEventListener('pagehide', function () {
    cancelled = true;
  });
})();
