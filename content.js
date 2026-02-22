// ═══════════════════════════════════════════════════════════════
//  WORKDAY AUTOFILL — content.js
//  Injects a floating ⚡ Autofill tab on the right edge of every
//  Workday application page. Reads saved data from chrome.storage
//  and calls the autofill functions directly on the live DOM.
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // Guard: don't inject twice
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
    #wday-popover.wday-open {
      display: flex !important;
    }
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
    .wday-btn-smart {
      background: linear-gradient(135deg, #1e7e34, #28a745) !important;
    }
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
  tab.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.classList.toggle('wday-open');
  });
  document.addEventListener('click', (e) => {
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

  // ── Button wiring ────────────────────────────────────────────
  function _withData(cb) {
    chrome.storage.local.get(['workdayData', 'workdayCreds'], (r) => {
      if (!r.workdayData) {
        _setStatus('⚠ Open the extension and save your info first.', '#c0392b');
        return;
      }
      cb(r.workdayData, r.workdayCreds || {});
    });
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
    if (text.includes('how did you hear') ||
        text.includes('visa sponsorship') ||
        text.includes('work authorization') ||
        document.querySelector("[data-automation-id='additionalQuestion']")) {
      return 'questions';
    }
    return 'application';
  }

  document.getElementById('wday-btn-smart').addEventListener('click', () => {
    _withData((data, creds) => {
      const type = detectPageType();
      const labels = { application: 'Application', questions: 'Questions', disclosures: 'Disclosures', account: 'Registration' };
      _setStatus(`Detected: ${labels[type] || type}…`, '#0052cc');
      if (type === 'application') {
        autofillApplication(data).then((res) => _setStatus(`✓ ${res.filled} field(s) filled`));
      } else if (type === 'questions') {
        const res = autofillQuestions(data);
        _setStatus(`✓ ${res.filled} field(s) filled`);
      } else if (type === 'disclosures') {
        const res = autofillDisclosures(data);
        _setStatus(`✓ ${res.filled} field(s) filled`);
      } else if (type === 'account') {
        const payload = {
          email:    creds.reg_email            || data.email || '',
          password: creds.reg_password         || '',
          confirm:  creds.reg_password_confirm || creds.reg_password || '',
        };
        if (!payload.email) { _setStatus('⚠ No email saved!', '#c0392b'); return; }
        const res = autofillRegistration(payload);
        _setStatus(`✓ ${res.filled} field(s) filled`);
      }
    });
  });

  document.getElementById('wday-btn-app').addEventListener('click', () => {
    _withData((data) => {
      autofillApplication(data).then((res) => _setStatus(`✓ ${res.filled} field(s) filled`));
    });
  });

  document.getElementById('wday-btn-q').addEventListener('click', () => {
    _withData((data) => {
      const res = autofillQuestions(data);
      _setStatus(`✓ ${res.filled} field(s) filled`);
    });
  });

  document.getElementById('wday-btn-disc').addEventListener('click', () => {
    _withData((data) => {
      const res = autofillDisclosures(data);
      _setStatus(`✓ ${res.filled} field(s) filled`);
    });
  });

  document.getElementById('wday-btn-reg').addEventListener('click', () => {
    _withData((data, creds) => {
      const payload = {
        email:    creds.reg_email             || data.email || '',
        password: creds.reg_password          || '',
        confirm:  creds.reg_password_confirm  || creds.reg_password || '',
      };
      if (!payload.email) { _setStatus('⚠ No email saved!', '#c0392b'); return; }
      const res = autofillRegistration(payload);
      _setStatus(`✓ ${res.filled} field(s) filled`);
    });
  });

  // ════════════════════════════════════════════════════════════
  //  AUTOFILL FUNCTIONS
  //  Run directly in content-script context — full DOM access,
  //  no scripting.executeScript needed.
  // ════════════════════════════════════════════════════════════

  function autofillApplication(data) {
    let filled = 0;

    function setVal(el, value) {
      if (!el || value === undefined || value === null || value === '') return false;
      const proto  = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
      ['input', 'change', 'blur'].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
      return true;
    }

    function findByLabel(...terms) {
      for (const label of document.querySelectorAll("label, [data-automation-id$='Label'], [class*='label']")) {
        const txt = label.textContent.trim().toLowerCase();
        if (terms.some(t => txt.includes(t.toLowerCase()))) {
          if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
          const labelId = label.id;
          if (labelId) { const el = document.querySelector(`[aria-labelledby="${labelId}"]`); if (el) return el; }
          const parent = label.closest('div, li, section, [data-automation-id]');
          if (parent) { const el = parent.querySelector('input:not([type=hidden]), textarea, select'); if (el && el !== label) return el; }
        }
      }
      return null;
    }

    function fill(value, ...labelTerms) {
      if (!value) return;
      const el = findByLabel(...labelTerms);
      if (el && setVal(el, value)) filled++;
    }

    function selectWorkdayDropdown(optionText, ...labelTerms) {
      if (!optionText) return Promise.resolve();
      const label = Array.from(document.querySelectorAll("label, [data-automation-id$='Label']"))
        .find(l => labelTerms.some(t => l.textContent.trim().toLowerCase().includes(t.toLowerCase())));
      const container = label?.closest('[data-automation-id], div, li') || label?.parentElement;
      const btn = container?.querySelector('button[aria-haspopup], button[aria-expanded]') || container?.querySelector('button');
      if (btn) {
        btn.click();
        return new Promise(resolve => {
          setTimeout(() => {
            const options = document.querySelectorAll("[role='option'], [data-automation-id='promptOption'], li[tabindex]");
            const match = Array.from(options).find(o => o.textContent.trim().toLowerCase().includes(optionText.toLowerCase()));
            if (match) { match.click(); filled++; }
            resolve();
          }, 450);
        });
      }
      const sel = findByLabel(...labelTerms);
      if (sel?.tagName === 'SELECT') {
        const opt = Array.from(sel.options).find(o => o.text.toLowerCase().includes(optionText.toLowerCase()));
        if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); filled++; }
      }
      return Promise.resolve();
    }

    function fillDate(dateStr, ...labelTerms) {
      if (!dateStr) return;
      const parts = dateStr.split('/');
      const el = findByLabel(...labelTerms);
      if (el && el.tagName === 'INPUT') { if (setVal(el, dateStr)) { filled++; return; } }
      if (parts.length >= 2) {
        const label = Array.from(document.querySelectorAll('label'))
          .find(l => labelTerms.some(t => l.textContent.trim().toLowerCase().includes(t.toLowerCase())));
        const section = label?.closest("[data-automation-id], section, div[class*='date']");
        if (section) {
          const inputs = section.querySelectorAll('input');
          if (inputs.length >= 2) {
            if (setVal(inputs[0], parts[0])) filled++;
            if (parts.length === 2 && setVal(inputs[inputs.length - 1], parts[1])) filled++;
            if (parts.length === 3) {
              if (setVal(inputs[1], parts[1])) filled++;
              if (setVal(inputs[2], parts[2])) filled++;
            }
          }
        }
      }
    }

    const promises = [];
    fill(data.first_name, 'first name', 'given name');
    fill(data.last_name,  'last name',  'surname', 'family name');
    fill(data.email,      'email');
    fill(data.phone,      'phone number', 'phone', 'mobile');
    if (data.linkedin) {
      const socialEl = document.querySelector(
        "[data-automation-id='socialNetworkURL'] input, [data-automation-id='socialNetworkUrl'] input, " +
        "input[placeholder*='linkedin' i]"
      );
      if (socialEl && setVal(socialEl, data.linkedin)) filled++;
      else fill(data.linkedin, 'linkedin', 'linkedin url', 'linkedin profile', 'website', 'portfolio');
    }
    fill(data.address1,   'address line 1', 'street address', 'address 1');
    fill(data.address2,   'address line 2', 'address 2', 'apt', 'suite');
    fill(data.city,       'city', 'municipality');
    fill(data.zip,        'postal code', 'zip code', 'zip');
    fill(data.country,    'country');
    promises.push(selectWorkdayDropdown(data.phone_type, 'phone device type', 'phone type', 'device type'));
    promises.push(selectWorkdayDropdown(data.state,      'state', 'province', 'region'));

    // Strategy 1: numbered individual entry IDs (e.g. workExperience-0, workExperience-1)
    let jobSections = Array.from(document.querySelectorAll(
      "[data-automation-id^='workExperience-'], [data-automation-id^='workHistory-']"
    ));
    // Strategy 2: find each "Job Title" label and walk up to its unique containing card
    if (jobSections.length === 0) {
      const seen = new WeakSet();
      jobSections = Array.from(document.querySelectorAll("label, [data-automation-id$='Label']"))
        .filter(l => {
          const t = l.textContent.trim().toLowerCase();
          return t === "job title" || t === "position title" || t === "title" || t === "role";
        })
        .map(label => {
          let el = label.parentElement;
          for (let i = 0; i < 8; i++) {
            if (!el || el === document.body) break;
            const innerLabels = Array.from(el.querySelectorAll("label, [data-automation-id$='Label']"))
              .map(l => l.textContent.trim().toLowerCase());
            const hasCompany = innerLabels.some(t => t.includes("company") || t.includes("employer") || t.includes("organization"));
            const titleCount = innerLabels.filter(t => t === "job title" || t === "title" || t === "position title").length;
            if (hasCompany && titleCount === 1 && !seen.has(el)) { seen.add(el); return el; }
            el = el.parentElement;
          }
          return null;
        })
        .filter(Boolean);
    }
    // Strategy 3: legacy fallback — whole section container
    if (jobSections.length === 0) {
      jobSections = Array.from(document.querySelectorAll(
        "[data-automation-id='workExperienceSection'], [data-automation-id='workHistorySection'], " +
        "[class*='workExperience']:not(label):not(input), [class*='WorkHistory']:not(label):not(input)"
      ));
    }

    function fillJobInSection(section, job) {
      function sectionFill(value, ...terms) {
        if (!value) return;
        for (const label of section.querySelectorAll("label, [data-automation-id$='Label']")) {
          const txt = label.textContent.trim().toLowerCase();
          if (terms.some(t => txt.includes(t.toLowerCase()))) {
            const parent = label.closest('div, li');
            const el = parent?.querySelector('input:not([type=hidden]), textarea');
            if (el && setVal(el, value)) { filled++; return; }
            if (label.htmlFor) {
              const el2 = section.querySelector(`#${CSS.escape(label.htmlFor)}`);
              if (el2 && setVal(el2, value)) { filled++; return; }
            }
          }
        }
      }
      function sectionFillDate(dateStr, ...terms) {
        if (!dateStr) return;
        const parts = dateStr.split('/');
        for (const label of section.querySelectorAll('label')) {
          const txt = label.textContent.trim().toLowerCase();
          if (terms.some(t => txt.includes(t.toLowerCase()))) {
            const dateContainer = label.closest('div, li, [data-automation-id]');
            const inputs = dateContainer ? dateContainer.querySelectorAll('input') : [];
            if (inputs.length === 1) { if (setVal(inputs[0], dateStr)) filled++; }
            else if (inputs.length >= 2) {
              if (setVal(inputs[0], parts[0] || '')) filled++;
              if (setVal(inputs[inputs.length - 1], parts[parts.length - 1] || '')) filled++;
            }
            return;
          }
        }
      }
      sectionFill(job.title,       'title', 'position', 'job title', 'role');
      sectionFill(job.company,     'company', 'employer', 'organization');
      sectionFillDate(job.start_date, 'from', 'start', 'begin');
      if (!job.currently_working) sectionFillDate(job.end_date, 'to', 'end', 'through');
      sectionFill(job.linkedin,    'linkedin', 'linkedin url', 'profile url');
      sectionFill(job.description, 'description', 'responsibilities', 'duties', 'summary');
    }

    if (jobSections.length > 0 && data.jobs?.length) {
      data.jobs.forEach((job, i) => { if (jobSections[i]) fillJobInSection(jobSections[i], job); });
    } else if (data.jobs?.length) {
      const job = data.jobs[0];
      fill(job.title,       'job title', 'title', 'position');
      fill(job.company,     'company', 'employer');
      fillDate(job.start_date, 'from', 'start date');
      if (!job.currently_working) fillDate(job.end_date, 'to', 'end date', 'through');
      fill(job.description, 'description', 'responsibilities');
    }

    return Promise.all(promises).then(() => ({ success: true, filled }));
  }

  // ── Questions ─────────────────────────────────────────────────
  function autofillQuestions(data) {
    let filled = 0;

    function setVal(el, value) {
      if (!el || !value) return false;
      const proto  = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
      ['input', 'change', 'blur'].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
      return true;
    }

    function findByLabel(...terms) {
      for (const label of document.querySelectorAll("label, [data-automation-id$='Label']")) {
        const txt = label.textContent.trim().toLowerCase();
        if (terms.some(t => txt.includes(t.toLowerCase()))) {
          if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
          const parent = label.closest('div, li, [data-automation-id]');
          if (parent) { const el = parent.querySelector('input:not([type=hidden]), textarea, select'); if (el) return el; }
        }
      }
      return null;
    }

    function findContainer(...terms) {
      const candidates = [
        ...document.querySelectorAll("label, [data-automation-id$='Label'], legend"),
        ...document.querySelectorAll("[data-automation-id='questionSetQuestion'], [data-automation-id='questionSetHeader']"),
      ];
      for (const el of candidates) {
        const txt = el.textContent.trim().toLowerCase();
        if (terms.some(t => txt.includes(t.toLowerCase()))) {
          let parent = el.parentElement;
          for (let i = 0; i < 6; i++) {
            if (!parent || parent === document.body) break;
            if (parent.querySelector("input:not([type=hidden]), select, textarea, button[aria-haspopup], button[aria-expanded]")) {
              return parent;
            }
            parent = parent.parentElement;
          }
        }
      }
      return null;
    }

    function findByLabel(...terms) {
      const c = findContainer(...terms);
      if (!c) return null;
      for (const label of c.querySelectorAll('label')) {
        if (terms.some(t => label.textContent.trim().toLowerCase().includes(t.toLowerCase()))) {
          if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
        }
      }
      return c.querySelector('input:not([type=hidden]), textarea, select') || null;
    }

    function clickWorkdayOption(optionText, ...labelTerms) {
      if (!optionText) return;
      const target = optionText.toLowerCase();
      const container = findContainer(...labelTerms);
      if (!container) return;
      // Try radio buttons first (Workday Yes/No questions use radios)
      const radioMatch = Array.from(container.querySelectorAll('input[type=radio]')).find(r => {
        const rl = document.querySelector(`label[for="${r.id}"]`);
        const txt = rl?.textContent.trim().toLowerCase() || r.value?.toLowerCase() || '';
        return txt === target || txt.startsWith(target);
      });
      if (radioMatch) { radioMatch.click(); filled++; return; }
      // Try Workday dropdown button
      const btn = container.querySelector('button[aria-haspopup], button[aria-expanded], button');
      if (btn) {
        btn.click();
        setTimeout(() => {
          const opts = document.querySelectorAll("[role='option'], [data-automation-id='promptOption']");
          const m = Array.from(opts).find(o => o.textContent.trim().toLowerCase() === target) ||
                    Array.from(opts).find(o => o.textContent.trim().toLowerCase().startsWith(target));
          if (m) { m.click(); filled++; }
        }, 450);
      }
    }

    function fill(value, ...terms) {
      if (!value) return;
      const el = findByLabel(...terms);
      if (el && setVal(el, value)) filled++;
    }

    fill(data.q_referral, 'hear about', 'referral source', 'how did you', 'how did you find', 'source');
    clickWorkdayOption(data.q_eligible,    'legally authorized', 'eligible to work', 'authorized to work', 'work in the us');
    clickWorkdayOption(data.q_sponsorship, 'sponsorship', 'visa sponsorship', 'require sponsorship');
    clickWorkdayOption(data.q_work_auth,   'work authorization', 'authorization status', 'visa status', 'citizenship');
    fill(data.q_salary, 'salary', 'compensation', 'desired salary', 'salary requirement', 'expected salary');
    clickWorkdayOption(data.q_salary_type, 'salary type', 'pay type', 'compensation type');

    return { success: true, filled };
  }

  // ── Disclosures ───────────────────────────────────────────────
  function autofillDisclosures(data) {
    let filled = 0;
    const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

    function setVal(el, value) {
      if (!el || !value) return false;
      const proto  = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
      ['input', 'change', 'blur'].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
      return true;
    }

    function findByLabel(...terms) {
      for (const label of document.querySelectorAll("label, [data-automation-id$='Label']")) {
        const txt = label.textContent.trim().toLowerCase();
        if (terms.some(t => txt.includes(t.toLowerCase()))) {
          if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
          const parent = label.closest('div, li, [data-automation-id]');
          if (parent) { const el = parent.querySelector('input:not([type=hidden]), textarea, select'); if (el) return el; }
        }
      }
      return null;
    }

    function clickOption(optionText, ...labelTerms) {
      if (!optionText) return;
      const target = optionText.toLowerCase();
      const label = Array.from(document.querySelectorAll("label, [data-automation-id$='Label']"))
        .find(l => labelTerms.some(t => l.textContent.trim().toLowerCase().includes(t.toLowerCase())));
      const container = label?.closest('[data-automation-id], fieldset, div, li') || label?.parentElement;
      if (!container) return;
      // Try Workday dropdown button first
      const btn = container.querySelector('button[aria-haspopup], button[aria-expanded], button');
      if (btn) {
        btn.click();
        setTimeout(() => {
          const opts = document.querySelectorAll("[role='option'], [data-automation-id='promptOption']");
          // Exact match first to prevent "Male" matching "Female"
          const m = Array.from(opts).find(o => o.textContent.trim().toLowerCase() === target) ||
                    Array.from(opts).find(o => o.textContent.trim().toLowerCase().startsWith(target));
          if (m) { m.click(); filled++; }
          else document.body.click(); // close dropdown if no match
        }, 450);
        return; // Don't also try radio buttons when a dropdown is present
      }
      // Radio buttons only if no dropdown found (scoped to container, not whole page)
      const radioMatch = Array.from(container.querySelectorAll('input[type=radio]')).find(r => {
        const rl = document.querySelector(`label[for="${r.id}"]`);
        const txt = rl?.textContent.trim().toLowerCase() || r.value?.toLowerCase() || '';
        return txt === target || txt.startsWith(target);
      });
      if (radioMatch) { radioMatch.click(); filled++; }
    }

    function fill(value, ...terms) {
      if (!value) return;
      const el = findByLabel(...terms);
      if (el && setVal(el, value)) filled++;
    }

    clickOption(data.d_gender,     'gender', 'sex');
    clickOption(data.d_ethnicity,  'ethnicity', 'race', 'ethnic');
    clickOption(data.d_veteran,    'veteran', 'military');
    clickOption(data.d_disability, 'disability', 'disabled');

    const sigName = data.si_name || ((data.first_name || '') + ' ' + (data.last_name || '')).trim();
    fill(sigName, 'name', 'full name', 'signature');

    // Date — always today in MM/DD/YYYY; handle label-based and placeholder-based finding
    const sigDate = data.si_date || today;
    (function fillSigDate() {
      const el = findByLabel('date', 'today', 'signature date');
      if (el && el.tagName === 'INPUT' && setVal(el, sigDate)) { filled++; return; }
      const byPlaceholder = document.querySelector(
        "input[placeholder*='MM/DD/YYYY'], input[placeholder*='mm/dd/yyyy'], " +
        "input[data-automation-id='date'], input[data-automation-id='todayDate'], " +
        "input[data-automation-id='signatureDate']"
      );
      if (byPlaceholder && setVal(byPlaceholder, sigDate)) { filled++; return; }
    })();

    // Disability self-id: check the appropriate checkbox based on saved preference
    const disVal = (data.d_disability || '').toLowerCase();
    if (disVal) {
      const isNo  = disVal.includes('no') || disVal.includes('do not') || disVal.includes('don');
      const isYes = disVal.includes('yes') || (disVal.includes('have') && disVal.includes('disability'));
      const allInputs = Array.from(document.querySelectorAll('input[type=checkbox], input[type=radio]'));
      const disMatch = allInputs.find(cb => {
        const lbl = (document.querySelector(`label[for="${cb.id}"]`)?.textContent.trim().toLowerCase() || cb.value?.toLowerCase() || '');
        if (isNo)  return lbl.includes('do not') || lbl.includes('don') || (lbl.includes('no') && lbl.includes('disab'));
        if (isYes) return (lbl.startsWith('yes') || lbl.startsWith('i have')) && lbl.includes('disab');
        return false;
      });
      if (disMatch && !disMatch.checked) { disMatch.click(); filled++; }
    }

    return { success: true, filled };
  }

  // ── Registration ──────────────────────────────────────────────
  function autofillRegistration(creds) {
    let filled = 0;

    function setVal(el, value) {
      if (!el || !value) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(el, value); else el.value = value;
      ['input', 'change', 'blur'].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
      return true;
    }

    function findInput(...terms) {
      for (const label of document.querySelectorAll('label')) {
        const txt = label.textContent.trim().toLowerCase();
        if (terms.some(t => txt.includes(t.toLowerCase()))) {
          if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
          const el = label.closest('div')?.querySelector('input');
          if (el) return el;
        }
      }
      return null;
    }

    const emailEl = findInput('email', 'username', 'e-mail');
    if (emailEl && emailEl.type !== 'password' && setVal(emailEl, creds.email)) filled++;
    const pwInputs = Array.from(document.querySelectorAll('input[type=password]'));
    if (pwInputs[0] && setVal(pwInputs[0], creds.password)) filled++;
    if (pwInputs[1] && setVal(pwInputs[1], creds.confirm || creds.password)) filled++;

    return { success: true, filled };
  }

})();
