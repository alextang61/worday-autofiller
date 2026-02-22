// ═══════════════════════════════════════════════════════════
//  WORKDAY AUTOFILL — popup.js
//  Handles popup UI only. Autofill is delegated to content.js
//  via chrome.tabs.sendMessage.
// ═══════════════════════════════════════════════════════════

// ── Status / badge helpers ────────────────────────────────

function showStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = type;
  if (type === 'success' || type === 'info') {
    setTimeout(() => { el.className = ''; el.textContent = ''; }, 4000);
  }
}

function flashBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.textContent = `✓ ${count} filled`;
  badge.classList.add('show');
  const btn = badge.previousElementSibling;
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✅ Done! Review the page';
    btn.classList.add('flashing');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('flashing'); }, 2500);
  }
  setTimeout(() => badge.classList.remove('show'), 5000);
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ── Job entry builder ─────────────────────────────────────

let jobCount = 0;
let eduCount = 0;

function createJobEntry(data = {}) {
  jobCount++;
  const id = jobCount;
  const isCurrent = data.currently_working || false;
  const div = document.createElement('div');
  div.className = 'job-entry';
  div.dataset.jobId = id;
  const titlePreview = data.title ? ` — ${data.title}` : '';
  div.innerHTML = `
    <div class="job-header">
      <span class="job-label">Job ${id}${titlePreview}</span>
      <span class="toggle">▾</span>
    </div>
    <div class="job-body" id="job-body-${id}">
      <div class="field">
        <label>Job Title</label>
        <input type="text" id="job_title_${id}" value="${esc(data.title)}" placeholder="Software Engineer" />
      </div>
      <div class="field">
        <label>Company</label>
        <input type="text" id="job_company_${id}" value="${esc(data.company)}" placeholder="Acme Corp" />
      </div>
      <div class="row">
        <div class="field">
          <label>From (MM/YYYY)</label>
          <input type="text" id="job_start_${id}" value="${esc(data.start_date)}" placeholder="01/2020" />
        </div>
        <div class="field">
          <label>To (MM/YYYY)</label>
          <input type="text" id="job_end_${id}" value="${esc(data.end_date)}" placeholder="03/2024" ${isCurrent ? 'disabled' : ''} />
        </div>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" id="job_current_${id}" ${isCurrent ? 'checked' : ''} />
        <label for="job_current_${id}">I currently work here</label>
      </div>
      <div class="field">
        <label>Location</label>
        <input type="text" id="job_location_${id}" value="${esc(data.location)}" placeholder="Atlanta, GA" />
      </div>
      <div class="field">
        <label>Description</label>
        <textarea id="job_desc_${id}" placeholder="Key responsibilities...">${esc(data.description)}</textarea>
      </div>
      <div class="remove-job">Remove this job</div>
    </div>
  `;
  div.querySelector('.job-header').addEventListener('click', () => {
    const body = document.getElementById(`job-body-${id}`);
    const tog  = div.querySelector('.toggle');
    body.classList.toggle('collapsed');
    tog.textContent = body.classList.contains('collapsed') ? '▸' : '▾';
  });
  div.querySelector(`#job_current_${id}`).addEventListener('change', function () {
    document.getElementById(`job_end_${id}`).disabled = this.checked;
  });
  div.querySelector(`#job_title_${id}`).addEventListener('input', function () {
    div.querySelector('.job-label').textContent = `Job ${id}${this.value ? ' — ' + this.value : ''}`;
  });
  div.querySelector('.remove-job').addEventListener('click', () => div.remove());
  return div;
}

function esc(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function addJob(data = {}) {
  document.getElementById('jobs-container').appendChild(createJobEntry(data));
}

// ── Education entry builder ───────────────────────────────

function createEduEntry(data = {}) {
  eduCount++;
  const id = eduCount;
  const isCurrent = data.currently_attending || false;
  const div = document.createElement('div');
  div.className = 'job-entry';
  div.dataset.eduId = id;
  const preview = data.school ? ` — ${data.school}` : '';
  div.innerHTML = `
    <div class="job-header">
      <span class="job-label">Education ${id}${preview}</span>
      <span class="toggle">▾</span>
    </div>
    <div class="job-body" id="edu-body-${id}">
      <div class="field">
        <label>School / University</label>
        <input type="text" id="edu_school_${id}" value="${esc(data.school)}" placeholder="Georgia Tech" />
      </div>
      <div class="field">
        <label>Degree</label>
        <input type="text" id="edu_degree_${id}" value="${esc(data.degree)}" placeholder="Bachelor of Science" />
      </div>
      <div class="field">
        <label>Field of Study / Major</label>
        <input type="text" id="edu_field_${id}" value="${esc(data.field_of_study)}" placeholder="Computer Science" />
      </div>
      <div class="row">
        <div class="field">
          <label>From (MM/YYYY)</label>
          <input type="text" id="edu_start_${id}" value="${esc(data.start_date)}" placeholder="08/2018" />
        </div>
        <div class="field">
          <label>To (MM/YYYY)</label>
          <input type="text" id="edu_end_${id}" value="${esc(data.end_date)}" placeholder="05/2022" ${isCurrent ? 'disabled' : ''} />
        </div>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" id="edu_current_${id}" ${isCurrent ? 'checked' : ''} />
        <label for="edu_current_${id}">Currently attending</label>
      </div>
      <div class="field">
        <label>GPA <span style="font-weight:400;color:#999">(optional)</span></label>
        <input type="text" id="edu_gpa_${id}" value="${esc(data.gpa)}" placeholder="3.8" />
      </div>
      <div class="remove-job">Remove this education</div>
    </div>
  `;
  div.querySelector('.job-header').addEventListener('click', () => {
    const body = document.getElementById(`edu-body-${id}`);
    const tog  = div.querySelector('.toggle');
    body.classList.toggle('collapsed');
    tog.textContent = body.classList.contains('collapsed') ? '▸' : '▾';
  });
  div.querySelector(`#edu_current_${id}`).addEventListener('change', function () {
    document.getElementById(`edu_end_${id}`).disabled = this.checked;
  });
  div.querySelector(`#edu_school_${id}`).addEventListener('input', function () {
    div.querySelector('.job-label').textContent = `Education ${id}${this.value ? ' — ' + this.value : ''}`;
  });
  div.querySelector('.remove-job').addEventListener('click', () => div.remove());
  return div;
}

function addEdu(data = {}) {
  document.getElementById('edu-container').appendChild(createEduEntry(data));
}

// ── Collect all form data ─────────────────────────────────

function collectFormData() {
  const jobs = [];
  document.querySelectorAll('#jobs-container .job-entry').forEach(entry => {
    const id = entry.dataset.jobId;
    jobs.push({
      title:             document.getElementById(`job_title_${id}`)?.value.trim()    || '',
      company:           document.getElementById(`job_company_${id}`)?.value.trim()  || '',
      start_date:        document.getElementById(`job_start_${id}`)?.value.trim()    || '',
      end_date:          document.getElementById(`job_end_${id}`)?.value.trim()      || '',
      currently_working: document.getElementById(`job_current_${id}`)?.checked       || false,
      location:          document.getElementById(`job_location_${id}`)?.value.trim() || '',
      description:       document.getElementById(`job_desc_${id}`)?.value.trim()     || '',
    });
  });
  const education = [];
  document.querySelectorAll('#edu-container .job-entry').forEach(entry => {
    const id = entry.dataset.eduId;
    education.push({
      school:              document.getElementById(`edu_school_${id}`)?.value.trim()  || '',
      degree:              document.getElementById(`edu_degree_${id}`)?.value.trim()  || '',
      field_of_study:      document.getElementById(`edu_field_${id}`)?.value.trim()   || '',
      start_date:          document.getElementById(`edu_start_${id}`)?.value.trim()   || '',
      end_date:            document.getElementById(`edu_end_${id}`)?.value.trim()     || '',
      currently_attending: document.getElementById(`edu_current_${id}`)?.checked      || false,
      gpa:                 document.getElementById(`edu_gpa_${id}`)?.value.trim()     || '',
    });
  });
  return {
    first_name: val('first_name'), last_name: val('last_name'),
    email: val('email'), phone: val('phone'), phone_type: val('phone_type'),
    linkedin: val('linkedin'),
    address1: val('address1'), address2: val('address2'),
    city: val('city'), zip: val('zip'), state: val('state'), country: val('country'),
    jobs, education,
    q_eligible: val('q_eligible'), q_sponsorship: val('q_sponsorship'),
    q_accommodation: val('q_accommodation'),
    q_work_auth: val('q_work_auth'), q_referral: val('q_referral'),
    q_salary: val('q_salary'), q_salary_type: val('q_salary_type'),
    d_gender: val('d_gender'), d_ethnicity: val('d_ethnicity'),
    d_veteran: val('d_veteran'), d_disability: val('d_disability'),
    si_name: val('si_name'), si_date: val('si_date'),
  };
}

function collectCreds() {
  return {
    reg_email:            val('reg_email'),
    reg_password:         document.getElementById('reg_password')?.value         || '',
    reg_password_confirm: document.getElementById('reg_password_confirm')?.value || '',
  };
}

// ── Populate form from saved data ─────────────────────────

function populateForm(data) {
  const simple = ['first_name','last_name','email','phone','phone_type','linkedin',
                  'address1','address2','city','zip','state','country',
                  'q_eligible','q_sponsorship','q_accommodation','q_work_auth','q_referral','q_salary','q_salary_type',
                  'd_gender','d_ethnicity','d_veteran','d_disability','si_name','si_date'];
  simple.forEach(f => {
    const el = document.getElementById(f);
    if (el && data[f] !== undefined && data[f] !== null) el.value = data[f];
  });
  document.getElementById('jobs-container').innerHTML = '';
  jobCount = 0;
  if (data.jobs?.length) data.jobs.forEach(j => addJob(j));
  else addJob();
  document.getElementById('edu-container').innerHTML = '';
  eduCount = 0;
  if (data.education?.length) data.education.forEach(e => addEdu(e));
  else addEdu();
}

function populateCreds(creds) {
  if (!creds) return;
  if (document.getElementById('reg_email'))            document.getElementById('reg_email').value = creds.reg_email || '';
  if (document.getElementById('reg_password'))         document.getElementById('reg_password').value = creds.reg_password || '';
  if (document.getElementById('reg_password_confirm')) document.getElementById('reg_password_confirm').value = creds.reg_password_confirm || '';
  checkPwMatch();
}

// ── Storage ───────────────────────────────────────────────

function saveAll() {
  chrome.storage.local.set({ workdayData: collectFormData() }, () => showStatus('✓ Saved!', 'success'));
}

function saveQuestions()   { saveAll(); showStatus('✓ Answers saved!', 'success'); }
function saveDisclosures() { saveAll(); showStatus('✓ Disclosures saved!', 'success'); }

function saveCreds() {
  const pw  = document.getElementById('reg_password')?.value || '';
  const cpw = document.getElementById('reg_password_confirm')?.value || '';
  if (pw && pw !== cpw) { showStatus("Passwords don't match.", 'error'); return; }
  chrome.storage.local.set({ workdayCreds: collectCreds() }, () => showStatus('✓ Credentials saved!', 'success'));
}

function loadAll(cb) {
  chrome.storage.local.get(['workdayData', 'workdayCreds'], r => cb(r.workdayData || null, r.workdayCreds || null));
}

// ── Export / Import ───────────────────────────────────────

function exportData() {
  chrome.storage.local.get(['workdayData', 'workdayCreds'], result => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'workday-autofill-backup.json'; a.click();
    URL.revokeObjectURL(url);
    showStatus('✓ Exported!', 'success');
  });
}

function importData() {
  const file = document.getElementById('import-file').files[0];
  if (!file) { showStatus('Select a .json file first.', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      const toSave = {};
      if (parsed.workdayData)  toSave.workdayData  = parsed.workdayData;
      if (parsed.workdayCreds) toSave.workdayCreds = parsed.workdayCreds;
      chrome.storage.local.set(toSave, () => {
        loadAll((data, creds) => {
          if (data)  populateForm(data);
          if (creds) populateCreds(creds);
        });
        showStatus('✓ Data imported and restored!', 'success');
      });
    } catch {
      showStatus('Invalid file — make sure it is a Workday Autofill backup.', 'error');
    }
  };
  reader.readAsText(file);
}

// ── Password helpers ──────────────────────────────────────

function checkPwMatch() {
  const pw   = document.getElementById('reg_password')?.value || '';
  const cpw  = document.getElementById('reg_password_confirm')?.value || '';
  const note = document.getElementById('pw-match-note');
  if (!note || !cpw) { if (note) note.textContent = ''; return; }
  if (pw === cpw) { note.textContent = '✓ Passwords match';      note.style.color = '#1e7e34'; }
  else            { note.textContent = '✗ Passwords do not match'; note.style.color = '#c0392b'; }
}

function setupPwToggle(toggleId, inputId) {
  document.getElementById(toggleId)?.addEventListener('click', () => {
    const inp = document.getElementById(inputId);
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });
}

// ── Send message to content script ───────────────────────

function sendToContent(msg, badgeId) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const url = tab?.url || '';
    if (!url.includes('myworkdayjobs.com') && !url.includes('workday.com')) {
      showStatus('⚠ Navigate to a Workday page first.', 'error'); return;
    }
    chrome.tabs.sendMessage(tab.id, msg, response => {
      if (chrome.runtime.lastError) {
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error'); return;
      }
      if (response?.success) flashBadge(badgeId, response.filled);
      else showStatus('Ran — check the page for results.', 'info');
    });
  });
}

// ── Run autofill dispatchers ──────────────────────────────

function runApplication() {
  const data = collectFormData();
  chrome.storage.local.set({ workdayData: data });
  sendToContent({ action: 'autofill', type: 'application' }, 'badge-app');
}

function runQuestions() {
  const data = collectFormData();
  chrome.storage.local.set({ workdayData: data });
  sendToContent({ action: 'autofill', type: 'questions' }, 'badge-q');
}

function runDisclosures() {
  const data = collectFormData();
  chrome.storage.local.set({ workdayData: data });
  sendToContent({ action: 'autofill', type: 'disclosures' }, 'badge-d');
}

function runRegistration() {
  const creds = collectCreds();
  const email = creds.reg_email || val('email');
  const pw    = creds.reg_password;
  const cpw   = creds.reg_password_confirm;
  if (pw && pw !== cpw) { showStatus("Passwords don't match.", 'error'); return; }
  if (!email)           { showStatus('Enter an email address first.', 'error'); return; }
  chrome.storage.local.set({ workdayCreds: creds });
  sendToContent({ action: 'autofill', type: 'registration' }, null);
}

// ── Tab switching ─────────────────────────────────────────

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    document.getElementById('status').className = '';
    document.getElementById('status').textContent = '';
  });
});

// ── Wire up buttons ───────────────────────────────────────

document.getElementById('run-btn')?.addEventListener('click', runApplication);
document.getElementById('run-questions-btn')?.addEventListener('click', runQuestions);
document.getElementById('run-disclosures-btn')?.addEventListener('click', runDisclosures);
document.getElementById('run-reg-btn')?.addEventListener('click', runRegistration);

document.getElementById('save-btn')?.addEventListener('click', saveAll);
document.getElementById('clear-btn')?.addEventListener('click', () => {
  if (confirm('Clear the form? (Saved data in Chrome is not affected)')) {
    document.getElementById('jobs-container').innerHTML = '';
    jobCount = 0;
    addJob();
    document.getElementById('edu-container').innerHTML = '';
    eduCount = 0;
    addEdu();
  }
});

document.getElementById('save-questions-btn')?.addEventListener('click', saveQuestions);
document.getElementById('save-disclosures-btn')?.addEventListener('click', saveDisclosures);
document.getElementById('save-reg-btn')?.addEventListener('click', saveCreds);
document.getElementById('add-job-btn')?.addEventListener('click', () => addJob());
document.getElementById('add-edu-btn')?.addEventListener('click', () => addEdu());
document.getElementById('export-btn')?.addEventListener('click', exportData);
document.getElementById('import-btn')?.addEventListener('click', importData);

document.getElementById('clear-all-btn')?.addEventListener('click', () => {
  if (confirm('This will permanently delete ALL saved data. Are you sure?')) {
    chrome.storage.local.clear(() => {
      document.getElementById('jobs-container').innerHTML = '';
      jobCount = 0; addJob();
      document.getElementById('edu-container').innerHTML = '';
      eduCount = 0; addEdu();
      showStatus('All data cleared.', 'info');
    });
  }
});

setupPwToggle('toggle-pw1', 'reg_password');
setupPwToggle('toggle-pw2', 'reg_password_confirm');
document.getElementById('reg_password')?.addEventListener('input', checkPwMatch);
document.getElementById('reg_password_confirm')?.addEventListener('input', checkPwMatch);

// ── Auto-detect Workday page and switch tab ───────────────

function autoDetectTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = tabs[0]?.url || '';
    if (!url.includes('myworkdayjobs.com') && !url.includes('workday.com')) return;
    chrome.tabs.sendMessage(tabs[0].id, { action: 'detectPageType' }, response => {
      if (chrome.runtime.lastError || !response?.pageType) return;
      const tabEl = document.querySelector(`.tab[data-tab="${response.pageType}"]`);
      if (tabEl && !tabEl.classList.contains('active')) tabEl.click();
    });
  });
}

// ── Sidebar toggle ────────────────────────────────────────

chrome.storage.local.get('sidebarAutoOpen', r => {
  const cb = document.getElementById('sidebar-toggle');
  if (cb) cb.checked = !!r.sidebarAutoOpen;
});

document.getElementById('sidebar-toggle')?.addEventListener('change', function () {
  const open = this.checked;
  chrome.storage.local.set({ sidebarAutoOpen: open });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'setSidebarOpen', open }, () => {
        void chrome.runtime.lastError; // suppress error if content script not present
      });
    }
  });
});

// ── Init ──────────────────────────────────────────────────

loadAll((data, creds) => {
  if (data)  { populateForm(data); showStatus('Loaded your saved info.', 'info'); setTimeout(() => { document.getElementById('status').className = ''; }, 2500); }
  else       { addJob(); }
  if (creds) populateCreds(creds);
  autoDetectTab();
});
