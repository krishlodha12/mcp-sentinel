let lastReport = null;

const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file-input");
const browseBtn = document.getElementById("browse-btn");
const demoBtn = document.getElementById("demo-btn");
const pasteArea = document.getElementById("paste-area");
const pasteScanBtn = document.getElementById("paste-scan-btn");
const results = document.getElementById("results");
const summaryRow = document.getElementById("summary-row");
const metaText = document.getElementById("meta-text");
const findingsList = document.getElementById("findings-list");
const cleanMessage = document.getElementById("clean-message");
const owaspSection = document.getElementById("owasp-section");
const owaspChips = document.getElementById("owasp-chips");
const exportBtn = document.getElementById("export-json");

browseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  fileInput.click();
});

dropzone.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {
  if (fileInput.files?.[0]) scanFile(fileInput.files[0]);
});

demoBtn.addEventListener("click", () => runDemo());

pasteScanBtn.addEventListener("click", () => {
  const text = pasteArea.value.trim();
  if (!text) return;
  scanContent(text);
});

exportBtn.addEventListener("click", () => {
  if (!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mcp-sentinel-${Date.now()}.json`;
  a.click();
});

["dragenter", "dragover"].forEach((ev) => {
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((ev) => {
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (file) scanFile(file);
});

async function scanFile(file) {
  const form = new FormData();
  form.append("file", file);
  await postScan("/api/scan", form, false);
}

async function scanContent(content) {
  await postScan("/api/scan", JSON.stringify({ content }), true);
}

async function runDemo() {
  setLoading(true);
  try {
    const res = await fetch("/api/demo");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Demo failed");
    renderReport(data);
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
}

async function postScan(url, body, isJson) {
  setLoading(true);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: isJson ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Scan failed");
    renderReport(data);
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  document.querySelector(".hero").classList.toggle("loading", on);
}

function renderReport(report) {
  lastReport = report;
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });

  const sev = report.bySeverity;
  summaryRow.innerHTML = `
    <div class="stat-card neutral"><div class="count">${report.serversScanned}</div><div class="label">Servers</div></div>
    <div class="stat-card neutral"><div class="count">${report.toolsChecked}</div><div class="label">Tools</div></div>
    ${sev.critical ? `<div class="stat-card critical"><div class="count">${sev.critical}</div><div class="label">Critical</div></div>` : ""}
    ${sev.high ? `<div class="stat-card high"><div class="count">${sev.high}</div><div class="label">High</div></div>` : ""}
    ${sev.medium ? `<div class="stat-card medium"><div class="count">${sev.medium}</div><div class="label">Medium</div></div>` : ""}
    ${sev.low ? `<div class="stat-card low"><div class="count">${sev.low}</div><div class="label">Low</div></div>` : ""}
    ${sev.info ? `<div class="stat-card info"><div class="count">${sev.info}</div><div class="label">Info</div></div>` : ""}
  `;

  metaText.textContent = `${report.findings.length} finding(s) · ${report.scanDurationMs}ms · ${new Date(report.scannedAt).toLocaleString()}`;

  const owasp = report.byOwasp || {};
  const owaspKeys = Object.keys(owasp);
  if (owaspKeys.length) {
    owaspSection.classList.remove("hidden");
    owaspChips.innerHTML = owaspKeys
      .sort((a, b) => owasp[b] - owasp[a])
      .map((k) => `<span class="chip"><strong>${k}</strong>${owasp[k]}</span>`)
      .join("");
  } else {
    owaspSection.classList.add("hidden");
  }

  findingsList.innerHTML = "";
  if (report.findings.length === 0) {
    cleanMessage.classList.remove("hidden");
    return;
  }
  cleanMessage.classList.add("hidden");

  report.findings.forEach((f, i) => {
    findingsList.appendChild(buildFindingCard(f, i));
  });
}

function buildFindingCard(f, index) {
  const el = document.createElement("article");
  el.className = `finding sev-${f.severity}`;
  el.innerHTML = `
    <div class="finding-header">
      <div class="finding-title">${escapeHtml(f.title)}</div>
      <span class="badge badge-${f.severity}">${f.severity}</span>
    </div>
    <div class="finding-meta">${escapeHtml(f.serverName)} · ${escapeHtml(f.location)} · ${escapeHtml(f.owasp.id)}</div>
    <p class="finding-message">${escapeHtml(f.message)}</p>
    ${f.snippet ? `<pre class="finding-snippet">${escapeHtml(f.snippet)}</pre>` : ""}
    <button type="button" class="explain-btn" data-idx="${index}">Explain this finding</button>
    <div class="explain-panel hidden" id="explain-${index}"></div>
  `;

  el.querySelector(".explain-btn").addEventListener("click", (e) => {
    const panel = el.querySelector(".explain-panel");
    const open = !panel.classList.contains("hidden");
    if (open) {
      panel.classList.add("hidden");
      e.target.textContent = "Explain this finding";
      return;
    }
    panel.innerHTML = `
      <h4>What's going on</h4>
      <p>${escapeHtml(f.explanation)}</p>
      <h4>What to do</h4>
      <p>${escapeHtml(f.remediation)}</p>
      ${f.references?.length ? `<h4>Further reading</h4><ul>${f.references.map((r) => `<li><a href="${escapeHtml(r)}" target="_blank" rel="noopener">${escapeHtml(r)}</a></li>`).join("")}</ul>` : ""}
    `;
    panel.classList.remove("hidden");
    e.target.textContent = "Hide explanation";
  });

  return el;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
