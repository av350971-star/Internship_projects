import re
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi

class BM25Retriever:
    STOP_WORDS = {
        "what", "is", "the", "how", "many", "of", "and", "are", "in", "for", 
        "to", "a", "an", "do", "does", "did", "can", "could", "would", "should",
        "on", "at", "by", "with", "from", "about", "which", "who", "whom", "this",
        "that", "these", "those", "our", "my", "your", "their", "its", "if", "or"
    }

    @classmethod
    def tokenize(cls, text: str) -> List[str]:
        """
        Tokenizes text into words and alphanumeric tokens, filtering common stopwords
        while preserving technical IDs, codes, and subwords from snake_case identifiers.
        """
        if not text:
            return []
        raw_tokens = re.findall(r'[a-zA-Z0-9_\-\.]+', text.lower())
        tokens = []
        for t in raw_tokens:
            if len(t) > 1 and t not in cls.STOP_WORDS:
                tokens.append(t)
                if "_" in t:
                    for sub in t.split("_"):
                        if len(sub) > 1 and sub not in cls.STOP_WORDS:
                            tokens.append(sub)
        return tokens

    def search_sparse(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Runs Okapi BM25 keyword search over chunks.
        Uses saturation normalization (raw / (raw + 5.0)) so accidental low-scoring
        single word matches don't falsely dominate.
        """
        if not chunks:
            return []

        tokenized_corpus = [self.tokenize(c["text_content"]) for c in chunks]
        tokenized_query = self.tokenize(query)

        if not tokenized_query:
            # If all query words were stopwords, fallback to basic tokens without stopword filter
            tokenized_query = [t for t in re.findall(r'[a-zA-Z0-9_\-\.]+', query.lower()) if len(t) > 1]
            if not tokenized_query:
                return []

        bm25 = BM25Okapi(tokenized_corpus)
        raw_scores = bm25.get_scores(tokenized_query)

        scored_chunks = []
        for i, c in enumerate(chunks):
            raw = max(0.0, float(raw_scores[i]))
            # Soft saturation normalization: score asymptotically approaches 1.0 as raw increases
            # raw = 0 -> 0.0 | raw = 2.5 -> 0.33 | raw = 5.0 -> 0.50 | raw = 15.0 -> 0.75
            norm_score = round(raw / (raw + 5.0), 4)
            
            chunk_copy = dict(c)
            chunk_copy["sparse_score"] = norm_score
            chunk_copy["raw_bm25"] = round(raw, 4)
            scored_chunks.append(chunk_copy)

        # Sort descending by BM25 score
        scored_chunks.sort(key=lambda x: x["sparse_score"], reverse=True)

        # Assign ranks
        for rank, item in enumerate(scored_chunks, start=1):
            item["sparse_rank"] = rank

        return scored_chunks[:top_k]

bm25_retriever = BM25Retriever()
