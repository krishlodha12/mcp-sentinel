let lastReport = null;
let currentMode = "scan";

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
const findingsHeading = document.getElementById("findings-heading");
const cleanMessage = document.getElementById("clean-message");
const owaspSection = document.getElementById("owasp-section");
const owaspChips = document.getElementById("owasp-chips");
const exportBtn = document.getElementById("export-json");
const probeResults = document.getElementById("probe-results");

const probeDropzone = document.getElementById("probe-dropzone");
const probeFileInput = document.getElementById("probe-file-input");
const probeBrowseBtn = document.getElementById("probe-browse-btn");
const probeDemoBtn = document.getElementById("probe-demo-btn");
const probePasteArea = document.getElementById("probe-paste-area");
const probePasteBtn = document.getElementById("probe-paste-btn");

document.querySelectorAll(".mode-tab").forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

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

probeBrowseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  probeFileInput.click();
});
probeDropzone.addEventListener("click", () => probeFileInput.click());
probeFileInput.addEventListener("change", () => {
  if (probeFileInput.files?.[0]) probeFile(probeFileInput.files[0]);
});
probeDemoBtn.addEventListener("click", () => runProbeDemo());
probePasteBtn.addEventListener("click", () => {
  const text = probePasteArea.value.trim();
  if (!text) return;
  probeContent(text);
});

exportBtn.addEventListener("click", () => {
  if (!lastReport) return;
  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mcp-sentinel-${currentMode}-${Date.now()}.json`;
  a.click();
});

wireDropzone(dropzone, (file) => scanFile(file));
wireDropzone(probeDropzone, (file) => probeFile(file));

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".mode-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.mode !== mode);
  });
}

function wireDropzone(el, onFile) {
  ["dragenter", "dragover"].forEach((ev) => {
    el.addEventListener(ev, (e) => {
      e.preventDefault();
      el.classList.add("dragover");
    });
  });
  ["dragleave", "drop"].forEach((ev) => {
    el.addEventListener(ev, (e) => {
      e.preventDefault();
      el.classList.remove("dragover");
    });
  });
  el.addEventListener("drop", (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  });
}

async function scanFile(file) {
  const form = new FormData();
  form.append("file", file);
  await postScan("/api/scan", form, false);
}

async function scanContent(content) {
  await postScan("/api/scan", JSON.stringify({ content }), true);
}

async function probeFile(file) {
  const form = new FormData();
  form.append("file", file);
  await postProbe("/api/probe", form, false);
}

async function probeContent(content) {
  await postProbe("/api/probe", JSON.stringify({ content }), true);
}

async function runDemo() {
  setLoading("scan", true);
  try {
    const res = await fetch("/api/demo");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Demo failed");
    renderScanReport(data);
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading("scan", false);
  }
}

async function runProbeDemo() {
  setLoading("probe", true);
  try {
    const res = await fetch("/api/probe/demo");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Live demo failed");
    renderProbeReport(data);
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading("probe", false);
  }
}

async function postScan(url, body, isJson) {
  setLoading("scan", true);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: isJson ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Scan failed");
    renderScanReport(data);
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading("scan", false);
  }
}

async function postProbe(url, body, isJson) {
  setLoading("probe", true);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: isJson ? { "Content-Type": "application/json" } : undefined,
      body,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Probe failed");
    renderProbeReport(data);
  } catch (err) {
    alert(err.message);
  } finally {
    setLoading("probe", false);
  }
}

function setLoading(mode, on) {
  const panel = document.getElementById(`panel-${mode}`);
  if (panel) panel.classList.toggle("loading", on);
}

function showResults() {
  results.classList.remove("hidden");
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderScanReport(report) {
  lastReport = report;
  showResults();
  probeResults.classList.add("hidden");
  findingsHeading.classList.remove("hidden");
  findingsList.classList.remove("hidden");

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

  metaText.textContent = `Static scan · ${report.findings.length} finding(s) · ${report.scanDurationMs}ms · ${new Date(report.scannedAt).toLocaleString()}`;

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

function renderProbeReport(report) {
  lastReport = report;
  showResults();

  const connected = report.servers.filter((s) => s.status === "connected").length;
  const liveTools = report.servers.reduce((n, s) => n + s.tools.length, 0);
  const staticSev = report.staticScan.bySeverity;
  const liveSev = report.liveScan?.bySeverity;

  summaryRow.innerHTML = `
    <div class="stat-card neutral"><div class="count">${report.servers.length}</div><div class="label">Servers</div></div>
    <div class="stat-card neutral"><div class="count">${connected}</div><div class="label">Connected</div></div>
    <div class="stat-card neutral"><div class="count">${liveTools}</div><div class="label">Live tools</div></div>
    ${staticSev.critical || liveSev?.critical ? `<div class="stat-card critical"><div class="count">${(staticSev.critical || 0) + (liveSev?.critical || 0)}</div><div class="label">Critical</div></div>` : ""}
    ${staticSev.high || liveSev?.high ? `<div class="stat-card high"><div class="count">${(staticSev.high || 0) + (liveSev?.high || 0)}</div><div class="label">High</div></div>` : ""}
  `;

  metaText.textContent = `Live probe · ${report.probeDurationMs}ms · ${new Date(report.probedAt).toLocaleString()}`;

  owaspSection.classList.add("hidden");
  findingsHeading.classList.add("hidden");
  findingsList.classList.add("hidden");
  cleanMessage.classList.add("hidden");

  probeResults.classList.remove("hidden");
  probeResults.innerHTML = "";

  const notice = document.createElement("p");
  notice.className = "probe-legal";
  notice.style.textAlign = "left";
  notice.style.marginBottom = "1rem";
  notice.textContent = report.legalNotice;
  probeResults.appendChild(notice);

  for (const server of report.servers) {
    probeResults.appendChild(buildServerCard(server));
  }

  if (report.liveScan?.findings?.length) {
    const heading = document.createElement("h2");
    heading.className = "findings-heading";
    heading.textContent = "Live surface findings";
    probeResults.appendChild(heading);
    report.liveScan.findings.forEach((f, i) => {
      probeResults.appendChild(buildFindingCard(f, i));
    });
  }
}

function buildServerCard(server) {
  const el = document.createElement("article");
  el.className = `server-card ${server.status}`;

  const toolsHtml =
    server.tools.length > 0
      ? `<ul class="tool-list">${server.tools
          .map(
            (t) =>
              `<li><strong>${escapeHtml(t.name)}</strong> — ${escapeHtml((t.description || "").slice(0, 100))}${t.description?.length > 100 ? "…" : ""}</li>`
          )
          .join("")}</ul>`
      : "";

  const driftHtml =
    server.drift?.onlyLive?.length > 0
      ? `<p class="drift-note">Runtime-only (not in static export): ${escapeHtml(server.drift.onlyLive.join(", "))}</p>`
      : "";

  const meta = [
    server.packageId ? `Package: ${escapeHtml(server.packageId)}` : "",
    server.commandLine ? escapeHtml(server.commandLine) : "",
    server.durationMs ? `${server.durationMs}ms` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  el.innerHTML = `
    <div class="server-card-header">
      <h3>${escapeHtml(server.serverName)}</h3>
      <span class="status-pill ${server.status}">${server.status}</span>
    </div>
    ${meta ? `<p class="finding-meta">${meta}</p>` : ""}
    ${server.skipReason ? `<p class="drift-note">${escapeHtml(server.skipReason)}</p>` : ""}
    ${server.error ? `<p class="drift-note" style="color:var(--critical)">${escapeHtml(server.error)}</p>` : ""}
    ${server.status === "connected" ? `<p class="finding-meta">${server.tools.length} tools · ${server.prompts.length} prompts · ${server.resources.length} resources</p>` : ""}
    ${toolsHtml}
    ${driftHtml}
  `;
  return el;
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
