# AI Chatbot (React + FastAPI)

Ye project do parts mein hai:
- `src/` — React frontend (chatbot UI)
- `backend/` — Python FastAPI server (jo aapke AI model ko call karta hai)

Dono ko ek saath chalana hoga (2 alag terminal windows mein).

## 1. Backend chalayein

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        
pip install -r requirements.txt
```

`.env.example` ko copy karke `.env` banayein aur apni values daalein:

```bash
cp .env.example .env
```

`.env` file kholkar `API_KEY`, `BASE_URL`, `MODEL` apne provider ke hisaab se set karein.

Server chalayein:

```bash
uvicorn server:app --reload --port 8000
```

Check karein: browser mein `http://localhost:8000` kholein, `{"status": "ok"}` dikhna chahiye.

## 2. Frontend chalayein

Naye terminal mein (backend wala terminal chalta rehne dein):

```bash
npm install
npm run dev
```

Terminal mein diya gaya link kholein (usually `http://localhost:5173`).

## 3. Use karein

Chat box mein kuch bhi type karein aur Enter dabayein — message backend ko jayega, backend AI model ko call karega, aur response live streaming ke saath chat mein aayega.

## Note

- Backend aur frontend dono hamesha ek saath chalne chahiye.
- Agar `http://localhost:5173` ke alawa koi aur port par frontend chale, to `backend/server.py` mein `allow_origins` list update kar dein.
