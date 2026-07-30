async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

async function loadStatus() {
  const badge = document.getElementById("status-badge");
  const toggle = document.getElementById("toggle");
  const runBtn = document.getElementById("run-now");
  try {
    const s = await fetchJson("/api/status");
    document.getElementById("routine-name").textContent = s.name || "Ops Agent Routine";
    document.getElementById("schedule").textContent = s.schedule
      ? `Runs ${s.schedule} · workflow_dispatch enabled`
      : "Schedule unavailable";
    badge.textContent = s.enabled ? "Active" : "Disabled";
    badge.className = "badge " + (s.enabled ? "active" : "disabled");
    toggle.checked = s.enabled;
    toggle.disabled = false;
    runBtn.disabled = false;
  } catch (err) {
    badge.textContent = "Error";
    document.getElementById("schedule").textContent = err.message;
  }
}

async function loadRuns() {
  const tbody = document.querySelector("#runs-table tbody");
  try {
    const runs = await fetchJson("/api/runs");
    if (!runs.length) {
      tbody.innerHTML = "<tr><td colspan=4>No runs yet — click \"Run now\" to trigger one.</td></tr>";
      return;
    }
    tbody.innerHTML = runs
      .map((r) => {
        const cls = r.status !== "completed" ? "pending" : r.conclusion === "success" ? "success" : "failure";
        const label = r.status !== "completed" ? r.status : r.conclusion;
        return `<tr>
          <td><span class="status-dot ${cls}"></span>${label}</td>
          <td>${r.event}</td>
          <td>${timeAgo(r.createdAt)}</td>
          <td><a href="${r.url}" target="_blank" rel="noopener">View log</a></td>
        </tr>`;
      })
      .join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${err.message}</td></tr>`;
  }
}

async function loadActivity() {
  const list = document.getElementById("activity-list");
  try {
    const items = await fetchJson("/api/activity");
    if (!items.length) {
      list.innerHTML = "<li>No triaged or reviewed issues yet.</li>";
      return;
    }
    list.innerHTML = items
      .map(
        (i) => `<li>
          <a href="${i.url}" target="_blank" rel="noopener">#${i.number} ${i.title}</a>
          ${i.labels.map((l) => `<span class="label-chip">${l.name}</span>`).join("")}
          <span style="float:right; color:var(--muted)">${timeAgo(i.updatedAt)}</span>
        </li>`
      )
      .join("");
  } catch (err) {
    list.innerHTML = `<li>Error: ${err.message}</li>`;
  }
}

function refreshAll() {
  loadStatus();
  loadRuns();
  loadActivity();
}

document.getElementById("run-now").addEventListener("click", async (e) => {
  e.target.disabled = true;
  e.target.textContent = "Starting…";
  try {
    await fetchJson("/api/run", { method: "POST" });
    setTimeout(loadRuns, 2000);
  } catch (err) {
    alert("Failed to trigger run: " + err.message);
  } finally {
    e.target.textContent = "Run now";
    e.target.disabled = false;
  }
});

document.getElementById("toggle").addEventListener("change", async (e) => {
  const enabled = e.target.checked;
  e.target.disabled = true;
  try {
    await fetchJson("/api/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
  } catch (err) {
    alert("Failed to toggle: " + err.message);
    e.target.checked = !enabled;
  } finally {
    e.target.disabled = false;
    loadStatus();
  }
});

refreshAll();
setInterval(refreshAll, 15000);
