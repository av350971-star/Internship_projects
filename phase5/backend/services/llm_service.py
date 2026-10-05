import re
import time
import httpx
from typing import List, Dict, Any, Optional, Tuple
from backend.config import settings

class LLMService:
    def __init__(self):
        self.base_url = settings.AI_BASE_URL.rstrip("/")
        self.api_key = settings.AI_API_KEY
        self.model = settings.AI_MODEL

    def build_grounded_prompt(self, query: str, context_chunks: List[Dict[str, Any]]) -> Tuple[str, str]:
        """
        Builds strict system and user prompt with numbered chunks for verifiable citation.
        """
        system_prompt = (
            "You are a Cited Knowledge Assistant. Your job is to answer user queries with factual precision "
            "STRICTLY based on the provided document context chunks.\n\n"
            "MANDATORY CITATION RULES:\n"
            "1. Every factual statement, claim, or command MUST be immediately followed by an in-line citation "
            "referencing the chunk number in square brackets, e.g. [1] or [1][2]. You MUST include at least one [1] citation in every valid answer.\n"
            "2. Only reference chunks that actually exist in the context below.\n"
            "3. If the provided chunks do not contain enough facts to answer the question, state: "
            "'The provided documents do not contain sufficient evidence to answer this question.'\n"
            "4. NEVER guess, assume, extrapolate, or use outside knowledge not supported by the cited chunks.\n"
            "5. Keep the response clear, concise, and professional."
        )

        context_blocks = []
        for i, chunk in enumerate(context_chunks, start=1):
            doc_name = chunk.get("doc_filename", "Unknown Document")
            page_num = chunk.get("page_number", 1)
            section = f" | Section: {chunk['section_title']}" if chunk.get("section_title") else ""
            text = chunk.get("text_content", "").strip()
            block = f"[Chunk {i}] (Document: {doc_name}, Page: {page_num}{section})\n{text}"
            context_blocks.append(block)

        context_str = "\n\n".join(context_blocks)

        user_prompt = (
            f"--- BEGIN RETRIEVED CONTEXT ---\n"
            f"{context_str}\n"
            f"--- END RETRIEVED CONTEXT ---\n\n"
            f"USER QUESTION: {query}\n\n"
            f"Remember: Answer ONLY using the facts from the chunks above and append citations like [1] after every claim."
        )

        return system_prompt, user_prompt

    def extract_citations(self, answer_text: str, context_chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extracts citation numbers like [1], [2] from the answer and maps them to chunk metadata.
        """
        # Find all numbers inside brackets: [1], [2], [1, 2], [1][2]
        raw_matches = re.findall(r'\[(\d+)\]', answer_text)
        cited_indices = sorted(list(set(int(idx) for idx in raw_matches)))

        citations = []
        for idx in cited_indices:
            # 1-indexed to 0-indexed
            chunk_idx = idx - 1
            if 0 <= chunk_idx < len(context_chunks):
                chunk = context_chunks[chunk_idx]
                citations.append({
                    "citation_index": idx,
                    "chunk_id": chunk.get("id"),
                    "doc_filename": chunk.get("doc_filename", "Unknown"),
                    "page_number": chunk.get("page_number", 1),
                    "section_title": chunk.get("section_title", ""),
                    "score": chunk.get("refined_score") or chunk.get("score", 0.0),
                    "snippet": chunk.get("text_content", "")[:250] + ("..." if len(chunk.get("text_content", "")) > 250 else "")
                })

        return citations

    async def generate_cited_answer(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Sends grounded prompt to the external OpenAI-compatible LLM endpoint and parses citations.
        """
        system_prompt, user_prompt = self.build_grounded_prompt(query, context_chunks)
        start_time = time.time()

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.0,  # Deterministic factual answering
            "max_tokens": 800
        }

        url = f"{self.base_url}/chat/completions"

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                latency_ms = int((time.time() - start_time) * 1000)

                if resp.status_code != 200:
                    return {
                        "answer": f"Error calling AI Service (HTTP {resp.status_code}): {resp.text}",
                        "is_declined": True,
                        "decline_reason": f"API Error {resp.status_code}",
                        "citations": [],
                        "latency_ms": latency_ms,
                        "tokens": {}
                    }

                data = resp.json()
                answer = data["choices"][0]["message"]["content"].strip()
                tokens = data.get("usage", {})

                # Check if the LLM itself declined because of insufficient info
                decline_phrases = [
                    "do not contain sufficient evidence",
                    "insufficient evidence",
                    "cannot answer based on",
                    "not mentioned in the provided documents",
                    "not provided in the context"
                ]
                is_declined = any(phrase in answer.lower() for phrase in decline_phrases)

                # Extract citations
                citations = self.extract_citations(answer, context_chunks)

                return {
                    "answer": answer,
                    "is_declined": is_declined,
                    "decline_reason": "Model detected insufficient evidence in context" if is_declined else None,
                    "citations": citations,
                    "latency_ms": latency_ms,
                    "tokens": tokens
                }

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            return {
                "answer": f"Connection error to AI service: {str(e)}",
                "is_declined": True,
                "decline_reason": f"Exception: {str(e)}",
                "citations": [],
                "latency_ms": latency_ms,
                "tokens": {}
            }

llm_service = LLMService()
