import re
from typing import Optional, Tuple
from models.memory_models import MemoryCreate
from models.response_models import MemoryDecisionSummary
from services.memory_manager import MemoryManager


class MemoryExtractor:
    def __init__(self, memory_manager: MemoryManager):
        self.memory_manager = memory_manager

    def detect_explicit_command(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Detects if the message contains an explicit directive to remember or forget.
        Returns (command_type, target_text) where command_type is 'remember' or 'forget'.
        """
        lower = text.strip().lower()

        # Forget patterns
        forget_patterns = [
            r'^(?:please\s+)?forget\s+that\s+(.*)',
            r'^(?:please\s+)?forget\s+about\s+(.*)',
            r'^(?:please\s+)?forget\s+(?:this\s+)?(.*)',
            r'^stop\s+remembering\s+(?:that\s+)?(.*)',
            r'^delete\s+memory\s+(?:about\s+)?(.*)',
            r'^remove\s+memory\s+(?:about\s+)?(.*)'
        ]
        for pat in forget_patterns:
            match = re.match(pat, lower)
            if match:
                target = match.group(1).strip(".! ")
                return "forget", target

        # Remember patterns (Explicit level A)
        remember_patterns = [
            r'^(?:please\s+)?remember\s+that\s+(.*)',
            r'^(?:please\s+)?remember\s+this[:\s]+(.*)',
            r'^(?:please\s+)?remember\s+to\s+(.*)',
            r'^(?:please\s+)?remember\s+(.*)',
            r'^(?:please\s+)?save\s+this[:\s]+(.*)',
            r'^(?:please\s+)?keep\s+this\s+in\s+mind[:\s]+(.*)',
            r'^(?:please\s+)?(?:don\'t|dont)\s+forget\s+(?:this[:\s]+)?(.*)',
            r'^from\s+now\s+on[,\s]+(?:always\s+)?(.*)',
            r'^always\s+do\s+this[:\s]+(.*)',
            r'^(?:always\s+)(.*)',
            r'^my\s+preference\s+is\s+(.*)',
        ]
        for pat in remember_patterns:
            match = re.match(pat, lower)
            if match:
                target = match.group(1).strip(".! ")
                return "remember", target

        return None, None

    def handle_explicit_forget(
        self,
        query: str,
        user_id: str,
        session_id: Optional[str] = None
    ) -> MemoryDecisionSummary:
        """
        Finds the most relevant active memory to forget and soft deletes it.
        """
        active_memories = self.memory_manager.list_memories(user_id=user_id, status="active")
        if not active_memories:
            return MemoryDecisionSummary(
                action="IGNORE",
                reason="No active memories found to delete"
            )

        # Tokenize query target
        target_words = set(re.findall(r'\b\w+\b', query.lower()))
        stop_words = {"i", "my", "that", "the", "a", "an", "prefer", "like"}
        content_words = target_words - stop_words

        best_match = None
        best_score = 0.0

        for mem in active_memories:
            mem_words = set(re.findall(r'\b\w+\b', mem.content.lower()))
            if not mem_words:
                continue
            overlap = len(content_words.intersection(mem_words))
            if overlap > best_score:
                best_score = overlap
                best_match = mem

        if best_match and best_score > 0:
            self.memory_manager.delete_memory(
                memory_id=best_match.id,
                user_id=user_id,
                session_id=session_id,
                soft=True
            )
            return MemoryDecisionSummary(
                action="DELETE",
                memory_id=best_match.id,
                memory_type=best_match.memory_type,
                content=best_match.content,
                reason="User explicitly requested to forget this preference"
            )

        return MemoryDecisionSummary(
            action="IGNORE",
            reason=f"No matching memory found for query: '{query}'"
        )

    def evaluate_and_extract(
        self,
        user_message: str,
        user_id: str,
        session_id: Optional[str] = None
    ) -> MemoryDecisionSummary:
        """
        Post-conversation memory decision pipeline:
        - Detect explicit 'remember' or 'forget'
        - Inferred memory extraction for persistent facts/preferences
        - IGNORE for standard queries or ephemeral state
        """
        cmd_type, target = self.detect_explicit_command(user_message)

        # 1. Handle Explicit Forget
        if cmd_type == "forget" and target:
            return self.handle_explicit_forget(target, user_id, session_id)

        # 2. Handle Explicit Remember
        if cmd_type == "remember" and target:
            clean_content = self._format_explicit_content(target)
            mem_type = self._classify_memory_type(clean_content)

            # Check for deduplication
            dup = self.memory_manager.find_duplicate(user_id, mem_type, clean_content)
            if dup:
                existing_mem, _ = dup
                updated = self.memory_manager.create_memory(
                    data=MemoryCreate(
                        memory_type=mem_type,
                        content=clean_content,
                        source="user_explicit",
                        confidence=0.98,
                        importance=0.85
                    ),
                    user_id=user_id,
                    session_id=session_id,
                    deduplicate=True
                )
                return MemoryDecisionSummary(
                    action="UPDATE",
                    memory_id=updated.id,
                    memory_type=updated.memory_type,
                    content=updated.content,
                    confidence=updated.confidence,
                    reason="Updated existing matching memory with explicit preference"
                )

            # Create new explicit memory
            created = self.memory_manager.create_memory(
                data=MemoryCreate(
                    memory_type=mem_type,
                    content=clean_content,
                    source="user_explicit",
                    confidence=0.98,
                    importance=0.85
                ),
                user_id=user_id,
                session_id=session_id,
                deduplicate=False
            )
            return MemoryDecisionSummary(
                action="CREATE",
                memory_id=created.id,
                memory_type=created.memory_type,
                content=created.content,
                confidence=created.confidence,
                reason="Explicit user command ('remember that...')"
            )

        # 3. Detect Inferred Facts / Stable Preferences (Strictly Filter Transient Context)
        lower = user_message.lower()

        # Reject transient phrases (Phase 3 requirement: do NOT store temporary statements)
        transient_markers = [
            "today", "now", "currently", "at the moment", "testing this", "trying to",
            "just testing", "this session", "temporary", "right now", "for now"
        ]
        is_transient = any(re.search(rf'\b{re.escape(marker)}\b', lower) for marker in transient_markers)
        if is_transient:
            return MemoryDecisionSummary(
                action="IGNORE",
                reason="Transient statement (e.g. 'today', 'testing', 'currently') filtered from long-term memory"
            )

        if any(p in lower for p in ["i am learning ", "i'm learning ", "i am studying ", "i work on ", "i work as ", "i am a "]):
            # Semantic memory candidate
            fact_content = self._extract_fact(user_message)
            if fact_content:
                mem = self.memory_manager.create_memory(
                    data=MemoryCreate(
                        memory_type="semantic",
                        content=fact_content,
                        source="inferred",
                        confidence=0.80,
                        importance=0.70
                    ),
                    user_id=user_id,
                    session_id=session_id,
                    deduplicate=True
                )
                return MemoryDecisionSummary(
                    action="CREATE",
                    memory_id=mem.id,
                    memory_type="semantic",
                    content=mem.content,
                    confidence=0.80,
                    reason="Inferred user background/fact from conversation"
                )

        # 4. Standard Queries -> IGNORE (Do NOT store regular conversation)
        return MemoryDecisionSummary(
            action="IGNORE",
            reason="Normal conversational query; no durable long-term memory criteria met"
        )

    def _format_explicit_content(self, text: str) -> str:
        # Standardize "i prefer..." into "User prefers..."
        formatted = text.strip()
        formatted = re.sub(r'\bi\s+prefer\b', 'User prefers', formatted, flags=re.IGNORECASE)
        formatted = re.sub(r'\bi\s+like\b', 'User prefers', formatted, flags=re.IGNORECASE)
        formatted = re.sub(r'\bmy\s+preference\s+is\b', 'User prefers', formatted, flags=re.IGNORECASE)
        if not formatted.lower().startswith("user"):
            formatted = f"User prefers {formatted}"
        return formatted[0].upper() + formatted[1:]

    def _classify_memory_type(self, content: str) -> str:
        lower = content.lower()
        # If explicit preference phrasing is used
        if any(w in lower for w in ["prefer", "likes", "dislikes", "my preference"]):
            if not any(k in lower for k in ["when giving code", "for project debugging", "when generating apis", "procedure for", "assistant instruction"]):
                return "preference"

        # Procedural: HOW tasks should be performed (instructions, workflows, coding/debugging guidelines)
        procedural_cues = [
            "step-by-step", "step by step", "format code", "code format",
            "explain before", "explanation before", "explain code", "first identify",
            "endpoint examples", "debugging", "procedure", "how the assistant",
            "workflow", "systematically", "numbered steps", "instructions for",
            "when giving code", "when generating", "for debugging"
        ]
        if any(w in lower for w in procedural_cues):
            return "procedural"

        # General preference cues
        preference_cues = [
            "concise", "detailed", "dark mode", "light mode", "short responses", "brief", "verbose", "tone", "style"
        ]
        if any(w in lower for w in preference_cues):
            return "preference"

        # Episodic: Specific past events, projects, bugs, sessions
        episodic_cues = [
            "worked on", "completed", "previously", "yesterday", "last week",
            "built", "finished", "discussed a bug", "prior project", "earlier session"
        ]
        if any(w in lower for w in episodic_cues):
            return "episodic"

        return "semantic"

    def _extract_fact(self, text: str) -> Optional[str]:
        lower = text.lower()
        if "learning python" in lower or "studying python" in lower:
            return "User is learning Python"
        if "software developer" in lower or "software engineer" in lower:
            return "User works as a software developer"

        # Student / profession detection (e.g. "I am student of BCA 2nd year")
        student_match = re.search(r'\b(?:i am|i\'m)\s+(?:a\s+)?(student of [^.,!]+)', text, re.IGNORECASE)
        if student_match:
            cand = student_match.group(1).strip()
            return f"User is a {cand}"

        # Name detection (e.g. "I am ankit varma", "my name is ankit")
        name_match = re.search(r'\b(?:my name is|i am|i\'m)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b', text, re.IGNORECASE)
        if name_match:
            cand = name_match.group(1).strip()
            skip_words = {"learning", "building", "working", "trying", "testing", "student", "a", "an", "here", "ready", "just", "doing", "fine", "good", "user"}
            first_word = cand.lower().split()[0]
            if first_word not in skip_words and len(cand) >= 2:
                return f"User's name is {cand.title()}"

        # General pattern
        m = re.search(r'\b(?:i am|i\'m)\s+(learning|building|working on)\s+(.*)', text, re.IGNORECASE)
        if m:
            verb, rest = m.groups()
            clean_rest = rest.strip(".! ")
            return f"User is {verb} {clean_rest}"
        return None
