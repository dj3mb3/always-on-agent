// Local dashboard for the ops-agent GitHub Actions routine.
// No dependencies: uses Node's built-in http + child_process only, so
// `node dashboard/server.js` runs immediately with no npm install.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const PORT = process.env.PORT || 4321;
const REPO = "dj3mb3/always-on-agent";
const WORKFLOW = "ops-agent.yml";
const REPO_ROOT = path.join(__dirname, "..");
const PUBLIC_DIR = path.join(__dirname, "public");

function gh(args) {
  return new Promise((resolve, reject) => {
    execFile("gh", args, { cwd: REPO_ROOT, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function describeCron(cron) {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dom, mon, dow] = parts;
  if (/^\d+(,\d+)*$/.test(min) && hour === "*" && dom === "*" && mon === "*" && dow === "*") {
    const count = min.split(",").length;
    if (count > 1) return `every ${Math.round(60 / count)} minutes`;
  }
  if (min.startsWith("*/") && hour === "*") return `every ${min.slice(2)} minutes`;
  if (/^\d+$/.test(min) && hour === "*") return "hourly";
  return cron;
}

function readWorkflowCron() {
  const file = path.join(REPO_ROOT, ".github", "workflows", WORKFLOW);
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/cron:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

async function handleStatus(res) {
  try {
    const cron = readWorkflowCron();
    const listJson = await gh(["workflow", "list", "--repo", REPO, "--json", "id,name,path,state"]);
    const list = JSON.parse(listJson);
    const view = list.find((w) => w.path.endsWith(WORKFLOW));
    if (!view) throw new Error(`workflow ${WORKFLOW} not found via gh workflow list`);
    sendJson(res, 200, {
      name: view.name,
      enabled: view.state === "active",
      state: view.state,
      cron,
      schedule: cron ? describeCron(cron) : null,
    });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

async function handleRuns(res) {
  try {
    const json = await gh([
      "run", "list",
      "--repo", REPO,
      "--workflow", WORKFLOW,
      "--limit", "10",
      "--json", "databaseId,status,conclusion,createdAt,event,url",
    ]);
    sendJson(res, 200, JSON.parse(json || "[]"));
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

async function handleActivity(res) {
  try {
    const [triaged, compliance] = await Promise.all([
      gh(["issue", "list", "--repo", REPO, "--label", "triaged", "--limit", "15", "--json", "number,title,labels,updatedAt,url"]),
      gh(["issue", "list", "--repo", REPO, "--label", "compliance-reviewed", "--limit", "15", "--json", "number,title,labels,updatedAt,url"]),
    ]);
    const items = [...JSON.parse(triaged || "[]"), ...JSON.parse(compliance || "[]")];
    items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    sendJson(res, 200, items.slice(0, 15));
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

async function handleRunNow(res) {
  try {
    await gh(["workflow", "run", WORKFLOW, "--repo", REPO]);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

async function handleToggle(req, res) {
  try {
    const body = await readBody(req);
    const { enabled } = JSON.parse(body || "{}");
    await gh(["workflow", enabled ? "enable" : "disable", WORKFLOW, "--repo", REPO]);
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

function serveStatic(req, res) {
  const reqPath = req.url === "/" ? "/index.html" : req.url;
  const filePath = path.join(PUBLIC_DIR, path.normalize(reqPath).replace(/^(\.\.[/\\])+/, ""));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === "/api/status" && req.method === "GET") return handleStatus(res);
  if (req.url === "/api/runs" && req.method === "GET") return handleRuns(res);
  if (req.url === "/api/activity" && req.method === "GET") return handleActivity(res);
  if (req.url === "/api/run" && req.method === "POST") return handleRunNow(res);
  if (req.url === "/api/toggle" && req.method === "POST") return handleToggle(req, res);
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Ops agent dashboard running at http://localhost:${PORT}`);
});
