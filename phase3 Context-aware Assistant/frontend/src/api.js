/**
 * API client to communicate with the FastAPI backend.
 * Kept simple and direct so any BCA student can understand every line.
 */

const BASE_URL = ''; // Relative path, proxied by Vite or served directly by FastAPI

/**
 * Sends a chat message to the backend.
 * @param {Object} params
 * @param {string} params.message - User message text
 * @param {string} params.role - "customer" or "support_agent"
 * @param {string} params.sessionId - Current session ID
 * @param {number} [params.contextBudget=1200]
 * @param {number} [params.summarizeThreshold=4]
 * @returns {Promise<Object>} Backend response with answer and debug_view
 */
export async function sendChatMessage({
  message,
  role = 'customer',
  sessionId = null,
  contextBudget = 1200,
  summarizeThreshold = 4,
}) {
  const payload = {
    message,
    role,
    session_id: sessionId,
    context_budget: contextBudget,
    summarize_threshold: summarizeThreshold,
  };

  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Resets the conversation session in the backend.
 * @param {string} sessionId
 */
export async function resetChatSession(sessionId) {
  if (!sessionId) return;
  try {
    await fetch(`${BASE_URL}/api/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch (err) {
    console.error('Failed to reset session on server:', err);
  }
}
