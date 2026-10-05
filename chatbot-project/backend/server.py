import os
import json
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

load_dotenv()

base_url = os.getenv("BASE_URL")
api_key = os.getenv("API_KEY")
model = os.getenv("MODEL")
system_prompt = os.getenv("SYSTEM_PROMPT")
temperature = float(os.getenv("TEMPERATURE", "0.7"))

if not api_key:
    raise RuntimeError("API_KEY .env file mein nahi mila")

url = f"{base_url}/chat/completions"

app = FastAPI()

# React (Vite) dev server se requests allow karne ke liye
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite ka default port
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    # Frontend poori conversation history bhejega: [{role, content}, ...]
    messages: list


def stream_ai_response(user_messages: list):
    """
    Yehi wahi logic hai jo aapke CLI script mein tha —
    bas ab ye ek generator hai jo FastAPI ke through
    chunks ko seedha browser tak stream karta hai.
    """
    full_messages = [
        {
            "role": "system", "content": system_prompt
            
        }

        ] + user_messages

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    data = {
        "model": model,
        "messages": full_messages,
        "temperature": temperature,
        "stream": True,
    }

    with httpx.stream("POST", url, headers=headers, json=data, timeout=30) as response:
        for line in response.iter_lines():
            if line and line.startswith("data: "):
                chunk = line[len("data: "):]
                if chunk.strip() == "[DONE]":
                    break
                try:
                    delta = json.loads(chunk)["choices"][0]["delta"].get("content", "")
                    if delta:
                        # Server-Sent Events format mein bhej rahe hain
                        yield f"data: {json.dumps({'content': delta})}\n\n"
                except Exception:
                    continue
    yield "data: [DONE]\n\n"


@app.post("/chat")
def chat(req: ChatRequest):
    return StreamingResponse(
        stream_ai_response(req.messages),
        media_type="text/event-stream",
    )


@app.get("/")
def health():
    return {"status": "ok", "model": model}
