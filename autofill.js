// ═══════════════════════════════════════════════════════════════
//  WORKDAY AUTOFILL — autofill.js
//  Shared autofill engine. Loaded as a content script before
//  content.js so all four functions are globally available.
// ═══════════════════════════════════════════════════════════════

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
  fill(data.address1, 'address line 1', 'street address', 'address 1');
  fill(data.address2, 'address line 2', 'address 2', 'apt', 'suite');
  fill(data.city,     'city', 'municipality');
  fill(data.zip,      'postal code', 'zip code', 'zip');
  fill(data.country,  'country');
  promises.push(selectWorkdayDropdown(data.phone_type, 'phone device type', 'phone type', 'device type'));
  promises.push(selectWorkdayDropdown(data.state,      'state', 'province', 'region'));

  // Scan the page for all currently-visible job entry containers (3 strategies).
  // Called repeatedly after each "Add" click so newly-appeared forms are picked up.
  function findJobSections() {
    let sections = Array.from(document.querySelectorAll(
      "[data-automation-id^='workExperience-'], [data-automation-id^='workHistory-']"
    ));
    if (sections.length === 0) {
      const seen = new WeakSet();
      sections = Array.from(document.querySelectorAll("label, [data-automation-id$='Label']"))
        .filter(l => {
          const t = l.textContent.trim().toLowerCase();
          return t === 'job title' || t === 'position title' || t === 'title' || t === 'role';
        })
        .map(label => {
          let el = label.parentElement;
          for (let i = 0; i < 8; i++) {
            if (!el || el === document.body) break;
            const innerLabels = Array.from(el.querySelectorAll("label, [data-automation-id$='Label']"))
              .map(l => l.textContent.trim().toLowerCase());
            const hasCompany = innerLabels.some(t => t.includes('company') || t.includes('employer') || t.includes('organization'));
            const titleCount = innerLabels.filter(t => t === 'job title' || t === 'title' || t === 'position title').length;
            if (hasCompany && titleCount === 1 && !seen.has(el)) { seen.add(el); return el; }
            el = el.parentElement;
          }
          return null;
        })
        .filter(Boolean);
    }
    if (sections.length === 0) {
      sections = Array.from(document.querySelectorAll(
        "[data-automation-id='workExperienceSection'], [data-automation-id='workHistorySection'], " +
        "[class*='workExperience']:not(label):not(input), [class*='WorkHistory']:not(label):not(input)"
      ));
    }
    return sections;
  }

  // Find the "Add work experience" button that reveals a new blank job form.
  function findAddJobButton() {
    const byAttr = document.querySelector(
      "[data-automation-id*='workExperience'][data-automation-id*='dd' i], " +
      "[data-automation-id*='workHistory'][data-automation-id*='dd' i], " +
      "[data-automation-id='add-work-experience'], [data-automation-id='addWorkExperience']"
    );
    if (byAttr) return byAttr;
    return Array.from(document.querySelectorAll('button, [role="button"]')).find(btn => {
      const txt = btn.textContent.trim().toLowerCase();
      return txt.includes('add') && (
        txt.includes('experience') || txt.includes('work') || txt.includes('position') ||
        txt.includes('job') || txt.includes('another') || txt === 'add' || txt === '+ add'
      );
    }) || null;
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

  // Fill jobs sequentially: fill visible forms first, then click "Add" for each
  // remaining job and wait for the new form to appear before filling it.
  const jobsPromise = (async () => {
    if (!data.jobs?.length) return;
    const initialSections = findJobSections();

    if (initialSections.length >= data.jobs.length) {
      // All forms already on the page (e.g. pre-populated from a resume upload)
      data.jobs.forEach((job, i) => fillJobInSection(initialSections[i], job));
      return;
    }

    if (initialSections.length === 0) {
      // No job section found at all — try filling via global labels as last resort
      const job = data.jobs[0];
      fill(job.title,       'job title', 'title', 'position');
      fill(job.company,     'company', 'employer');
      fillDate(job.start_date, 'from', 'start date');
      if (!job.currently_working) fillDate(job.end_date, 'to', 'end date', 'through');
      fill(job.description, 'description', 'responsibilities');
      return;
    }

    // Fill the forms that are already visible
    initialSections.forEach((section, i) => fillJobInSection(section, data.jobs[i]));

    // For each remaining job, click "Add" and wait for the new form to appear
    for (let i = initialSections.length; i < data.jobs.length; i++) {
      const addBtn = findAddJobButton();
      if (!addBtn) break;

      const countBefore = findJobSections().length;
      addBtn.click();

      // Poll up to 3 s for the new form to appear in the DOM
      let newSection = null;
      for (let t = 0; t < 30; t++) {
        await new Promise(r => setTimeout(r, 100));
        const current = findJobSections();
        if (current.length > countBefore) {
          newSection = current[current.length - 1];
          break;
        }
      }

      if (newSection) fillJobInSection(newSection, data.jobs[i]);
      else break; // "Add" button gone or form didn't appear — stop
    }
  })();

  return Promise.all([...promises, jobsPromise]).then(() => ({ success: true, filled }));
}

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

  // Searches labels AND Workday question-text divs, walks up to ancestor with answer inputs
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

    // Prefer a specific questionSetQuestion element over a generic label, because generic
    // labels also match radio-option text (e.g. a radio labeled "Yes, I need sponsorship"
    // would incorrectly match a "sponsorship" search term).
    const questionEl =
      [...document.querySelectorAll("[data-automation-id='questionSetQuestion'], [data-automation-id='questionSetHeader']")]
        .find(el => labelTerms.some(t => el.textContent.trim().toLowerCase().includes(t.toLowerCase()))) ||
      [...document.querySelectorAll("label, [data-automation-id$='Label'], legend")]
        .find(el => labelTerms.some(t => el.textContent.trim().toLowerCase().includes(t.toLowerCase())));

    const allRadios = Array.from(container.querySelectorAll('input[type=radio]'));
    let targetRadios = allRadios;

    if (questionEl && allRadios.length > 0) {
      // Find question-header elements inside the container that come AFTER questionEl.
      // These mark where the NEXT question starts, giving us a boundary for our radios.
      // Note: we intentionally exclude generic <label> here to avoid matching radio-option labels.
      const laterQHeaders = [...container.querySelectorAll(
        "[data-automation-id='questionSetQuestion'], [data-automation-id='questionSetHeader'], legend"
      )].filter(q =>
        q !== questionEl &&
        (questionEl.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING)
      );

      // Radios that belong to our question: they appear after questionEl AND before the
      // start of any later question. compareDocumentPosition(x) & 4 means x is following.
      const narrowed = allRadios.filter(r => {
        const afterThis = !!(questionEl.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING);
        const beforeNext = laterQHeaders.length === 0 ||
          laterQHeaders.every(q => !!(r.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_FOLLOWING));
        return afterThis && beforeNext;
      });

      if (narrowed.length > 0) {
        targetRadios = narrowed;
      } else {
        // Fallback: at least filter to radios that come after the question element
        const afterOnly = allRadios.filter(r =>
          questionEl.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING
        );
        if (afterOnly.length > 0) targetRadios = afterOnly;
      }
    }

    const radioMatch = targetRadios.find(r => {
      const rl = document.querySelector(`label[for="${r.id}"]`) || r.closest('label');
      const txt = rl?.textContent.trim().toLowerCase() || r.value?.toLowerCase() || '';
      return txt === target || txt.startsWith(target);
    });
    if (radioMatch) { radioMatch.click(); filled++; return; }

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
    if (!value) return false;
    const el = findByLabel(...terms);
    if (el && setVal(el, value)) { filled++; return true; }
    return false;
  }

  fill(data.q_referral, 'hear about', 'referral source', 'how did you', 'how did you find', 'source');
  clickWorkdayOption(data.q_eligible,
    'legally eligible', 'eligible for employment', 'eligible to work in',
    'legally authorized', 'eligible to work', 'authorized to work', 'work in the us', 'work in this country');
  clickWorkdayOption(data.q_sponsorship, 'sponsorship', 'visa sponsorship', 'require sponsorship', 'now or in the future');
  clickWorkdayOption(data.q_work_auth,   'work authorization', 'authorization status', 'visa status', 'citizenship');
  clickWorkdayOption(data.q_accommodation,
    'essential function', 'reasonable accommodation', 'perform the essential', 'with or without accommodation');
  // Salary: try free-text fill first, fall back to dropdown click
  if (!fill(data.q_salary, 'salary', 'compensation', 'desired salary', 'salary requirement', 'salary expectation', 'expected salary', 'what are your salary')) {
    clickWorkdayOption(data.q_salary, 'salary', 'compensation', 'desired salary', 'salary requirement', 'salary expectation', 'expected salary', 'what are your salary');
  }
  clickWorkdayOption(data.q_salary_type, 'salary type', 'pay type', 'compensation type');

  return { success: true, filled };
}

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
    const btn = container.querySelector('button[aria-haspopup], button[aria-expanded], button');
    if (btn) {
      btn.click();
      setTimeout(() => {
        const opts = document.querySelectorAll("[role='option'], [data-automation-id='promptOption']");
        const m = Array.from(opts).find(o => o.textContent.trim().toLowerCase() === target) ||
                  Array.from(opts).find(o => o.textContent.trim().toLowerCase().startsWith(target));
        if (m) { m.click(); filled++; }
        else document.body.click();
      }, 450);
      return;
    }
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
