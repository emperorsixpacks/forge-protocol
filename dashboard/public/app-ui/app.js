// Forge Dashboard — Kite EVM SPA
(() => {
  // ── API ──
  async function api(path, opts = {}) {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  }

  // ── Toast ──
  function toast(msg, type = "info") {
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = msg;
    document.getElementById("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // ── Helpers ──
  function shortAddr(addr) {
    return addr ? addr.slice(0, 6) + "…" + addr.slice(-4) : "—";
  }
  function formatUsdt(raw) {
    // USDT on Kite uses 18 decimals — show up to 3 decimal places
    const s = String(raw).padStart(19, "0");
    const whole = s.slice(0, -18).replace(/^0+/, "") || "0";
    const frac = s.slice(-18, -15) || "000";
    return `${whole}.${frac} USDT`;
  }
  const STATUS_COLOR = {
    Funded: "badge-blue",
    Submitted: "badge-yellow",
    Completed: "badge-green",
    Rejected: "badge-red",
    Cancelled: "badge-gray",
  };

  // ── Router ──
  const routes = {
    "/": renderOverview,
    "/jobs": renderJobs,
    "/agents": renderAgents,
    "/validators": renderValidators,
  };

  function navigate(route) {
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === route);
    });
    const fn = routes[route] || renderOverview;
    fn();
  }

  window.addEventListener("hashchange", () =>
    navigate(location.hash.slice(1) || "/")
  );
  document.querySelectorAll(".nav-item").forEach((el) =>
    el.addEventListener("click", (e) => {
      e.preventDefault();
      location.hash = "#" + el.dataset.route;
    })
  );

  // ── Overview ──
  async function renderOverview() {
    const page = document.getElementById("page");
    page.innerHTML = `<div class="page-header"><h1>Overview</h1></div>
      <div class="stats-grid" id="stats-grid">
        ${["Total Agents","Total Jobs","Active Jobs","Protocol Fee"].map(l =>
          `<div class="stat-card"><div class="stat-label">${l}</div><div class="stat-value skeleton">—</div></div>`
        ).join("")}
      </div>`;
    try {
      const s = await api("/api/stats");
      const vals = [s.totalAgents, s.totalJobs, s.activeJobs, `${s.feeBps / 100}%`];
      document.querySelectorAll("#stats-grid .stat-value").forEach((el, i) => {
        el.classList.remove("skeleton");
        el.textContent = vals[i];
      });
    } catch (e) { toast(e.message, "error"); }
  }

  // ── Jobs ──
  let jobFilter = "All";
  async function renderJobs() {
    const page = document.getElementById("page");
    const filters = ["All", "Funded", "Submitted", "Completed", "Rejected", "Cancelled"];
    page.innerHTML = `
      <div class="page-header">
        <h1>Jobs</h1>
        <div class="filter-bar">
          ${filters.map(f => `<button class="filter-btn${f === jobFilter ? " active" : ""}" data-filter="${f}">${f}</button>`).join("")}
        </div>
      </div>
      <div id="jobs-list" class="card-list"><div class="loading">Loading…</div></div>`;

    page.querySelectorAll(".filter-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        jobFilter = btn.dataset.filter;
        renderJobs();
      })
    );

    try {
      const jobs = await api(`/api/jobs${jobFilter !== "All" ? `?status=${jobFilter}` : ""}`);
      const list = document.getElementById("jobs-list");
      if (!jobs.length) { list.innerHTML = `<div class="empty">No jobs found.</div>`; return; }
      list.innerHTML = jobs.map((j) => {
        const deliverable = j.deliverable || "";
        const truncated = deliverable.length > 120;
        const id = `del-${j.id}`;
        return `
        <div class="card">
          <div class="card-row">
            <span class="card-title">#${j.id} — ${j.description || "—"}</span>
            <span class="badge ${STATUS_COLOR[j.status] || "badge-gray"}">${j.status}</span>
          </div>
          <div class="card-meta">
            <span>Client: <code>${shortAddr(j.client)}</code></span>
            <span>Provider: <code>${shortAddr(j.provider)}</code></span>
            <span>Budget: ${formatUsdt(j.budget)}</span>
          </div>
          ${deliverable ? `
          <div class="card-meta deliverable-row">
            <span class="deliverable-label">Deliverable:</span>
            <code id="${id}" class="deliverable-val${truncated ? " truncated" : ""}">${deliverable}</code>
            ${truncated ? `<button class="btn-link" onclick="toggleDel('${id}', this)">show more</button>` : ""}
          </div>` : ""}
          ${j.status === "Submitted" ? `
          <div class="card-actions">
            <button class="btn btn-sm" onclick="loadRound('${j.id}', this)">Load Validation Round</button>
            <span id="round-${j.id}" class="round-status"></span>
          </div>` : ""}
        </div>`;
      }).join("");
    } catch (e) { toast(e.message, "error"); }
  }

  window.toggleDel = function(id, btn) {
    const el = document.getElementById(id);
    const nowTruncated = el.classList.toggle("truncated");
    btn.textContent = nowTruncated ? "show more" : "show less";
  };

  window.loadRound = async function(jobId, btn) {
    btn.disabled = true;
    try {
      const r = await api(`/api/validators/round/${jobId}`);
      document.getElementById(`round-${jobId}`).innerHTML =
        `Round: ${r.open ? "open" : "closed"} · ✅ ${r.approvals} · ❌ ${r.rejections}`;
    } catch (e) { toast(e.message, "error"); }
    btn.disabled = false;
  };

  // ── Agents ──
  async function renderAgents() {
    const page = document.getElementById("page");
    page.innerHTML = `<div class="page-header"><h1>Agents</h1></div>
      <div id="agents-list" class="card-list"><div class="loading">Loading…</div></div>`;
    try {
      const agents = await api("/api/agents");
      const list = document.getElementById("agents-list");
      if (!agents.length) { list.innerHTML = `<div class="empty">No agents registered.</div>`; return; }
      list.innerHTML = agents.map((a) => `
        <div class="card">
          <div class="card-row">
            <span class="card-title">Agent #${a.id}</span>
            <code class="addr">${shortAddr(a.owner)}</code>
          </div>
          <div class="card-meta">
            <span>URI: <code>${a.uri || "—"}</code></span>
          </div>
        </div>`).join("");
    } catch (e) { toast(e.message, "error"); }
  }

  // ── Validators ──
  async function renderValidators() {
    const page = document.getElementById("page");
    page.innerHTML = `<div class="page-header"><h1>Validators</h1></div>
      <div class="stats-grid" id="val-stats">
        <div class="stat-card"><div class="stat-label">Validator Count</div><div class="stat-value skeleton" id="val-count">—</div></div>
        <div class="stat-card"><div class="stat-label">Min Stake</div><div class="stat-value skeleton" id="val-minstake">—</div></div>
      </div>
      <div id="validators-list" class="card-list"><div class="loading">Loading…</div></div>`;
    try {
      const data = await api("/api/validators");
      document.getElementById("val-count").textContent = data.count;
      document.getElementById("val-count").classList.remove("skeleton");
      document.getElementById("val-minstake").textContent = formatUsdt(data.minStake);
      document.getElementById("val-minstake").classList.remove("skeleton");

      const list = document.getElementById("validators-list");
      if (!data.validators.length) {
        list.innerHTML = `<div class="empty">No known validators configured.<br>Set <code>KNOWN_VALIDATORS</code> env var.</div>`;
        return;
      }
      list.innerHTML = data.validators.map((v) => `
        <div class="card">
          <div class="card-row">
            <code class="addr">${v.address}</code>
            <span class="badge ${BigInt(v.staked) > 0n ? "badge-green" : "badge-gray"}">
              ${BigInt(v.staked) > 0n ? "Staked" : "Not staked"}
            </span>
          </div>
          <div class="card-meta">
            <span>Staked: ${formatUsdt(v.staked)}</span>
          </div>
        </div>`).join("");
    } catch (e) { toast(e.message, "error"); }
  }

  // ── Init ──
  navigate(location.hash.slice(1) || "/");
})();
