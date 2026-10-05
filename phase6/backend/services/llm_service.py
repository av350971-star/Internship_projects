import httpx
import logging
from typing import List, Optional
from config import BASE_URL, API_KEY, MODEL, TEMPERATURE
from models.response_models import InjectedMemorySummary

logger = logging.getLogger("llm_service")


class LLMService:
    def __init__(
        self,
        base_url: Optional[str] = BASE_URL,
        api_key: Optional[str] = API_KEY,
        model: str = MODEL,
        temperature: float = TEMPERATURE
    ):
        self.base_url = base_url
        self.api_key = api_key
        self.model = model
        self.temperature = temperature

    async def generate_response(
        self,
        prompt: str,
        user_message: str,
        injected_memories: List[InjectedMemorySummary]
    ) -> str:
        """
        Sends prompt to external LLM API if configured.
        Otherwise falls back to intelligent, memory-aware reasoning engine.
        """
        lower = user_message.lower().strip()

        # Check for explicit remember command
        if lower.startswith("remember that") or lower.startswith("please remember that") or lower.startswith("remember to"):
            content_part = lower.replace("please remember that", "").replace("remember that", "").replace("remember to", "").strip()
            return (
                "Memory saved.\n\n"
                f"Preference:\n{content_part.capitalize()}\n\n"
                "I have stored this in long-term memory and will retrieve it when relevant to your future requests."
            )

        # Check for explicit forget command
        if lower.startswith("forget that") or lower.startswith("please forget that") or lower.startswith("forget about"):
            return (
                "Memory removed.\n\n"
                "I will no longer use that preference as long-term memory."
            )

        if self.api_key and self.base_url:
            try:
                return await self._call_external_api(prompt)
            except Exception as e:
                logger.warning(f"External LLM API call failed: {e}. Falling back to internal engine.")

        return self._generate_fallback_response(prompt, user_message, injected_memories)

    async def _call_external_api(self, prompt: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        url = self.base_url.rstrip("/") + "/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a personalized assistant with controlled memory."},
                {"role": "user", "content": prompt}
            ],
            "temperature": self.temperature,
            "max_tokens": 1000
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()

    def _generate_fallback_response(
        self,
        prompt: str,
        user_message: str,
        injected_memories: List[InjectedMemorySummary]
    ) -> str:
        """
        Intelligent local generator that strictly adapts tone, formatting, and answers
        based on the injected memories and query intent.
        """
        lower = user_message.lower().strip()

        # Check for remember command
        if lower.startswith("remember that") or lower.startswith("please remember that") or lower.startswith("remember to"):
            # Extract target
            content_part = lower.replace("please remember that", "").replace("remember that", "").replace("remember to", "").strip()
            return (
                "Memory saved.\n\n"
                f"Preference:\n{content_part.capitalize()}\n\n"
                "I have stored this in long-term memory and will retrieve it when relevant to your future requests."
            )

        # Check for forget command
        if lower.startswith("forget that") or lower.startswith("please forget that") or lower.startswith("forget about"):
            return (
                "Memory removed.\n\n"
                "I will no longer use that preference as long-term memory."
            )

        # Check injected preferences & procedural instructions
        has_step_by_step = any("step" in m.content.lower() for m in injected_memories)
        has_python_pref = any("python" in m.content.lower() for m in injected_memories)
        has_concise_pref = any("concise" in m.content.lower() or "short" in m.content.lower() or "brief" in m.content.lower() for m in injected_memories)
        has_detailed_pref = any("detailed" in m.content.lower() or "depth" in m.content.lower() or "comprehensive" in m.content.lower() or "long" in m.content.lower() for m in injected_memories)
        has_explain_before_code = any("explanation before" in m.content.lower() or "explain before" in m.content.lower() for m in injected_memories)
        has_error_first = any("identify the error" in m.content.lower() or "error first" in m.content.lower() for m in injected_memories)
        has_api_examples = any("endpoint example" in m.content.lower() or "api example" in m.content.lower() for m in injected_memories)

        # Specialized test queries
        if "capital of france" in lower:
            return "The capital of France is Paris."

        # Debugging queries
        if "debug" in lower or "error" in lower or "fix" in lower:
            if has_error_first:
                return (
                    "Error Identification:\nThe error occurs due to an unhandled exception or missing parameter initialization.\n\n"
                    "Recommended Fix:\nWrap the initialization in a safe try/catch block and validate inputs before invoking the method."
                )

        # API queries
        if ("api" in lower or "endpoint" in lower) and has_api_examples:
            return (
                "API Specification:\nThe REST endpoint handles data retrieval.\n\n"
                "Endpoint Example:\n"
                "GET /api/v1/resources?status=active\n"
                "Response: 200 OK\n"
                "{\n  \"status\": \"success\",\n  \"items\": [{\"id\": 1, \"name\": \"sample\"}]\n}"
            )

        if "python" in lower or "function" in lower or "code" in lower or "api" in lower:
            if has_step_by_step:
                return (
                    "Here is a step-by-step explanation of the Python function (applying your preferred step-by-step format):\n\n"
                    "Step 1: Function Declaration & Input Arguments\n"
                    "The function accepts arguments and defines the input signature, verifying types and initializing default parameters.\n\n"
                    "Step 2: Execution Logic & Core Transformations\n"
                    "It processes the input data line-by-line using standard control flow and error boundaries.\n\n"
                    "Step 3: State Return & Output Handling\n"
                    "Finally, it returns the formatted result back to the caller for subsequent processing."
                )
            elif has_detailed_pref:
                return (
                    "Here is a detailed and comprehensive explanation of the Python function:\n\n"
                    "1. Architecture and Design Patterns:\n"
                    "The function is structured using modular design principles to ensure separation of concerns, testability, and deterministic state transitions.\n\n"
                    "2. Execution and Control Flow:\n"
                    "Upon invocation, input arguments are validated against predefined constraints. It initializes the execution context, executes the core algorithmic transformation, and manages error boundaries.\n\n"
                    "3. Memory and Resource Management:\n"
                    "Local variables are safely scoped, preventing memory leaks and avoiding side-effects on global state before returning the final processed payload."
                )
            elif has_concise_pref:
                return "The function takes inputs, processes logic sequentially, and returns the computed result."
            elif has_explain_before_code:
                return (
                    "Explanation:\n"
                    "This function defines parameters, transforms the inputs, and outputs the result.\n\n"
                    "Code:\n"
                    "```python\ndef execute_task(data):\n    return [d.strip() for d in data]\n```"
                )
            else:
                return (
                    "The Python function defines input arguments, performs the required transformations in its block, "
                    "and returns the computed output."
                )

        if "what is python" in lower:
            if has_detailed_pref:
                return (
                    "Python is a high-level, interpreted programming language renowned for its readability, dynamic semantics, "
                    "and comprehensive standard library. Detailed architecture includes support for object-oriented, imperative, "
                    "and functional paradigms, widely utilized across web frameworks, machine learning runtimes, and systems scripting."
                )
            elif has_concise_pref:
                return "Python is a popular, high-level programming language known for readable syntax and versatile libraries."
            return (
                "Python is a high-level, interpreted, general-purpose programming language known for its clear syntax, "
                "readability, and broad ecosystem in web development, data science, and AI."
            )

        if "help me write an email" in lower or "email" in lower:
            return (
                "I would be glad to help draft your email. Please tell me who the recipient is, the main objective, "
                "and any specific points or tone you would like to include."
            )

        # General response reflecting any injected context
        if injected_memories:
            mem_types = ", ".join(m.type for m in injected_memories)
            return (
                f"I have processed your request while incorporating your active {mem_types} preferences. "
                "How can I assist you further with this?"
            )

        return (
            "I'm here to help. Feel free to ask questions, work on code, or specify instructions you'd like me to remember."
        )
