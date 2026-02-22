// ═══════════════════════════════════════════════════════════════
//  WORKDAY AUTOFILL — content.js
//  Floating sidebar UI + message listener.
//  Autofill functions are in autofill.js (loaded first).
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  if (document.getElementById('wday-fab-wrap')) return;

  // ── Inject CSS ───────────────────────────────────────────────
  const _style = document.createElement('style');
  _style.textContent = `
    #wday-fab-wrap {
      position: fixed !important;
      right: 0 !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
      pointer-events: auto !important;
    }
    #wday-popover {
      background: #ffffff !important;
      border: 1px solid #ccd6e8 !important;
      border-right: none !important;
      border-radius: 10px 0 0 10px !important;
      box-shadow: -4px 4px 20px rgba(0,0,0,0.16) !important;
      padding: 12px 11px !important;
      width: 182px !important;
      flex-direction: column !important;
      gap: 6px !important;
      display: none !important;
    }
    #wday-popover.wday-open { display: flex !important; }
    #wday-pop-header {
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #444 !important;
      padding-bottom: 7px !important;
      border-bottom: 1px solid #eee !important;
      margin-bottom: 1px !important;
      font-family: inherit !important;
    }
    .wday-btn {
      background: linear-gradient(135deg, #0052cc, #0073e6) !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 6px !important;
      padding: 8px 10px !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      cursor: pointer !important;
      text-align: left !important;
      font-family: inherit !important;
      width: 100% !important;
      box-sizing: border-box !important;
      transition: opacity 0.15s !important;
    }
    .wday-btn:hover { opacity: 0.88 !important; }
    .wday-btn-smart { background: linear-gradient(135deg, #1e7e34, #28a745) !important; }
    #wday-pop-status {
      font-size: 10px !important;
      font-weight: 600 !important;
      min-height: 14px !important;
      font-family: inherit !important;
    }
    #wday-fab-tab {
      background: linear-gradient(180deg, #0052cc, #0073e6) !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 8px 0 0 8px !important;
      padding: 14px 8px !important;
      cursor: pointer !important;
      writing-mode: vertical-lr !important;
      transform: rotate(180deg) !important;
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: 0.5px !important;
      box-shadow: -3px 2px 12px rgba(0,0,0,0.22) !important;
      user-select: none !important;
      font-family: inherit !important;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
    }
    #wday-fab-tab:hover { opacity: 0.9 !important; }
  `;
  document.head.appendChild(_style);

  // ── Build DOM ────────────────────────────────────────────────
  const wrap = document.createElement('div');
  wrap.id = 'wday-fab-wrap';

  const pop = document.createElement('div');
  pop.id = 'wday-popover';
  pop.innerHTML = `
    <div id="wday-pop-header">📋 Workday Autofill</div>
    <button class="wday-btn wday-btn-smart" id="wday-btn-smart">🎯 Smart Fill This Page</button>
    <hr style="border:none;border-top:1px solid #eee;margin:2px 0"/>
    <button class="wday-btn" id="wday-btn-app">⚡ Fill Application</button>
    <button class="wday-btn" id="wday-btn-q">⚡ Fill Questions</button>
    <button class="wday-btn" id="wday-btn-disc">⚡ Fill Disclosures</button>
    <button class="wday-btn" id="wday-btn-reg">⚡ Fill Registration</button>
    <div id="wday-pop-status"></div>
  `;

  const tab = document.createElement('button');
  tab.id = 'wday-fab-tab';
  tab.textContent = '⚡ Autofill';
  tab.title = 'Workday Autofill — click to open';

  wrap.appendChild(pop);
  wrap.appendChild(tab);
  document.body.appendChild(wrap);

  // ── Toggle ───────────────────────────────────────────────────
  let _autoOpen = false;

  // Load setting on page init; keep _autoOpen in sync with any future changes
  // from the popup toggle so the click handler always has the latest value.
  chrome.storage.local.get('sidebarAutoOpen', r => {
    _autoOpen = !!r.sidebarAutoOpen;
    if (_autoOpen) pop.classList.add('wday-open');
  });
  chrome.storage.onChanged.addListener(changes => {
    if ('sidebarAutoOpen' in changes) _autoOpen = !!changes.sidebarAutoOpen.newValue;
  });

  tab.addEventListener('click', e => { e.stopPropagation(); pop.classList.toggle('wday-open'); });
  // When auto-open is on, never close on outside clicks (autofill code calls
  // document.body.click() internally to dismiss dropdowns, which would otherwise
  // collapse the sidebar mid-fill).
  document.addEventListener('click', e => {
    if (_autoOpen) return;
    if (!wrap.contains(e.target)) pop.classList.remove('wday-open');
  });

  // ── Status helper ────────────────────────────────────────────
  const _statusEl = document.getElementById('wday-pop-status');
  let _statusTimer = null;
  function _setStatus(msg, color = '#1e7e34') {
    if (_statusTimer) clearTimeout(_statusTimer);
    _statusEl.textContent = msg;
    _statusEl.style.color = color;
    if (msg) _statusTimer = setTimeout(() => { _statusEl.textContent = ''; }, 4500);
  }

  // ── Page type detection ──────────────────────────────────────
  function detectPageType() {
    const text = document.body.innerText.toLowerCase();
    if (text.includes('voluntary self-identification') ||
        text.includes('equal employment opportunity') ||
        (text.includes('gender') && text.includes('ethnicity') && text.includes('veteran'))) {
      return 'disclosures';
    }
    if (document.querySelectorAll('input[type=password]').length >= 1 &&
        (text.includes('create account') || text.includes('sign in') || text.includes('register'))) {
      return 'account';
    }
    // Require actual Workday question elements — not just keyword text — because
    // application info pages often contain legal disclaimers mentioning
    // "work authorization" and "sponsorship", which would cause false positives.
    if (document.querySelector(
          "[data-automation-id='questionSetQuestion'], [data-automation-id='additionalQuestion']"
        ) || text.includes('how did you hear about')) {
      return 'questions';
    }
    return 'application';
  }

  // ── Load data helper ─────────────────────────────────────────
  function _withData(cb) {
    // chrome.runtime.id becomes undefined when the extension is reloaded/updated
    // while this content script is still alive. Guard against it so the stale
    // script shows a helpful message instead of throwing an uncaught error.
    if (!chrome.runtime?.id) {
      _setStatus('⚠ Extension was updated — reload the page.', '#c0392b');
      return;
    }
    try {
      chrome.storage.local.get(['workdayData', 'workdayCreds'], r => {
        if (chrome.runtime.lastError) {
          _setStatus('⚠ Extension was updated — reload the page.', '#c0392b');
          return;
        }
        if (!r.workdayData) { _setStatus('⚠ Open the extension and save your info first.', '#c0392b'); return; }
        cb(r.workdayData, r.workdayCreds || {});
      });
    } catch {
      _setStatus('⚠ Extension was updated — reload the page.', '#c0392b');
    }
  }

  // ── Run helper ───────────────────────────────────────────────
  function _run(fn, data, creds) {
    const result = fn(data, creds);
    if (result && typeof result.then === 'function') {
      result.then(r => _setStatus(`✓ ${r.filled} field(s) filled`));
    } else {
      _setStatus(`✓ ${result.filled} field(s) filled`);
    }
  }

  // ── Button wiring ────────────────────────────────────────────
  document.getElementById('wday-btn-smart').addEventListener('click', () => {
    _withData((data, creds) => {
      const type = detectPageType();
      const labels = { application: 'Application', questions: 'Questions', disclosures: 'Disclosures', account: 'Registration' };
      _setStatus(`Detected: ${labels[type] || type}…`, '#0052cc');
      if (type === 'application') {
        // Application pages often embed employment-eligibility questions alongside
        // the standard fields, so always run both functions together.
        autofillApplication(data).then(appRes => {
          const qRes = autofillQuestions(data);
          _setStatus(`✓ ${appRes.filled + qRes.filled} field(s) filled`);
        });
      } else if (type === 'questions') {
        _run(autofillQuestions, data);
      } else if (type === 'disclosures') {
        _run(autofillDisclosures, data);
      } else if (type === 'account') {
        const payload = { email: creds.reg_email || data.email || '', password: creds.reg_password || '', confirm: creds.reg_password_confirm || creds.reg_password || '' };
        if (!payload.email) { _setStatus('⚠ No email saved!', '#c0392b'); return; }
        _run(autofillRegistration, payload);
      }
    });
  });

  document.getElementById('wday-btn-app').addEventListener('click', () => _withData(data => _run(autofillApplication, data)));
  document.getElementById('wday-btn-q').addEventListener('click',   () => _withData(data => _run(autofillQuestions, data)));
  document.getElementById('wday-btn-disc').addEventListener('click',() => _withData(data => _run(autofillDisclosures, data)));
  document.getElementById('wday-btn-reg').addEventListener('click', () => {
    _withData((data, creds) => {
      const payload = { email: creds.reg_email || data.email || '', password: creds.reg_password || '', confirm: creds.reg_password_confirm || creds.reg_password || '' };
      if (!payload.email) { _setStatus('⚠ No email saved!', '#c0392b'); return; }
      _run(autofillRegistration, payload);
    });
  });

  // ── Message listener (for popup button clicks) ───────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.action === 'detectPageType') {
      sendResponse({ pageType: detectPageType() });
      return;
    }
    if (msg.action === 'setSidebarOpen') {
      if (msg.open) pop.classList.add('wday-open');
      else pop.classList.remove('wday-open');
      sendResponse({});
      return;
    }
    if (msg.action === 'autofill') {
      chrome.storage.local.get(['workdayData', 'workdayCreds'], r => {
        const data  = r.workdayData;
        const creds = r.workdayCreds || {};
        if (!data) { sendResponse({ success: false, filled: 0 }); return; }
        if (msg.type === 'application') {
          autofillApplication(data).then(res => sendResponse(res));
        } else if (msg.type === 'questions') {
          sendResponse(autofillQuestions(data));
        } else if (msg.type === 'disclosures') {
          sendResponse(autofillDisclosures(data));
        } else if (msg.type === 'registration') {
          const payload = { email: creds.reg_email || data.email || '', password: creds.reg_password || '', confirm: creds.reg_password_confirm || creds.reg_password || '' };
          sendResponse(autofillRegistration(payload));
        }
      });
      return true; // keep message channel open for async response
    }
  });

})();
