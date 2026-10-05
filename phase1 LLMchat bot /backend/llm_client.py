import time
import asyncio
import httpx
from typing import Dict, List, Any, Optional
from backend import config

_client_pool: Optional[httpx.AsyncClient] = None

def get_http_client() -> httpx.AsyncClient:
    """Reusable persistent connection pool to eliminate TCP/TLS handshake latency."""
    global _client_pool
    if _client_pool is None or _client_pool.is_closed:
        _client_pool = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=8.0, read=45.0, write=10.0, pool=10.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20, keepalive_expiry=60.0)
        )
    return _client_pool

def estimate_tokens(text: str) -> int:
    """Fallback token estimation: ~4 chars per token if API doesn't return usage."""
    if not text:
        return 0
    return max(1, len(text) // 4)

async def call_llm(
    messages: List[Dict[str, str]],
    model: str,
    temperature: float,
    api_key: str = None,
    base_url: str = None
) -> Dict[str, Any]:
    """
    Exposes direct, transparent LLM API interaction without heavy frameworks.
    Constructs raw HTTP payload, measures latency, extracts token usage,
    and returns both the response and raw debugging telemetry.
    """
    effective_api_key = (api_key or config.LLM_API_KEY).strip()
    effective_base_url = (base_url or config.LLM_BASE_URL).strip().rstrip("/")

    # Check for unconfigured API key
    if not effective_api_key or effective_api_key.strip() in ["your_api_key_here", ""]:
        raise ValueError(
            "API Key is missing or not configured. "
            "Please open your .env file or top configuration bar and add your LLM API Key."
        )

    endpoint = f"{effective_base_url}/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {effective_api_key.strip()}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": float(temperature)
    }

    # Prepare sanitized request inspection payload (hide secret key)
    sanitized_headers = headers.copy()
    sanitized_headers["Authorization"] = "Bearer " + ("*" * 8) + effective_api_key[-4:] if len(effective_api_key) > 4 else "Bearer ****"
    raw_request_info = {
        "endpoint": endpoint,
        "headers": sanitized_headers,
        "payload": payload
    }

    start_time = time.perf_counter()
    response = None
    last_exception = None

    # Automatic 1-time retry for transient network hiccups
    for attempt in range(2):
        try:
            client = get_http_client()
            response = await client.post(endpoint, headers=headers, json=payload, timeout=60.0)
            break
        except (httpx.ConnectTimeout, httpx.ReadTimeout) as e:
            last_exception = TimeoutError(f"Connection to provider timed out. (Attempt {attempt + 1}/2)")
        except (httpx.ConnectError, httpx.RemoteProtocolError) as e:
            last_exception = ConnectionError(f"Could not connect to LLM Base URL '{effective_base_url}'. (Attempt {attempt + 1}/2)")
        except Exception as e:
            last_exception = RuntimeError(f"Network error: {str(e)}")

        if attempt == 0:
            await asyncio.sleep(0.5)

    if response is None:
        raise last_exception or RuntimeError("Could not establish stable connection with LLM provider.")

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    # Resilience: If provider returns 400 and messages had 'system' role, fallback to merging into user prompt
    if response.status_code == 400 and any(m.get("role") == "system" for m in messages):
        sys_msg = next((m.get("content", "") for m in messages if m.get("role") == "system"), "")
        fallback_messages = []
        user_injected = False
        for m in messages:
            if m.get("role") == "system":
                continue
            if m.get("role") == "user" and not user_injected:
                fallback_messages.append({
                    "role": "user",
                    "content": f"[System Instructions: {sys_msg}]\n\n{m.get('content', '')}"
                })
                user_injected = True
            else:
                fallback_messages.append(m)

        try:
            client = get_http_client()
            retry_res = await client.post(endpoint, headers=headers, json={"model": model, "messages": fallback_messages, "temperature": float(temperature)}, timeout=60.0)
            if retry_res.status_code == 200:
                response = retry_res
        except Exception:
            pass

    # Handle HTTP error statuses gracefully
    if response.status_code != 200:
        error_detail = ""
        try:
            err_json = response.json()
            error_detail = err_json.get("error", {}).get("message") or str(err_json)
        except Exception:
            error_detail = response.text or f"HTTP {response.status_code}"

        if response.status_code == 401:
            raise PermissionError(f"Authentication Failed (401): Invalid API Key. Provider response: {error_detail}")
        elif response.status_code == 404:
            raise LookupError(f"Model or Endpoint Not Found (404): Check if model '{model}' exists at '{effective_base_url}'. Detail: {error_detail}")
        elif response.status_code == 429:
            raise ResourceWarning(f"Rate Limit or Quota Exceeded (429): {error_detail}")
        else:
            raise RuntimeError(f"Provider returned error HTTP {response.status_code}: {error_detail}")

    try:
        response_json = response.json()
    except Exception:
        raise ValueError(f"Provider returned invalid non-JSON response: {response.text[:200]}")

    choices = response_json.get("choices", [])
    if not choices:
        raise ValueError("LLM returned an empty response with no choices.")

    assistant_message = choices[0].get("message", {}).get("content", "")

    # Token extraction and cost calculation
    usage = response_json.get("usage", {})
    prompt_tokens = usage.get("prompt_tokens")
    completion_tokens = usage.get("completion_tokens")
    total_tokens = usage.get("total_tokens")

    # Fallback if provider didn't return usage
    if prompt_tokens is None or completion_tokens is None:
        prompt_text = "".join(m.get("content", "") for m in messages)
        prompt_tokens = estimate_tokens(prompt_text)
        completion_tokens = estimate_tokens(assistant_message)
        total_tokens = prompt_tokens + completion_tokens
        token_source = "estimated"
    else:
        token_source = "provider_exact"

    estimated_cost = config.calculate_cost(model, prompt_tokens, completion_tokens)

    return {
        "content": assistant_message,
        "metrics": {
            "latency_ms": latency_ms,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "token_source": token_source,
            "estimated_cost": estimated_cost
        },
        "raw_request": raw_request_info,
        "raw_response": response_json
    }
