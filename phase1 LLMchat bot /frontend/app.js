/**
 * LLM Playground - Core Client Application
 * Exposes transparent LLM behavior: messages array, system prompt, temperature,
 * latency, tokens, cost estimation, sessions persistence, and raw JSON inspection.
 */

// Application State
const state = {
  activeSessionId: null,
  currentSession: null,
  config: null,
  lastRawRequest: null,
  lastRawResponse: null,
  isLoading: false,
  apiOverrides: {
    baseUrl: localStorage.getItem("llm_base_url_override") || "",
    apiKey: localStorage.getItem("llm_api_key_override") || ""
  }
};

// DOM Element References
const dom = {
  sidebar: document.getElementById("sidebar"),
  btnToggleSidebar: document.getElementById("btn-toggle-sidebar"),
  btnNewSession: document.getElementById("btn-new-session"),
  sessionsList: document.getElementById("sessions-list"),
  sessionCountBadge: document.getElementById("session-count-badge"),
  statusDot: document.getElementById("status-dot"),
  statusProviderName: document.getElementById("status-provider-name"),
  statusApiStatus: document.getElementById("status-api-status"),
  btnOpenSettings: document.getElementById("btn-open-settings"),
  
  sessionTitleInput: document.getElementById("session-title-input"),
  headerModelPill: document.getElementById("header-model-pill"),
  selectModel: document.getElementById("select-model"),
  rangeTemperature: document.getElementById("range-temperature"),
  tempValBadge: document.getElementById("temp-val-badge"),
  
  btnToggleSysPrompt: document.getElementById("btn-toggle-sys-prompt"),
  sysPromptPanel: document.getElementById("sys-prompt-panel"),
  selectPreset: document.getElementById("select-preset"),
  textareaSysPrompt: document.getElementById("textarea-system-prompt"),
  btnSaveSysPrompt: document.getElementById("btn-save-sys-prompt"),
  sysPromptStatus: document.getElementById("sys-prompt-status"),
  
  btnInspectRaw: document.getElementById("btn-inspect-raw"),
  btnResetSession: document.getElementById("btn-reset-session"),
  
  metricLatency: document.getElementById("metric-latency"),
  metricTokens: document.getElementById("metric-tokens"),
  metricCost: document.getElementById("metric-cost"),
  metricTurns: document.getElementById("metric-turns"),
  
  chatMessages: document.getElementById("chat-messages"),
  chatForm: document.getElementById("chat-form"),
  userInput: document.getElementById("user-input"),
  btnSend: document.getElementById("btn-send"),
  charCount: document.getElementById("char-count"),
  
  modalInspector: document.getElementById("modal-inspector"),
  btnCloseInspector: document.getElementById("btn-close-inspector"),
  tabReqBtn: document.getElementById("tab-req-btn"),
  tabResBtn: document.getElementById("tab-res-btn"),
  inspectorCodeBlock: document.getElementById("inspector-code-block"),
  inspectorCodeLabel: document.getElementById("inspector-code-label"),
  btnCopyInspector: document.getElementById("btn-copy-inspector"),
  
  modalSettings: document.getElementById("modal-settings"),
  btnCloseSettings: document.getElementById("btn-close-settings"),
  btnCancelSettings: document.getElementById("btn-cancel-settings"),
  btnSaveSettings: document.getElementById("btn-save-settings"),
  inputBaseUrl: document.getElementById("input-base-url"),
  inputApiKey: document.getElementById("input-api-key"),
  settingsKeyStatus: document.getElementById("settings-key-status"),
  
  toastContainer: document.getElementById("toast-container")
};

// ==============================================================================
// 1. Initialization
// ==============================================================================
async function initApp() {
  setupEventListeners();
  await loadAppConfiguration();
  await loadSessionsList();
}

async function loadAppConfiguration() {
  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Failed to load server configuration");
    state.config = await res.json();

    // Populate Models Dropdown from Backend Config (not hardcoded in UI)
    dom.selectModel.innerHTML = "";
    state.config.models.forEach(model => {
      const opt = document.createElement("option");
      opt.value = model.id;
      opt.textContent = `${model.name} ($${model.prompt_cost_per_1m}/1M)`;
      dom.selectModel.appendChild(opt);
    });

    // Populate System Prompt Presets
    dom.selectPreset.innerHTML = "";
    state.config.system_prompts.forEach(preset => {
      const opt = document.createElement("option");
      opt.value = preset.id;
      opt.textContent = preset.name;
      dom.selectPreset.appendChild(opt);
    });
    // Add custom option
    const customOpt = document.createElement("option");
    customOpt.value = "custom";
    customOpt.textContent = "Custom Prompt...";
    dom.selectPreset.appendChild(customOpt);

    // Update Status Indicators
    updateStatusFooter();
  } catch (err) {
    showToast("Error loading config: " + err.message, "error");
  }
}

function updateStatusFooter() {
  if (!state.config) return;

  const hasKey = state.config.has_api_key || !!state.apiOverrides.apiKey;
  const baseUrl = state.apiOverrides.baseUrl || state.config.base_url;
  
  let hostName = "LLM Endpoint";
  try {
    hostName = new URL(baseUrl).hostname;
  } catch (e) {
    hostName = baseUrl.slice(0, 20);
  }

  dom.statusProviderName.textContent = hostName;
  if (hasKey) {
    dom.statusApiStatus.textContent = "API Key Active";
    dom.statusDot.className = "status-indicator-dot";
  } else {
    dom.statusApiStatus.textContent = "API Key Missing (Click ⚙️)";
    dom.statusDot.className = "status-indicator-dot warning";
  }
}

// ==============================================================================
// 2. Sessions Management
// ==============================================================================
async function loadSessionsList(selectId = null) {
  try {
    const res = await fetch("/api/sessions");
    if (!res.ok) throw new Error("Failed to fetch sessions");
    const sessions = await res.json();

    dom.sessionCountBadge.textContent = sessions.length;
    renderSessionsList(sessions);

    if (sessions.length > 0) {
      const targetId = selectId || state.activeSessionId || sessions[0].id;
      await selectSession(targetId);
    } else {
      // Auto-create one if none exist
      await createNewSession("First Chat");
    }
  } catch (err) {
    showToast("Error fetching sessions: " + err.message, "error");
  }
}

function renderSessionsList(sessions) {
  dom.sessionsList.innerHTML = "";
  sessions.forEach(s => {
    const item = document.createElement("div");
    item.className = `session-item ${s.id === state.activeSessionId ? "active" : ""}`;
    item.dataset.id = s.id;

    item.innerHTML = `
      <div class="session-item-content">
        <div class="session-item-title">${escapeHtml(s.title)}</div>
        <div class="session-item-sub">
          <span>${s.message_count} msgs</span>
          <span>&bull;</span>
          <span>${s.total_tokens || 0} tok</span>
        </div>
      </div>
      <button class="btn-delete-session" title="Delete Session" data-id="${s.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    `;

    // Click to select
    item.addEventListener("click", (e) => {
      if (e.target.closest(".btn-delete-session")) return;
      selectSession(s.id);
    });

    // Delete session button
    const delBtn = item.querySelector(".btn-delete-session");
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      confirmDeleteSession(s.id, s.title);
    });

    dom.sessionsList.appendChild(item);
  });
}

async function selectSession(sessionId) {
  try {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (!res.ok) throw new Error("Failed to load session details");
    const session = await res.json();

    state.activeSessionId = session.id;
    state.currentSession = session;

    // Update active highlight in sidebar
    document.querySelectorAll(".session-item").forEach(el => {
      el.classList.toggle("active", el.dataset.id === session.id);
    });

    // Update Top Controls
    dom.sessionTitleInput.value = session.title;
    dom.headerModelPill.textContent = session.model || "gpt-4o-mini";
    if (session.model) dom.selectModel.value = session.model;
    if (session.temperature !== undefined) {
      dom.rangeTemperature.value = session.temperature;
      dom.tempValBadge.textContent = session.temperature.toFixed(1);
    }

    // Update System Prompt
    dom.textareaSysPrompt.value = session.system_prompt || state.config.default_system_prompt;
    syncPresetDropdownWithText(dom.textareaSysPrompt.value);

    // Render Messages & Recalculate Metrics
    renderMessages(session.messages || []);
    updateMetricsBar(session.messages || []);

    // Set last inspected payload to latest assistant message if available
    const lastAssistant = [...(session.messages || [])].reverse().find(m => m.role === "assistant");
    if (lastAssistant && lastAssistant.metrics) {
      // Reconstruct inspection preview if not loaded in memory
      state.lastRawResponse = {
        model: session.model,
        messages_count: session.messages.length,
        usage: {
          prompt_tokens: lastAssistant.metrics.prompt_tokens,
          completion_tokens: lastAssistant.metrics.completion_tokens,
          total_tokens: lastAssistant.metrics.total_tokens
        },
        sample_assistant_content: lastAssistant.content
      };
    }
  } catch (err) {
    showToast("Error selecting session: " + err.message, "error");
  }
}

async function createNewSession(customTitle = null) {
  try {
    const defaultModel = dom.selectModel.value || state.config.default_model;
    const defaultTemp = parseFloat(dom.rangeTemperature.value) || state.config.default_temperature;
    const defaultSys = dom.textareaSysPrompt.value || state.config.default_system_prompt;

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: customTitle || "New Conversation",
        system_prompt: defaultSys,
        model: defaultModel,
        temperature: defaultTemp
      })
    });

    if (!res.ok) throw new Error("Failed to create session");
    const newSession = await res.json();
    showToast("Created new session", "success");
    await loadSessionsList(newSession.id);
  } catch (err) {
    showToast("Error creating session: " + err.message, "error");
  }
}

async function confirmDeleteSession(sessionId, title) {
  if (!confirm(`Delete conversation "${title}"?`)) return;

  try {
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete session");
    showToast("Session deleted", "success");

    if (state.activeSessionId === sessionId) {
      state.activeSessionId = null;
    }
    await loadSessionsList();
  } catch (err) {
    showToast("Error deleting session: " + err.message, "error");
  }
}

async function resetCurrentSession() {
  if (!state.activeSessionId) return;
  if (!confirm("Are you sure you want to clear conversation history for this session? Your system prompt and settings will remain preserved.")) return;

  try {
    const res = await fetch(`/api/sessions/${state.activeSessionId}/reset`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to reset session");
    const data = await res.json();

    state.currentSession = data.session;
    renderMessages([]);
    updateMetricsBar([]);
    showToast("Conversation history reset", "success");
    await loadSessionsList(state.activeSessionId);
  } catch (err) {
    showToast("Error resetting session: " + err.message, "error");
  }
}

// ==============================================================================
// 3. Chat & Message Rendering
// ==============================================================================
function renderMessages(messages) {
  dom.chatMessages.innerHTML = "";

  if (!messages || messages.length === 0) {
    renderEmptyState();
    return;
  }

  messages.forEach((msg, idx) => {
    appendMessageToDOM(msg, false);
  });

  scrollToBottom();
}

function renderEmptyState() {
  const emptyDiv = document.createElement("div");
  emptyDiv.className = "empty-state";
  emptyDiv.innerHTML = `
    <div class="empty-icon">💡</div>
    <h3>LLM Playground Ready</h3>
    <p>
      Send a message to see direct, transparent interaction with the model.
      Your conversation history, system prompt, and hyperparameter configuration are sent on every turn.
    </p>
    <div class="prompt-suggestions">
      <div class="suggestion-card" data-prompt="Explain how LLM temperature works mathematically and intuitively.">
        <span>"Explain how LLM temperature works"</span>
        <span>&rarr;</span>
      </div>
      <div class="suggestion-card" data-prompt="Write a Python script demonstrating a clean binary search algorithm with edge cases.">
        <span>"Write a Python binary search script"</span>
        <span>&rarr;</span>
      </div>
      <div class="suggestion-card" data-prompt="Why is multi-turn conversation memory not stored inside model weights?">
        <span>"Why isn't memory stored in model weights?"</span>
        <span>&rarr;</span>
      </div>
    </div>
  `;

  // Attach quick prompt suggestion click handlers
  emptyDiv.querySelectorAll(".suggestion-card").forEach(card => {
    card.addEventListener("click", () => {
      dom.userInput.value = card.dataset.prompt;
      handleSendMessage();
    });
  });

  dom.chatMessages.appendChild(emptyDiv);
}

function appendMessageToDOM(msg, shouldScroll = true) {
  // If empty state exists, clear it
  const emptyState = dom.chatMessages.querySelector(".empty-state");
  if (emptyState) emptyState.remove();

  const isUser = msg.role === "user";
  const row = document.createElement("div");
  row.className = `message-row ${isUser ? "user" : "assistant"}`;

  const header = document.createElement("div");
  header.className = "message-header";
  header.innerHTML = `
    <span>${isUser ? "👤 You" : "🤖 Assistant"}</span>
    <span>&bull;</span>
    <span>${formatTime(msg.timestamp)}</span>
  `;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.innerHTML = isUser ? escapeHtml(msg.content) : formatMarkdown(msg.content);

  row.appendChild(header);
  row.appendChild(bubble);

  // If assistant message has metrics (latency, tokens, cost), display telemetry badge!
  if (!isUser && msg.metrics) {
    const telemetry = document.createElement("div");
    telemetry.className = "message-telemetry";
    
    const lat = msg.metrics.latency_ms ? `${msg.metrics.latency_ms} ms` : "--";
    const tok = msg.metrics.total_tokens !== undefined ? `${msg.metrics.total_tokens} tokens (${msg.metrics.prompt_tokens} in / ${msg.metrics.completion_tokens} out)` : "--";
    const cost = msg.metrics.estimated_cost !== undefined ? `$${msg.metrics.estimated_cost.toFixed(6)}` : "--";

    telemetry.innerHTML = `
      <span class="telemetry-pill latency" title="Response Latency">⚡ ${lat}</span>
      <span class="telemetry-pill tokens" title="Prompt & Completion Tokens">🪙 ${tok}</span>
      <span class="telemetry-pill cost" title="Estimated API Cost">💰 ${cost}</span>
      <button class="btn-inspect-turn" title="Inspect this turn's raw payload">[Inspect]</button>
    `;

    telemetry.querySelector(".btn-inspect-turn").addEventListener("click", () => {
      openInspectorModal();
    });

    row.appendChild(telemetry);
  }

  dom.chatMessages.appendChild(row);

  if (shouldScroll) {
    scrollToBottom();
  }
}

function showTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "message-row assistant typing-row";
  indicator.id = "typing-indicator-row";
  indicator.innerHTML = `
    <div class="message-header"><span>🤖 Assistant</span><span>&bull;</span><span>thinking...</span></div>
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  dom.chatMessages.appendChild(indicator);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById("typing-indicator-row");
  if (el) el.remove();
}

function scrollToBottom() {
  dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
}

// ==============================================================================
// 4. Send Message Interaction (Multi-turn Context Accumulator)
// ==============================================================================
async function handleSendMessage() {
  if (state.isLoading) return;
  const text = dom.userInput.value.trim();
  if (!text) return;

  if (!state.activeSessionId) {
    showToast("No active session. Please create one.", "error");
    return;
  }

  // Clear input field and reset height
  dom.userInput.value = "";
  dom.userInput.style.height = "auto";
  dom.charCount.textContent = "0 chars";

  // Optimistically append user message to UI
  const userMsg = {
    role: "user",
    content: text,
    timestamp: new Date().toISOString()
  };
  appendMessageToDOM(userMsg);

  // Set loading state
  state.isLoading = true;
  dom.btnSend.disabled = true;
  dom.btnSend.classList.add("loading");
  showTypingIndicator();

  // Prepare parameters
  const currentModel = dom.selectModel.value;
  const currentTemp = parseFloat(dom.rangeTemperature.value);
  const currentSysPrompt = dom.textareaSysPrompt.value;

  const payload = {
    session_id: state.activeSessionId,
    message: text,
    system_prompt: currentSysPrompt,
    model: currentModel,
    temperature: currentTemp,
    api_key_override: state.apiOverrides.apiKey || null,
    base_url_override: state.apiOverrides.baseUrl || null
  };

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    removeTypingIndicator();

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errDetail = errData.detail || `Server returned HTTP ${res.status}`;
      throw new Error(errDetail);
    }

    const data = await res.json();

    // Cache Raw Inspector Telemetry
    state.lastRawRequest = data.raw_request;
    state.lastRawResponse = data.raw_response;

    // Append Assistant response to UI
    appendMessageToDOM(data.message);

    // Refresh active session and metrics
    await selectSession(state.activeSessionId);
    await loadSessionsList(state.activeSessionId);

  } catch (err) {
    removeTypingIndicator();
    console.error("Chat error:", err);

    // Graceful error display in chat and toast
    showToast(err.message, "error");

    const errorBubble = {
      role: "assistant",
      content: `⚠️ **API Interaction Error**\n\n${err.message}\n\n*Tip: If you haven't added your API Key yet, click the ⚙️ Settings button in the sidebar or edit your \`.env\` file.*`,
      timestamp: new Date().toISOString()
    };
    appendMessageToDOM(errorBubble);

  } finally {
    state.isLoading = false;
    dom.btnSend.disabled = false;
    dom.btnSend.classList.remove("loading");
    dom.userInput.focus();
  }
}

// ==============================================================================
// 5. Metrics & Calculation
// ==============================================================================
function updateMetricsBar(messages) {
  let totalLatency = 0;
  let totalTokens = 0;
  let totalCost = 0.0;
  let assistantTurns = 0;

  messages.forEach(m => {
    if (m.role === "assistant" && m.metrics) {
      assistantTurns++;
      totalLatency += m.metrics.latency_ms || 0;
      totalTokens += m.metrics.total_tokens || 0;
      totalCost += m.metrics.estimated_cost || 0.0;
    }
  });

  const avgLatency = assistantTurns > 0 ? Math.round(totalLatency / assistantTurns) : 0;
  dom.metricLatency.textContent = `${avgLatency} ms`;
  dom.metricTokens.textContent = totalTokens.toLocaleString();
  dom.metricCost.textContent = `$${totalCost.toFixed(6)}`;
  dom.metricTurns.textContent = messages.length;
}

// ==============================================================================
// 6. Event Handlers & User Controls
// ==============================================================================
function setupEventListeners() {
  // Mobile sidebar toggle
  dom.btnToggleSidebar.addEventListener("click", () => {
    dom.sidebar.classList.toggle("open");
  });

  // Create new session
  dom.btnNewSession.addEventListener("click", () => {
    createNewSession();
  });

  // Reset conversation
  dom.btnResetSession.addEventListener("click", () => {
    resetCurrentSession();
  });

  // Toggle System Prompt Drawer
  dom.btnToggleSysPrompt.addEventListener("click", () => {
    dom.sysPromptPanel.classList.toggle("collapsed");
  });

  // System Prompt Presets Dropdown
  dom.selectPreset.addEventListener("change", (e) => {
    const selectedId = e.target.value;
    if (selectedId === "custom") return;

    const preset = state.config.system_prompts.find(p => p.id === selectedId);
    if (preset) {
      dom.textareaSysPrompt.value = preset.prompt;
      dom.sysPromptStatus.textContent = "Unsaved changes";
    }
  });

  // Save System Prompt changes
  dom.btnSaveSysPrompt.addEventListener("click", async () => {
    if (!state.activeSessionId) return;
    const newSys = dom.textareaSysPrompt.value.trim();

    try {
      const res = await fetch(`/api/sessions/${state.activeSessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: newSys })
      });
      if (!res.ok) throw new Error("Failed to update system prompt");
      dom.sysPromptStatus.textContent = "Saved to session";
      showToast("System prompt updated for this session", "success");
    } catch (err) {
      showToast("Error updating system prompt: " + err.message, "error");
    }
  });

  // Model Selection Dropdown Change
  dom.selectModel.addEventListener("change", async (e) => {
    const newModel = e.target.value;
    dom.headerModelPill.textContent = newModel;
    if (state.activeSessionId) {
      await fetch(`/api/sessions/${state.activeSessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: newModel })
      });
    }
  });

  // Temperature Slider Change
  dom.rangeTemperature.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value).toFixed(1);
    dom.tempValBadge.textContent = val;
  });

  dom.rangeTemperature.addEventListener("change", async (e) => {
    const val = parseFloat(e.target.value);
    if (state.activeSessionId) {
      await fetch(`/api/sessions/${state.activeSessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperature: val })
      });
    }
  });

  // Editable Session Title
  dom.sessionTitleInput.addEventListener("change", async (e) => {
    if (!state.activeSessionId) return;
    const newTitle = e.target.value.trim() || "Untitled Chat";
    try {
      await fetch(`/api/sessions/${state.activeSessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      await loadSessionsList(state.activeSessionId);
    } catch (err) {
      showToast("Error renaming session: " + err.message, "error");
    }
  });

  // Chat Textarea Auto-resize & Keybindings
  dom.userInput.addEventListener("input", () => {
    dom.userInput.style.height = "auto";
    dom.userInput.style.height = Math.min(dom.userInput.scrollHeight, 160) + "px";
    dom.charCount.textContent = `${dom.userInput.value.length} chars`;
  });

  dom.userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Chat Form Submit
  dom.chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleSendMessage();
  });

  // Raw Inspector Modal Open / Close
  dom.btnInspectRaw.addEventListener("click", openInspectorModal);
  dom.btnCloseInspector.addEventListener("click", closeInspectorModal);

  dom.tabReqBtn.addEventListener("click", () => {
    dom.tabReqBtn.classList.add("active");
    dom.tabResBtn.classList.remove("active");
    dom.inspectorCodeLabel.textContent = "JSON (HTTP Request Payload)";
    renderInspectorContent("request");
  });

  dom.tabResBtn.addEventListener("click", () => {
    dom.tabResBtn.classList.add("active");
    dom.tabReqBtn.classList.remove("active");
    dom.inspectorCodeLabel.textContent = "JSON (HTTP Response Body)";
    renderInspectorContent("response");
  });

  dom.btnCopyInspector.addEventListener("click", () => {
    const code = dom.inspectorCodeBlock.textContent;
    navigator.clipboard.writeText(code).then(() => {
      showToast("Copied JSON payload to clipboard", "success");
    });
  });

  // Settings Modal Open / Close
  dom.btnOpenSettings.addEventListener("click", openSettingsModal);
  dom.btnCloseSettings.addEventListener("click", closeSettingsModal);
  dom.btnCancelSettings.addEventListener("click", closeSettingsModal);
  dom.btnSaveSettings.addEventListener("click", saveSettingsOverrides);

  // Close modals clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === dom.modalInspector) closeInspectorModal();
    if (e.target === dom.modalSettings) closeSettingsModal();
  });
}

function syncPresetDropdownWithText(text) {
  if (!state.config) return;
  const match = state.config.system_prompts.find(p => p.prompt.trim() === text.trim());
  if (match) {
    dom.selectPreset.value = match.id;
  } else {
    dom.selectPreset.value = "custom";
  }
}

// ==============================================================================
// 7. Modals & Overrides (Settings & Raw Inspector)
// ==============================================================================
function openInspectorModal() {
  dom.modalInspector.classList.add("open");
  dom.tabReqBtn.classList.add("active");
  dom.tabResBtn.classList.remove("active");
  dom.inspectorCodeLabel.textContent = "JSON (HTTP Request Payload)";
  renderInspectorContent("request");
}

function closeInspectorModal() {
  dom.modalInspector.classList.remove("open");
}

function renderInspectorContent(type) {
  let content = null;
  if (type === "request") {
    content = state.lastRawRequest || {
      note: "No request sent yet in this session.",
      expected_format: {
        model: dom.selectModel.value,
        temperature: parseFloat(dom.rangeTemperature.value),
        messages: [
          { role: "system", content: dom.textareaSysPrompt.value },
          { role: "user", content: "..." }
        ]
      }
    };
  } else {
    content = state.lastRawResponse || {
      note: "No response received yet in this session.",
      expected_format: {
        id: "chatcmpl-sample",
        choices: [{ message: { role: "assistant", content: "..." } }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }
    };
  }

  dom.inspectorCodeBlock.textContent = JSON.stringify(content, null, 2);
}

function openSettingsModal() {
  dom.modalSettings.classList.add("open");
  dom.inputBaseUrl.value = state.apiOverrides.baseUrl || (state.config ? state.config.base_url : "");
  dom.inputApiKey.value = state.apiOverrides.apiKey || "";

  if (state.config && state.config.has_api_key) {
    dom.settingsKeyStatus.textContent = `Server .env Key: Configured (${state.config.masked_api_key})`;
  } else {
    dom.settingsKeyStatus.textContent = "Server .env Key: Not configured (You can enter one below)";
  }
}

function closeSettingsModal() {
  dom.modalSettings.classList.remove("open");
}

function saveSettingsOverrides() {
  const newBaseUrl = dom.inputBaseUrl.value.trim();
  const newApiKey = dom.inputApiKey.value.trim();

  state.apiOverrides.baseUrl = newBaseUrl;
  state.apiOverrides.apiKey = newApiKey;

  if (newBaseUrl) {
    localStorage.setItem("llm_base_url_override", newBaseUrl);
  } else {
    localStorage.removeItem("llm_base_url_override");
  }

  if (newApiKey) {
    localStorage.setItem("llm_api_key_override", newApiKey);
  } else {
    localStorage.removeItem("llm_api_key_override");
  }

  updateStatusFooter();
  closeSettingsModal();
  showToast("Settings updated successfully", "success");
}

// ==============================================================================
// 8. Utility Functions
// ==============================================================================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatTime(isoString) {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Lightweight, safe Markdown Formatter for Assistant code blocks, bold, lists
 */
function formatMarkdown(text) {
  if (!text) return "";
  let html = escapeHtml(text);

  // Fenced Code blocks ```language\n code \n```
  html = html.replace(/```([a-zA-Z0-9_\-]+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const l = lang ? lang.trim() : "text";
    return `<pre><div class="code-header"><span class="code-lang">${l}</span></div><code>${code.trim()}</code></pre>`;
  });

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Line breaks to paragraphs
  const paragraphs = html.split(/\n\n+/);
  return paragraphs.map(p => {
    // If it's a pre tag, don't wrap in <p>
    if (p.trim().startsWith("<pre>")) return p;
    return `<p>${p.replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

// Start application when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
