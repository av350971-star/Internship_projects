"""
LLM Service: Multi-provider interface supporting external OpenAI-compatible AI API
(https://ai-service-by-nik6348.vercel.app/v1) with robust server-side key management
and intelligent fallback synthesis.
"""

import json
import os
import urllib.request
from typing import Dict, List, Optional
from .config import AI_BASE_URL, AI_API_KEY, AI_MODEL

class LLMService:
    def __init__(self):
        self.ai_base_url = AI_BASE_URL
        self.ai_api_key = AI_API_KEY
        self.ai_model = AI_MODEL

    def _call_ai_api(self, prompt: str) -> Optional[str]:
        """
        Calls the external OpenAI-compatible AI service using the server-side API key.
        Endpoint: POST {AI_BASE_URL}/chat/completions
        """
        if not self.ai_api_key:
            return None

        endpoint = f"{self.ai_base_url.rstrip('/')}/chat/completions"
        payload_data = {
            "model": self.ai_model,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        headers = {
            "Authorization": f"Bearer {self.ai_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ContextAwareAssistant/3.0"
        }

        try:
            import requests
            resp = requests.post(endpoint, headers=headers, json=payload_data, timeout=15)
            if resp.status_code == 200:
                resp_data = resp.json()
                content = resp_data["choices"][0]["message"]["content"]
                return content
            else:
                print(f"[LLMService] External AI API returned HTTP {resp.status_code}: {resp.text[:100]}")
                return None
        except Exception as e:
            print(f"[LLMService] External AI API call to {endpoint} failed: {e}")
            return None

    def generate_response(
        self,
        assembled_prompt: str,
        user_role: str,
        retrieved_docs: List[Dict],
        current_query: str,
        prompt_version_id: str
    ) -> Dict:
        """
        Generates the response using:
        1. Configured external OpenAI-compatible AI Service (Server-side key)
        2. Clean Context Synthesizer as a clearly designated offline fallback
        """
        # Attempt external AI API
        ai_response = self._call_ai_api(assembled_prompt)
        if ai_response:
            return {
                "text": ai_response.strip(),
                "model": self.ai_model,
                "provider": "External AI Service (OpenAI-compatible)"
            }

        # Designated offline fallback when external AI key is absent or offline
        fallback_text = self._fallback_synthesizer(
            user_role=user_role,
            retrieved_docs=retrieved_docs,
            current_query=current_query,
            prompt_version_id=prompt_version_id
        )

        return {
            "text": fallback_text,
            "model": "Fallback Context Synthesizer",
            "provider": "Local Fallback Engine"
        }

    def generate_summary(self, older_messages: List[Dict]) -> str:
        """
        Generates a compact, entity-preserving factual conversation summary using AI.
        Preserves order IDs, refund IDs, dates, product names, issue types, and requested actions.
        """
        if not older_messages:
            return ""

        formatted_dialogue = []
        for m in older_messages:
            speaker = "Customer" if m.get("role") == "user" else "Assistant"
            formatted_dialogue.append(f"{speaker}: {m.get('content', '').strip()}")

        prompt = (
            "You are a factual conversation summarizer for a support assistant.\n"
            "Summarize the following previous dialogue turns into a concise bullet-point summary.\n"
            "CRITICAL: You MUST preserve all key entities such as order IDs, refund IDs, dates, product names, issue types, and user requests.\n"
            "Do NOT include pleasantries. Output ONLY the summary points.\n\n"
            "Conversation to summarize:\n" + "\n".join(formatted_dialogue)
        )

        # Try LLM summarization first
        llm_summary = self._call_ai_api(prompt)
        if llm_summary:
            return llm_summary.strip()

        # Factual fallback extraction if LLM is offline
        summary_points = []
        user_queries = [m["content"].replace("\n", " ").strip() for m in older_messages if m.get("role") == "user"]
        for q in user_queries[-3:]:
            if len(q) > 90:
                q = q[:87] + "..."
            summary_points.append(f"• User inquired: '{q}'")

        return "Earlier context summary:\n" + "\n".join(summary_points)

    def _fallback_synthesizer(
        self,
        user_role: str,
        retrieved_docs: List[Dict],
        current_query: str,
        prompt_version_id: str
    ) -> str:
        """
        Grounded, role-safe fallback synthesizer used when external LLM is offline or no key is provided.
        """
        query_lower = current_query.lower()

        # Role security: Customer asking for internal codes or SOPs
        is_restricted_probe = any(k in query_lower for k in [
            "override", "sop-", "auth-", "hotline", "internal code", "discretionary credit"
        ])
        if user_role == "customer" and is_restricted_probe:
            if "v2.0" in prompt_version_id:
                return "• Internal operational codes and employee SOPs are strictly confidential.\n• For order questions, please contact standard customer support."
            return (
                "I apologize, but internal authorization codes, staff operational SOPs, and employee runbooks "
                "are strictly restricted to authorized internal personnel and are not accessible to customer accounts.\n\n"
                "If you are experiencing an issue with your order or refund, I would be glad to guide you through our standard return and refund policies."
            )

        # Support Agent asking about Override Code / Discretionary refund
        if user_role == "support_agent" and any(k in query_lower for k in ["override", "discretionary", "auth", "delay", "sop-801"]):
            if "v2.0" in prompt_version_id:
                return (
                    "**ACTION CODE: [AUTH-OVERRIDE-88]**\n"
                    "1. Confirm shipment delay exceeds 10 business days.\n"
                    "2. Apply code in Admin CRM portal for credits up to $100.\n"
                    "3. For amounts >$100, escalate to Team Lead using [TL-AUTH-449]."
                )
            return (
                "**Internal Triage Guidance (SOP-801: Discretionary Credits):**\n\n"
                "• **Prerequisite Verification:** Verify in CRM that courier transit delay has exceeded 10 business days or item is confirmed severely damaged.\n"
                "• **Override Authorization Code:** **`AUTH-OVERRIDE-88`** (Permits direct agent issuance up to $100 without manager sign-off).\n"
                "• **Threshold Escalation:** For amounts exceeding $100, submit a request via Team Lead Queue using authorization code `TL-AUTH-449`.\n"
                "• **Note:** Strictly log the courier consignment number and reason code in CRM."
            )

        # Grounding on retrieved documents if available
        if retrieved_docs:
            top_doc = retrieved_docs[0]
            title = top_doc.get("title", "")
            content = top_doc.get("content", "")

            if "v2.0" in prompt_version_id and user_role == "customer":
                return (
                    f"Based on our policy ({title}):\n"
                    f"• {content.split('.')[0]}.\n"
                    f"• {content.split('.')[1] if len(content.split('.')) > 1 else 'Submit details in Help Center.'}\n"
                    f"• Track your status directly in 'My Orders'."
                )

            return (
                f"Hello! Thank you for reaching out to ShopNexus Support.\n\n"
                f"According to our **{title}**:\n\n"
                f"{content}\n\n"
                f"Please let me know if you need any further assistance!"
            )

        return (
            f"Thank you for reaching out. Based on your role as **{user_role.capitalize()}**, "
            f"I have reviewed your query regarding: '{current_query}'. "
            "Please refer to the verified support documentation or provide your order details so I can assist you further."
        )

# Global singleton
llm_service = LLMService()
