/* ==========================================================
   AGENTOPS — DASHBOARD SCRIPT
   ========================================================== */

/* ---------- CONFIG ----------
   Switch USE_MOCK to false once the FastAPI backend
   (see multi-agent-business-assistant/) is running locally. */
const CONFIG = {
  API_BASE_URL: "http://localhost:8000",
  USE_MOCK: false
};

/* ---------- STATIC DATA (mirrors backend mock catalog) ---------- */
const PRODUCTS = {
  "wireless keyboard":   { stock: 50,  price: 1200 },
  "wireless mouse":      { stock: 100, price: 600 },
  "usb-c hub":           { stock: 30,  price: 1500 },
  "mechanical keyboard": { stock: 12,  price: 3200 },
  "laptop stand":        { stock: 45,  price: 1800 },
  "usb-c cable 2m":      { stock: 8,   price: 299 },
  "webcam 1080p":        { stock: 0,   price: 3500 },
  "bluetooth speaker":   { stock: 22,  price: 2400 },
  "hdmi cable 1.5m":     { stock: 75,  price: 499 },
  "monitor light bar":   { stock: 18,  price: 2200 }
};

const LOW_STOCK_THRESHOLD = 20;

const ORDER_10482 = {
  id: "#10482",
  customer: "Aarav Sharma",
  product: "Wireless Keyboard",
  quantity: 2,
  location: "Delhi",
  status: "In Transit",
  eta: "24 Sep 2026",
  shippingCost: 80
};

const AGENT_META = {
  orchestrator: { label: "Orchestrator",     icon: "git-branch" },
  inventory:    { label: "Inventory Agent",  icon: "package" },
  pricing:      { label: "Pricing Agent",    icon: "indian-rupee" },
  logistics:    { label: "Logistics Agent",  icon: "truck" }
};

let activityLog = [
  { agent: "Inventory Agent", desc: "Checked stock for Wireless Keyboard", minsAgo: 2 },
  { agent: "Pricing Agent",   desc: "Calculated order total",              minsAgo: 8 },
  { agent: "Logistics Agent", desc: "Checked Order #10482",                minsAgo: 15 },
  { agent: "System",          desc: "Daily inventory analysis completed",  minsAgo: 32 }
];

let isProcessing = false;

/* ==========================================================
   INIT
   ========================================================== */
function initializeDashboard() {
  if (window.lucide) lucide.createIcons();

  renderActivity();
  updateTopbarDate();
  wireSidebar();
  wireQueryInput();
  wireChips();
}

function updateTopbarDate() {
  const el = document.getElementById("topbarDate");
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", year: "numeric"
  });
}

/* ==========================================================
   SIDEBAR / NAV
   ========================================================== */
function wireSidebar() {
  const app = document.querySelector(".app");
  const toggleBtn = document.getElementById("sidebarToggle");
  const menuBtn = document.getElementById("menuBtn");
  const backdrop = document.getElementById("backdrop");

  toggleBtn.addEventListener("click", () => {
    app.classList.toggle("collapsed");
  });

  menuBtn.addEventListener("click", () => {
    app.classList.add("nav-open");
  });

  backdrop.addEventListener("click", () => {
    app.classList.remove("nav-open");
  });

  document.querySelectorAll(".nav-item[data-nav]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-item[data-nav]").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      app.classList.remove("nav-open");
    });
  });
}

/* ==========================================================
   QUERY INPUT
   ========================================================== */
function wireQueryInput() {
  const input = document.getElementById("queryInput");
  const sendBtn = document.getElementById("sendBtn");

  sendBtn.addEventListener("click", handleQuerySubmit);

  input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleQuerySubmit();
    }
  });
}

function wireChips() {
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const query = chip.getAttribute("data-query");
      const input = document.getElementById("queryInput");
      input.value = query;
      input.focus();
    });
  });
}

async function handleQuerySubmit() {
  if (isProcessing) return;

  const input = document.getElementById("queryInput");
  const query = input.value.trim();
  if (!query) {
    input.focus();
    return;
  }

  isProcessing = true;
  toggleSendState(true);
  showThinkingState(query);

  try {
    const result = await sendQueryToBackend(query);
    await playAgentSequence(result);
    renderResult(query, result);
    addActivityFromResult(result);
  } catch (err) {
    renderError(query, err);
  } finally {
    isProcessing = false;
    toggleSendState(false);
  }
}

function toggleSendState(disabled) {
  const btn = document.getElementById("sendBtn");
  btn.disabled = disabled;
}

function resetQuery() {
  document.getElementById("queryInput").value = "";
}

/* ==========================================================
   BACKEND COMMUNICATION
   ========================================================== */
async function sendQueryToBackend(query) {

  const response = await fetch(`${CONFIG.API_BASE_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: query
    })
  });

  if (!response.ok) {
    throw new Error(`Backend responded with status ${response.status}`);
  }

  const data = await response.json();

  console.log("BACKEND RESPONSE:", data);

  const agents = data.agents || [];

  return {
    response: agents.length > 0
      ? agents.map(agent => agent.response).join("\n\n")
      : "No specialist agent response received.",

    agent: agents.length > 0
      ? agents[agents.length - 1].name
      : "Business Orchestrator",

    status: "success",

    agents_used: agents.map(agent => agent.name),

    execution: agents.map(agent => ({
      agent: agent.name,
      status: "completed",
      duration: "",
      detail: {}
    }))
  };
}
/* ==========================================================
   MOCK RESPONSE ENGINE
   ========================================================== */
function getMockResponse(query) {
  const q = query.toLowerCase();

  // 1. availability + price ("wireless keyboard" style compound query)
  if (q.includes("wireless keyboard") && (q.includes("price") || q.includes("cost") || q.includes("total"))) {
    const p = PRODUCTS["wireless keyboard"];
    const qty = extractQuantity(q) || 20;
    const pricing = computePricing(p.price, qty);
    return {
      response: `${qty} Wireless Keyboards are available. The estimated total including GST is ${formatINR(pricing.total)}.`,
      agent: "Business Orchestrator",
      status: "success",
      agents_used: ["Inventory Agent", "Pricing Agent"],
      execution: [
        {
          agent: "Inventory Agent", status: "completed", duration: "0.8s",
          detail: { "Product": "Wireless Keyboard", "Stock": p.stock, "Requested": qty, "Status": qty <= p.stock ? "Available" : "Insufficient" }
        },
        {
          agent: "Pricing Agent", status: "completed", duration: "1.1s",
          detail: { "Unit Price": formatINR(p.price), "Quantity": qty, "Subtotal": formatINR(pricing.subtotal), "GST": formatINR(pricing.gst), "Total": formatINR(pricing.total) }
        }
      ]
    };
  }

  // 2. low stock report
  if (q.includes("low-stock") || q.includes("low stock") || q.includes("insufficient stock")) {
    const lowStock = Object.entries(PRODUCTS)
      .filter(([, v]) => v.stock < LOW_STOCK_THRESHOLD)
      .map(([name, v]) => `${toTitle(name)} — ${v.stock} units`);

    return {
      response: `${lowStock.length} products currently fall below the healthy stock threshold: ${lowStock.join(", ")}.`,
      agent: "Business Orchestrator",
      status: "success",
      agents_used: ["Inventory Agent"],
      execution: [
        {
          agent: "Inventory Agent", status: "completed", duration: "0.6s",
          detail: Object.fromEntries(lowStock.map(l => l.split(" — ")))
        }
      ]
    };
  }

  // 3. order / delivery tracking
  if (q.includes("10482") || q.includes("order") || q.includes("delivery") || q.includes("track")) {
    const o = ORDER_10482;
    return {
      response: `Order ${o.id} is currently ${o.status.toLowerCase()} to ${o.location}. Estimated delivery is ${o.eta}.`,
      agent: "Business Orchestrator",
      status: "success",
      agents_used: ["Logistics Agent"],
      execution: [
        {
          agent: "Logistics Agent", status: "completed", duration: "0.7s",
          detail: { "Order ID": o.id, "Status": o.status, "Location": o.location, "Estimated Delivery": o.eta, "Shipping Cost": formatINR(o.shippingCost) }
        }
      ]
    };
  }

  // 4. generic pricing / cost calculation for any known product
  const matchedProduct = Object.keys(PRODUCTS).find(name => q.includes(name));
  if (matchedProduct && (q.includes("cost") || q.includes("price") || q.includes("total"))) {
    const p = PRODUCTS[matchedProduct];
    const qty = extractQuantity(q) || 1;
    const pricing = computePricing(p.price, qty);
    return {
      response: `${qty} ${toTitle(matchedProduct)}${qty > 1 ? "s" : ""} will cost ${formatINR(pricing.total)}, including GST.`,
      agent: "Business Orchestrator",
      status: "success",
      agents_used: ["Inventory Agent", "Pricing Agent"],
      execution: [
        {
          agent: "Inventory Agent", status: "completed", duration: "0.6s",
          detail: { "Product": toTitle(matchedProduct), "Stock": p.stock, "Requested": qty, "Status": qty <= p.stock ? "Available" : "Insufficient" }
        },
        {
          agent: "Pricing Agent", status: "completed", duration: "0.9s",
          detail: { "Unit Price": formatINR(p.price), "Quantity": qty, "Subtotal": formatINR(pricing.subtotal), "GST": formatINR(pricing.gst), "Total": formatINR(pricing.total) }
        }
      ]
    };
  }

  // 5. availability-only for any known product
  if (matchedProduct) {
    const p = PRODUCTS[matchedProduct];
    const qty = extractQuantity(q) || 1;
    return {
      response: `${toTitle(matchedProduct)} — ${p.stock} units in stock. ${qty} requested is ${qty <= p.stock ? "available." : "more than what's currently in stock."}`,
      agent: "Business Orchestrator",
      status: "success",
      agents_used: ["Inventory Agent"],
      execution: [
        {
          agent: "Inventory Agent", status: "completed", duration: "0.5s",
          detail: { "Product": toTitle(matchedProduct), "Stock": p.stock, "Requested": qty, "Status": qty <= p.stock ? "Available" : "Insufficient" }
        }
      ]
    };
  }

  // 6. today's business activity summary
  if (q.includes("today") && q.includes("activity")) {
    return {
      response: "Today: 38 orders placed, ₹84,500 in revenue, 12 orders pending fulfillment, and 6 products below the healthy stock threshold.",
      agent: "Business Orchestrator",
      status: "success",
      agents_used: ["Inventory Agent", "Logistics Agent"],
      execution: [
        { agent: "Inventory Agent", status: "completed", duration: "0.5s", detail: { "Low Stock Items": 6, "Inventory Health": "87%" } },
        { agent: "Logistics Agent", status: "completed", duration: "0.6s", detail: { "Orders Today": 38, "Pending Orders": 12 } }
      ]
    };
  }

  // fallback — orchestrator can't confidently route
  return {
    response: "I couldn't confidently match that to inventory, pricing, or logistics data. Try naming a product, an order number, or asking about today's activity.",
    agent: "Business Orchestrator",
    status: "partial",
    agents_used: [],
    execution: []
  };
}

function extractQuantity(text) {
  const numeralMatch = text.match(/\b(\d+)\b/);
  if (numeralMatch) return parseInt(numeralMatch[1], 10);

  const words = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    nine: 9, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100
  };
  for (const [word, value] of Object.entries(words)) {
    if (text.includes(word)) return value;
  }
  return null;
}

function computePricing(unitPrice, qty) {
  const subtotal = unitPrice * qty;
  const discountPercent = qty >= 50 ? 10 : qty >= 20 ? 5 : 0;
  const discount = subtotal * (discountPercent / 100);
  const taxable = subtotal - discount;
  const gst = taxable * 0.18;
  const total = taxable + gst;
  return { subtotal, discount, discountPercent, taxable, gst, total };
}

function toTitle(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function formatINR(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ==========================================================
   THINKING STATE + AGENT EXECUTION ANIMATION
   ========================================================== */
function showThinkingState(query) {
  const empty = document.getElementById("resultEmpty");
  const body = document.getElementById("resultBody");
  empty.classList.add("hidden");
  body.classList.remove("hidden");

  document.getElementById("resultQueryText").textContent = query;
  document.getElementById("resultSteps").innerHTML =
    `<div class="step"><div class="step-head"><span class="step-title">Understanding request…</span></div></div>`;
  document.getElementById("resultFinal").classList.add("hidden");

  updateAgentStatus("orchestrator", "thinking");
}

async function playAgentSequence(result) {

  const agentsUsed = result.agents_used || [];

  const keyMap = {
    "Inventory Agent": "inventory",
    "InventoryAgent": "inventory",

    "Pricing Agent": "pricing",
    "PricingAgent": "pricing",

    "Logistics Agent": "logistics",
    "LogisticsAgent": "logistics"
  };

  const keys = agentsUsed
    .map(agent => keyMap[agent])
    .filter(Boolean);

  renderPipeline(keys);
  renderAgentExecution(keys, "pending");

  document.getElementById("execPill").textContent = "Running";
  document.getElementById("execPill").className = "pill running";

  setPipelineNodeState("query", "done");

  setPipelineNodeState("orchestrator", "active");
  updateAgentStatus("orchestrator", "running");

  await delay(400);

  setPipelineNodeState("orchestrator", "done");
  updateAgentStatus("orchestrator", "completed");

  for (const key of keys) {

    setPipelineNodeState(key, "active");
    updateAgentStatus(key, "running");

    await delay(450);

    setPipelineNodeState(key, "done");
    updateAgentStatus(key, "completed");
  }

  setPipelineNodeState("final", "active");

  await delay(250);

  setPipelineNodeState("final", "done");

  document.getElementById("execPill").textContent = "Completed";
  document.getElementById("execPill").className = "pill done";
}

function renderPipeline(activeKeys) {
  const branches = document.getElementById("pipelineBranches");
  if (activeKeys.length === 0) {
    branches.innerHTML = `<div class="pipeline-node" data-node="none"><div class="pipeline-dot"><i data-lucide="minus"></i></div><span>No agent required</span></div>`;
  } else {
    branches.innerHTML = activeKeys.map(key => `
      <div class="pipeline-node" data-node="${key}">
        <div class="pipeline-dot"><i data-lucide="${AGENT_META[key].icon}"></i></div>
        <span>${AGENT_META[key].label}</span>
      </div>
    `).join("");
  }
  if (window.lucide) lucide.createIcons();

  // reset all node states
  document.querySelectorAll(".pipeline-node").forEach(n => n.classList.remove("active", "done"));
  document.querySelectorAll(".pipeline-line").forEach(l => l.classList.remove("done"));
}

function setPipelineNodeState(key, state) {
  const node = document.querySelector(`.pipeline-node[data-node="${key}"]`);
  if (!node) return;
  node.classList.remove("active", "done");
  if (state) node.classList.add(state);
}

function renderAgentExecution(activeKeys, state) {
  const list = document.getElementById("agentExecList");
  const allKeys = ["inventory", "pricing", "logistics"];

  list.innerHTML = allKeys.map(key => {
    const used = activeKeys.includes(key);
    const meta = AGENT_META[key];
    const status = used ? "pending" : "not-required";
    return renderAgentRow(key, meta.label, meta.icon, status);
  }).join("");

  if (window.lucide) lucide.createIcons();
}

function renderAgentRow(key, label, icon, status) {
  const stateLabel = {
    "pending": "Waiting…",
    "running": "Running…",
    "completed": "Completed",
    "error": "Error",
    "not-required": "Not required"
  }[status];

  const rowClass = status === "not-required" ? "" : status;
  const displayIcon = status === "running" ? "loader-2" : status === "completed" ? "check" : status === "error" ? "x" : icon;
  const spinClass = status === "running" ? "spin" : "";

  return `
    <div class="agent-row ${rowClass}" data-agent="${key}">
      <div class="agent-row-icon"><i data-lucide="${displayIcon}" class="${spinClass}"></i></div>
      <span class="agent-row-name">${label}</span>
      <span class="agent-row-state">${stateLabel}</span>
    </div>
  `;
}

function updateAgentStatus(key, status) {
  const row = document.querySelector(
    `.agent-row[data-agent="${key}"]`
  );

  if (!row) return;

  // Update row status class
  row.className = `agent-row ${
    status === "pending" ? "" : status
  }`;

  // Update status text
  const stateLabel = {
    "pending": "Waiting…",
    "thinking": "Thinking…",
    "running": "Running…",
    "completed": "Completed",
    "error": "Error"
  }[status] || status;

  const stateEl = row.querySelector(".agent-row-state");

  if (stateEl) {
    stateEl.textContent = stateLabel;
  }

  // Get the icon container
  const iconContainer = row.querySelector(".agent-row-icon");

  if (!iconContainer) return;

  // Decide which icon to show
  const icon =
    status === "running"
      ? "loader-2"
      : status === "completed"
      ? "check"
      : status === "error"
      ? "x"
      : AGENT_META[key]?.icon || "circle";

  // Add spinning animation while running
  const spinClass =
    status === "running"
      ? "spin"
      : "";

  // Recreate the icon
  iconContainer.innerHTML = `
    <i
      data-lucide="${icon}"
      class="${spinClass}"
    ></i>
  `;

  // Convert Lucide <i> into the actual SVG icon
  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ==========================================================
   RESULT RENDERING
   ========================================================== */
   function formatAgentResponse(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}
function renderResult(query, result) {
  document.getElementById("resultTime").textContent = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  document.getElementById("resultQueryText").textContent = query;

  const stepsEl = document.getElementById("resultSteps");
  const execution = result.execution || [];

  if (execution.length === 0) {
    stepsEl.innerHTML = `<div class="step"><p style="color:var(--text-secondary);font-size:13px;">No specialist agent was required for this request.</p></div>`;
  } else {
    stepsEl.innerHTML = execution.map(step => `
      <div class="step">
        <div class="step-head">
          <div class="step-icon"><i data-lucide="check"></i></div>
          <span class="step-title">${step.agent}</span>
          <span class="step-duration">Completed in ${step.duration}</span>
        </div>
        <div class="step-rows">
          ${Object.entries(step.detail || {}).map(([k, v]) => `
            <div class="step-row"><span>${k}</span><span>${v}</span></div>
          `).join("")}
        </div>
      </div>
    `).join("");
  }

  const finalEl = document.getElementById("resultFinal");
  finalEl.classList.remove("hidden");
document.getElementById("resultFinalText").innerHTML =formatAgentResponse(result.response);
  if (window.lucide) lucide.createIcons();
}

function renderError(query, err) {
  document.getElementById("execPill").textContent = "Error";
  document.getElementById("execPill").className = "pill";
  const stepsEl = document.getElementById("resultSteps");
  stepsEl.innerHTML = `<div class="step"><p style="color:var(--danger);font-size:13px;">Something went wrong reaching the backend: ${err.message}</p></div>`;
  const finalEl = document.getElementById("resultFinal");
  finalEl.classList.remove("hidden");
  document.getElementById("resultFinalText").textContent = "The Business Orchestrator could not complete this request. Please try again.";
  if (window.lucide) lucide.createIcons();
}

/* ==========================================================
   ACTIVITY FEED
   ========================================================== */
function renderActivity() {
  const list = document.getElementById("activityList");
  const iconMap = { "Inventory Agent": "package", "Pricing Agent": "indian-rupee", "Logistics Agent": "truck", "System": "cog" };

  list.innerHTML = activityLog.map(item => `
    <li>
      <div class="activity-icon"><i data-lucide="${iconMap[item.agent] || "activity"}"></i></div>
      <div class="activity-text">
        <span class="activity-agent">${item.agent}</span>
        <span class="activity-desc">${item.desc}</span>
        <span class="activity-time">${item.minsAgo} min ago</span>
      </div>
    </li>
  `).join("");

  if (window.lucide) lucide.createIcons();
}

function addActivity(agent, desc) {
  activityLog.unshift({ agent, desc, minsAgo: 0 });
  activityLog = activityLog.slice(0, 8);
  renderActivity();
}

function addActivityFromResult(result) {
  const agentsUsed = result.agents_used && result.agents_used.length ? result.agents_used : ["Business Orchestrator"];
  addActivity(agentsUsed[0], "Processed a new AI business query");
}

/* ==========================================================
   BOOT
   ========================================================== */
document.addEventListener("DOMContentLoaded", initializeDashboard);
