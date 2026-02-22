// ═══════════════════════════════════════════════════════════
//  WORKDAY AUTOFILL — popup.js
// ═══════════════════════════════════════════════════════════

// ── Status / badge helpers ────────────────────────────────

function showStatus(msg, type = "info") {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = type;
  if (type === "success" || type === "info") {
    setTimeout(() => { el.className = ""; el.textContent = ""; }, 4000);
  }
}

function flashBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.textContent = `✓ ${count} filled`;
  badge.classList.add("show");

  const btn = badge.previousElementSibling;
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = "✅ Done! Review the page";
    btn.classList.add("flashing");
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove("flashing");
    }, 2500);
  }
  setTimeout(() => badge.classList.remove("show"), 5000);
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

// ── Job entry builder ─────────────────────────────────────

let jobCount = 0;

function createJobEntry(data = {}) {
  jobCount++;
  const id = jobCount;
  const isCurrent = data.currently_working || false;

  const div = document.createElement("div");
  div.className = "job-entry";
  div.dataset.jobId = id;

  const titlePreview = data.title ? ` — ${data.title}` : "";

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
          <input type="text" id="job_end_${id}" value="${esc(data.end_date)}" placeholder="03/2024" ${isCurrent ? "disabled" : ""} />
        </div>
      </div>
      <div class="checkbox-row">
        <input type="checkbox" id="job_current_${id}" ${isCurrent ? "checked" : ""} />
        <label for="job_current_${id}">I currently work here</label>
      </div>
      <div class="field">
        <label>Description</label>
        <textarea id="job_desc_${id}" placeholder="Key responsibilities...">${esc(data.description)}</textarea>
      </div>
      <div class="remove-job">Remove this job</div>
    </div>
  `;

  // Collapse toggle
  div.querySelector(".job-header").addEventListener("click", () => {
    const body = document.getElementById(`job-body-${id}`);
    const tog  = div.querySelector(".toggle");
    body.classList.toggle("collapsed");
    tog.textContent = body.classList.contains("collapsed") ? "▸" : "▾";
  });

  // Currently working disables end date
  div.querySelector(`#job_current_${id}`).addEventListener("change", function () {
    document.getElementById(`job_end_${id}`).disabled = this.checked;
  });

  // Update header preview when title changes
  div.querySelector(`#job_title_${id}`).addEventListener("input", function () {
    div.querySelector(".job-label").textContent = `Job ${id}${this.value ? " — " + this.value : ""}`;
  });

  div.querySelector(".remove-job").addEventListener("click", () => div.remove());

  return div;
}

function esc(str) {
  return (str || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function addJob(data = {}) {
  document.getElementById("jobs-container").appendChild(createJobEntry(data));
}

// ── Collect all form data ─────────────────────────────────

function collectFormData() {
  const jobs = [];
  document.querySelectorAll(".job-entry").forEach(entry => {
    const id = entry.dataset.jobId;
    jobs.push({
      title:             document.getElementById(`job_title_${id}`)?.value.trim()   || "",
      company:           document.getElementById(`job_company_${id}`)?.value.trim() || "",
      start_date:        document.getElementById(`job_start_${id}`)?.value.trim()   || "",
      end_date:          document.getElementById(`job_end_${id}`)?.value.trim()     || "",
      currently_working: document.getElementById(`job_current_${id}`)?.checked      || false,
      description:       document.getElementById(`job_desc_${id}`)?.value.trim()   || "",
    });
  });

  return {
    // Contact
    first_name: val("first_name"), last_name: val("last_name"),
    email: val("email"), phone: val("phone"), phone_type: val("phone_type"),
    linkedin: val("linkedin"),
    address1: val("address1"), address2: val("address2"),
    city: val("city"), zip: val("zip"), state: val("state"), country: val("country"),
    jobs,
    // Questions
    q_eligible: val("q_eligible"), q_sponsorship: val("q_sponsorship"),
    q_work_auth: val("q_work_auth"), q_referral: val("q_referral"),
    q_salary: val("q_salary"), q_salary_type: val("q_salary_type"),
    // Disclosures
    d_gender: val("d_gender"), d_ethnicity: val("d_ethnicity"),
    d_veteran: val("d_veteran"), d_disability: val("d_disability"),
    si_name: val("si_name"), si_date: val("si_date"),
  };
}

function collectCreds() {
  return {
    reg_email:            val("reg_email"),
    reg_password:         document.getElementById("reg_password")?.value  || "",
    reg_password_confirm: document.getElementById("reg_password_confirm")?.value || "",
  };
}

// ── Populate form from saved data ─────────────────────────

function populateForm(data) {
  const simple = ["first_name","last_name","email","phone","phone_type","linkedin",
                  "address1","address2","city","zip","state","country",
                  "q_eligible","q_sponsorship","q_work_auth","q_referral","q_salary","q_salary_type",
                  "d_gender","d_ethnicity","d_veteran","d_disability","si_name","si_date"];
  simple.forEach(f => {
    const el = document.getElementById(f);
    if (el && data[f] !== undefined && data[f] !== null) el.value = data[f];
  });

  document.getElementById("jobs-container").innerHTML = "";
  jobCount = 0;
  if (data.jobs?.length) data.jobs.forEach(j => addJob(j));
  else addJob();
}

function populateCreds(creds) {
  if (!creds) return;
  if (document.getElementById("reg_email"))            document.getElementById("reg_email").value = creds.reg_email || "";
  if (document.getElementById("reg_password"))         document.getElementById("reg_password").value = creds.reg_password || "";
  if (document.getElementById("reg_password_confirm")) document.getElementById("reg_password_confirm").value = creds.reg_password_confirm || "";
  checkPwMatch();
}

// ── Storage ───────────────────────────────────────────────

function saveAll() {
  const data = collectFormData();
  chrome.storage.local.set({ workdayData: data }, () => showStatus("✓ Saved!", "success"));
}

function saveQuestions() {
  // questions are part of main data blob
  saveAll();
  showStatus("✓ Answers saved!", "success");
}

function saveDisclosures() {
  saveAll();
  showStatus("✓ Disclosures saved!", "success");
}

function saveCreds() {
  const pw  = document.getElementById("reg_password")?.value || "";
  const cpw = document.getElementById("reg_password_confirm")?.value || "";
  if (pw && pw !== cpw) { showStatus("Passwords don't match.", "error"); return; }
  chrome.storage.local.set({ workdayCreds: collectCreds() }, () => showStatus("✓ Credentials saved!", "success"));
}

function loadAll(cb) {
  chrome.storage.local.get(["workdayData","workdayCreds"], r => cb(r.workdayData || null, r.workdayCreds || null));
}

// ── Export / Import ───────────────────────────────────────

function exportData() {
  chrome.storage.local.get(["workdayData","workdayCreds"], result => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "workday-autofill-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    showStatus("✓ Exported!", "success");
  });
}

function importData() {
  const file = document.getElementById("import-file").files[0];
  if (!file) { showStatus("Select a .json file first.", "error"); return; }
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      const toSave = {};
      if (parsed.workdayData) toSave.workdayData = parsed.workdayData;
      if (parsed.workdayCreds) toSave.workdayCreds = parsed.workdayCreds;
      chrome.storage.local.set(toSave, () => {
        loadAll((data, creds) => {
          if (data)  populateForm(data);
          if (creds) populateCreds(creds);
        });
        showStatus("✓ Data imported and restored!", "success");
      });
    } catch {
      showStatus("Invalid file — make sure it's a Workday Autofill backup.", "error");
    }
  };
  reader.readAsText(file);
}

// ── Password helpers ──────────────────────────────────────

function checkPwMatch() {
  const pw  = document.getElementById("reg_password")?.value || "";
  const cpw = document.getElementById("reg_password_confirm")?.value || "";
  const note = document.getElementById("pw-match-note");
  if (!note || !cpw) { if (note) note.textContent = ""; return; }
  if (pw === cpw) { note.textContent = "✓ Passwords match"; note.style.color = "#1e7e34"; }
  else            { note.textContent = "✗ Passwords do not match"; note.style.color = "#c0392b"; }
}

function setupPwToggle(toggleId, inputId) {
  document.getElementById(toggleId)?.addEventListener("click", () => {
    const inp = document.getElementById(inputId);
    inp.type = inp.type === "password" ? "text" : "password";
  });
}

// ── Inject script into page ───────────────────────────────

function injectAndRun(func, args, badgeId) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const url = tab.url || "";
    if (!url.includes("myworkdayjobs.com") && !url.includes("workday.com")) {
      showStatus("⚠ Navigate to a Workday page first.", "error"); return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func,
      args,
    }, results => {
      if (chrome.runtime.lastError) {
        showStatus("Error: " + chrome.runtime.lastError.message, "error"); return;
      }
      const r = results?.[0]?.result;
      if (r?.success) flashBadge(badgeId, r.filled);
      else showStatus("Ran — check the page for results.", "info");
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  PAGE INJECTION FUNCTIONS
//  These run in the context of the Workday page itself.
// ═══════════════════════════════════════════════════════════

// ── Shared utility (injected with each call) ──────────────

function autofillApplication(data) {
  let filled = 0;

  // Set value on a React-controlled input / textarea
  function setVal(el, value) {
    if (!el || value === undefined || value === null || value === "") return false;
    const proto  = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value); else el.value = value;
    ["input","change","blur"].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
    return true;
  }

  // Find any input/textarea/select whose associated label contains text
  function findByLabel(...terms) {
    for (const label of document.querySelectorAll("label, [data-automation-id$='Label'], [class*='label']")) {
      const txt = label.textContent.trim().toLowerCase();
      if (terms.some(t => txt.includes(t.toLowerCase()))) {
        // Try for= attribute
        if (label.htmlFor) {
          const el = document.getElementById(label.htmlFor);
          if (el) return el;
        }
        // Try aria-labelledby reverse lookup
        const labelId = label.id;
        if (labelId) {
          const el = document.querySelector(`[aria-labelledby="${labelId}"]`);
          if (el) return el;
        }
        // Try sibling/child input
        const parent = label.closest("div, li, section, [data-automation-id]");
        if (parent) {
          const el = parent.querySelector("input:not([type=hidden]), textarea, select");
          if (el && el !== label) return el;
        }
      }
    }
    return null;
  }

  function fill(value, ...labelTerms) {
    if (!value) return;
    const el = findByLabel(...labelTerms);
    if (el && setVal(el, value)) filled++;
  }

  // Handle Workday custom dropdowns (button + listbox pattern)
  function selectWorkdayDropdown(optionText, ...labelTerms) {
    if (!optionText) return;
    // Find the trigger button
    const label = Array.from(document.querySelectorAll("label, [data-automation-id$='Label']"))
      .find(l => labelTerms.some(t => l.textContent.trim().toLowerCase().includes(t.toLowerCase())));

    const container = label?.closest("[data-automation-id], div, li") || label?.parentElement;
    const btn = container?.querySelector("button[aria-haspopup], button[aria-expanded]") ||
                container?.querySelector("button");

    if (btn) {
      btn.click();
      return new Promise(resolve => {
        setTimeout(() => {
          const options = document.querySelectorAll("[role='option'], [data-automation-id='promptOption'], li[tabindex]");
          const match = Array.from(options).find(o =>
            o.textContent.trim().toLowerCase().includes(optionText.toLowerCase())
          );
          if (match) { match.click(); filled++; }
          resolve();
        }, 450);
      });
    }

    // Fallback: native <select>
    const sel = findByLabel(...labelTerms);
    if (sel?.tagName === "SELECT") {
      const opt = Array.from(sel.options).find(o =>
        o.text.toLowerCase().includes(optionText.toLowerCase())
      );
      if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
    }
  }

  // Fill a date field that may be a Workday date picker (separate month/day/year inputs)
  // date format: "MM/YYYY" or "MM/DD/YYYY"
  function fillDate(dateStr, ...labelTerms) {
    if (!dateStr) return;
    const parts = dateStr.split("/");
    // Try as plain text input first
    const el = findByLabel(...labelTerms);
    if (el && el.tagName === "INPUT") {
      if (setVal(el, dateStr)) { filled++; return; }
    }
    // Try month/year sub-inputs near the label
    if (parts.length >= 2) {
      const label = Array.from(document.querySelectorAll("label"))
        .find(l => labelTerms.some(t => l.textContent.trim().toLowerCase().includes(t.toLowerCase())));
      const section = label?.closest("[data-automation-id], section, div[class*='date']");
      if (section) {
        const inputs = section.querySelectorAll("input");
        if (inputs.length >= 2) {
          // Workday date pickers: first=month, second=year (or day/month/year)
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

  // ── Run contact fills ──

  const promises = [];

  fill(data.first_name, "first name", "given name");
  fill(data.last_name,  "last name",  "surname", "family name");
  fill(data.email,      "email");
  fill(data.phone,      "phone number", "phone", "mobile");
  fill(data.linkedin,   "linkedin", "website", "portfolio", "url");
  fill(data.address1,   "address line 1", "street address", "address 1");
  fill(data.address2,   "address line 2", "address 2", "apt", "suite");
  fill(data.city,       "city", "municipality");
  fill(data.zip,        "postal code", "zip code", "zip");
  fill(data.country,    "country");

  promises.push(selectWorkdayDropdown(data.phone_type, "phone device type", "phone type", "device type"));
  promises.push(selectWorkdayDropdown(data.state,      "state", "province", "region"));

  // ── Work experience ──
  // Workday renders each job in a repeating section. Strategy:
  // 1. Find all job section containers
  // 2. For each, fill the fields inside using scoped queries

  const jobSections = Array.from(document.querySelectorAll(
    "[data-automation-id='workExperienceSection'], " +
    "[data-automation-id='workHistorySection'], " +
    "[class*='workExperience']:not(label):not(input), " +
    "[class*='WorkHistory']:not(label):not(input)"
  ));

  function fillJobInSection(section, job) {
    function sectionFill(value, ...terms) {
      if (!value) return;
      for (const label of section.querySelectorAll("label, [data-automation-id$='Label']")) {
        const txt = label.textContent.trim().toLowerCase();
        if (terms.some(t => txt.includes(t.toLowerCase()))) {
          const parent = label.closest("div, li");
          const el = parent?.querySelector("input:not([type=hidden]), textarea");
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
      const parts = dateStr.split("/");
      for (const label of section.querySelectorAll("label")) {
        const txt = label.textContent.trim().toLowerCase();
        if (terms.some(t => txt.includes(t.toLowerCase()))) {
          const dateContainer = label.closest("div, li, [data-automation-id]");
          const inputs = dateContainer ? dateContainer.querySelectorAll("input") : [];
          if (inputs.length === 1) {
            if (setVal(inputs[0], dateStr)) filled++;
          } else if (inputs.length >= 2) {
            if (setVal(inputs[0], parts[0] || "")) filled++;
            if (setVal(inputs[inputs.length - 1], parts[parts.length - 1] || "")) filled++;
          }
          return;
        }
      }
    }

    sectionFill(job.title,       "title", "position", "job title", "role");
    sectionFill(job.company,     "company", "employer", "organization");
    sectionFillDate(job.start_date, "from", "start", "begin");
    if (!job.currently_working) sectionFillDate(job.end_date, "to", "end", "through");
    sectionFill(job.description, "description", "responsibilities", "duties", "summary");
  }

  if (jobSections.length > 0 && data.jobs?.length) {
    data.jobs.forEach((job, i) => {
      if (jobSections[i]) fillJobInSection(jobSections[i], job);
    });
  } else if (data.jobs?.length) {
    // Fallback — fill whatever is visible (usually first job block)
    const job = data.jobs[0];
    fill(job.title,       "job title", "title", "position");
    fill(job.company,     "company", "employer");
    fillDate(job.start_date, "from", "start date");
    if (!job.currently_working) fillDate(job.end_date, "to", "end date", "through");
    fill(job.description, "description", "responsibilities");
  }

  return Promise.all(promises).then(() => ({ success: true, filled }));
}

// ── Questions autofill ────────────────────────────────────

function autofillQuestions(data) {
  let filled = 0;

  function setVal(el, value) {
    if (!el || !value) return false;
    const proto  = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value); else el.value = value;
    ["input","change","blur"].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
    return true;
  }

  function findByLabel(...terms) {
    for (const label of document.querySelectorAll("label, [data-automation-id$='Label']")) {
      const txt = label.textContent.trim().toLowerCase();
      if (terms.some(t => txt.includes(t.toLowerCase()))) {
        if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
        const parent = label.closest("div, li, [data-automation-id]");
        if (parent) { const el = parent.querySelector("input:not([type=hidden]), textarea, select"); if (el) return el; }
      }
    }
    return null;
  }

  function clickWorkdayOption(optionText, ...labelTerms) {
    if (!optionText) return;
    const label = Array.from(document.querySelectorAll("label, [data-automation-id$='Label']"))
      .find(l => labelTerms.some(t => l.textContent.trim().toLowerCase().includes(t.toLowerCase())));
    const container = label?.closest("[data-automation-id], div, li") || label?.parentElement;
    const btn = container?.querySelector("button[aria-haspopup], button[aria-expanded], button");
    if (btn) {
      btn.click();
      setTimeout(() => {
        const opts = document.querySelectorAll("[role='option'], [data-automation-id='promptOption']");
        const m = Array.from(opts).find(o => o.textContent.trim().toLowerCase().includes(optionText.toLowerCase()));
        if (m) { m.click(); filled++; }
      }, 450);
    }
  }

  function fill(value, ...terms) {
    if (!value) return;
    const el = findByLabel(...terms);
    if (el && setVal(el, value)) filled++;
  }

  // "How did you hear about us" — many label variants
  fill(data.q_referral, "hear about", "referral source", "how did you", "how did you find", "source");

  clickWorkdayOption(data.q_eligible,    "legally authorized", "eligible to work", "authorized to work", "work in the us");
  clickWorkdayOption(data.q_sponsorship, "sponsorship", "visa sponsorship", "require sponsorship");
  clickWorkdayOption(data.q_work_auth,   "work authorization", "authorization status", "visa status", "citizenship");

  fill(data.q_salary, "salary", "compensation", "desired salary", "salary requirement", "expected salary");
  clickWorkdayOption(data.q_salary_type, "salary type", "pay type", "compensation type");

  return { success: true, filled };
}

// ── Disclosures autofill ──────────────────────────────────

function autofillDisclosures(data) {
  let filled = 0;
  const today = new Date().toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });

  function setVal(el, value) {
    if (!el || !value) return false;
    const proto  = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(el, value); else el.value = value;
    ["input","change","blur"].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
    return true;
  }

  function findByLabel(...terms) {
    for (const label of document.querySelectorAll("label, [data-automation-id$='Label']")) {
      const txt = label.textContent.trim().toLowerCase();
      if (terms.some(t => txt.includes(t.toLowerCase()))) {
        if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
        const parent = label.closest("div, li, [data-automation-id]");
        if (parent) { const el = parent.querySelector("input:not([type=hidden]), textarea, select"); if (el) return el; }
      }
    }
    return null;
  }

  function clickOption(optionText, ...labelTerms) {
    if (!optionText) return;
    const label = Array.from(document.querySelectorAll("label, [data-automation-id$='Label']"))
      .find(l => labelTerms.some(t => l.textContent.trim().toLowerCase().includes(t.toLowerCase())));
    const container = label?.closest("[data-automation-id], div, li") || label?.parentElement;
    const btn = container?.querySelector("button[aria-haspopup], button[aria-expanded], button");
    if (btn) {
      btn.click();
      setTimeout(() => {
        const opts = document.querySelectorAll("[role='option'], [data-automation-id='promptOption']");
        const m = Array.from(opts).find(o => o.textContent.trim().toLowerCase().includes(optionText.toLowerCase()));
        if (m) { m.click(); filled++; }
      }, 450);
    }
    // Also try radio buttons
    const radios = document.querySelectorAll("input[type=radio]");
    radios.forEach(r => {
      if (r.value?.toLowerCase().includes(optionText.toLowerCase()) ||
          document.querySelector(`label[for="${r.id}"]`)?.textContent.trim().toLowerCase().includes(optionText.toLowerCase())) {
        r.click(); filled++;
      }
    });
  }

  function fill(value, ...terms) {
    if (!value) return;
    const el = findByLabel(...terms);
    if (el && setVal(el, value)) filled++;
  }

  clickOption(data.d_gender,    "gender", "sex");
  clickOption(data.d_ethnicity, "ethnicity", "race", "ethnic");
  clickOption(data.d_veteran,   "veteran", "military");
  clickOption(data.d_disability,"disability", "disabled");

  // Signature name — fall back to first+last from contact
  const sigName = data.si_name || ((data.first_name || "") + " " + (data.last_name || "")).trim();
  fill(sigName, "name", "full name", "signature");

  // Date — fall back to today
  const sigDate = data.si_date || today;
  fill(sigDate, "date", "today");

  return { success: true, filled };
}

// ── Registration autofill ─────────────────────────────────

function autofillRegistration(creds) {
  let filled = 0;

  function setVal(el, value) {
    if (!el || !value) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(el, value); else el.value = value;
    ["input","change","blur"].forEach(ev => el.dispatchEvent(new Event(ev, { bubbles: true })));
    return true;
  }

  function findInput(...terms) {
    for (const label of document.querySelectorAll("label")) {
      const txt = label.textContent.trim().toLowerCase();
      if (terms.some(t => txt.includes(t.toLowerCase()))) {
        if (label.htmlFor) { const el = document.getElementById(label.htmlFor); if (el) return el; }
        const el = label.closest("div")?.querySelector("input");
        if (el) return el;
      }
    }
    return null;
  }

  const emailEl = findInput("email", "username", "e-mail");
  if (emailEl && emailEl.type !== "password" && setVal(emailEl, creds.email)) filled++;

  const pwInputs = Array.from(document.querySelectorAll("input[type=password]"));
  if (pwInputs[0] && setVal(pwInputs[0], creds.password)) filled++;
  if (pwInputs[1] && setVal(pwInputs[1], creds.confirm || creds.password)) filled++;

  return { success: true, filled };
}

// ── Run autofill dispatchers ──────────────────────────────

function runApplication() {
  const data = collectFormData();
  chrome.storage.local.set({ workdayData: data });
  injectAndRun(autofillApplication, [data], "badge-app");
}

function runQuestions() {
  const data = collectFormData();
  chrome.storage.local.set({ workdayData: data });
  injectAndRun(autofillQuestions, [data], "badge-q");
}

function runDisclosures() {
  const data = collectFormData();
  // Enrich with contact name for signature fallback
  chrome.storage.local.set({ workdayData: data });
  injectAndRun(autofillDisclosures, [data], "badge-d");
}

function runRegistration() {
  const creds = collectCreds();
  const email = creds.reg_email || val("email");
  const pw = creds.reg_password;
  const cpw = creds.reg_password_confirm;
  if (pw && pw !== cpw) { showStatus("Passwords don't match.", "error"); return; }
  if (!email)           { showStatus("Enter an email address first.", "error"); return; }
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const url = tabs[0]?.url || "";
    if (!url.includes("myworkdayjobs.com") && !url.includes("workday.com")) {
      showStatus("⚠ Navigate to a Workday page first.", "error"); return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: autofillRegistration,
      args: [{ email, password: pw, confirm: cpw }],
    }, results => {
      const r = results?.[0]?.result;
      if (r?.success) showStatus(`✓ Filled ${r.filled} registration field(s). Review before submitting!`, "success");
      else showStatus("Ran — check the page.", "info");
    });
  });
}

// ── Tab switching ─────────────────────────────────────────

document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("tab-" + tab.dataset.tab).classList.add("active");
    document.getElementById("status").className = "";
    document.getElementById("status").textContent = "";
  });
});

// ── Wire up buttons ───────────────────────────────────────

document.getElementById("run-btn")?.addEventListener("click", runApplication);
document.getElementById("run-questions-btn")?.addEventListener("click", runQuestions);
document.getElementById("run-disclosures-btn")?.addEventListener("click", runDisclosures);
document.getElementById("run-reg-btn")?.addEventListener("click", runRegistration);

document.getElementById("save-btn")?.addEventListener("click", saveAll);
document.getElementById("clear-btn")?.addEventListener("click", () => {
  if (confirm("Clear the form? (Saved data in Chrome is not affected)")) {
    document.getElementById("jobs-container").innerHTML = "";
    jobCount = 0;
    addJob();
  }
});

document.getElementById("save-questions-btn")?.addEventListener("click", saveQuestions);
document.getElementById("save-disclosures-btn")?.addEventListener("click", saveDisclosures);
document.getElementById("save-reg-btn")?.addEventListener("click", saveCreds);

document.getElementById("add-job-btn")?.addEventListener("click", () => addJob());

document.getElementById("export-btn")?.addEventListener("click", exportData);
document.getElementById("import-btn")?.addEventListener("click", importData);

document.getElementById("clear-all-btn")?.addEventListener("click", () => {
  if (confirm("This will permanently delete ALL saved data. Are you sure?")) {
    chrome.storage.local.clear(() => {
      document.getElementById("jobs-container").innerHTML = "";
      jobCount = 0; addJob();
      showStatus("All data cleared.", "info");
    });
  }
});

setupPwToggle("toggle-pw1", "reg_password");
setupPwToggle("toggle-pw2", "reg_password_confirm");
document.getElementById("reg_password")?.addEventListener("input", checkPwMatch);
document.getElementById("reg_password_confirm")?.addEventListener("input", checkPwMatch);

// ── Init ──────────────────────────────────────────────────

loadAll((data, creds) => {
  if (data)  { populateForm(data);  showStatus("Loaded your saved info.", "info"); setTimeout(() => { document.getElementById("status").className = ""; }, 2500); }
  else       { addJob(); }
  if (creds) populateCreds(creds);
});
