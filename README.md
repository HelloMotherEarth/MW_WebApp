# MW Dashboard

Live dashboard for MW controllers with:
- `backend/` FastAPI API for device status + graph data
- `frontend/` React + TypeScript app for `/MW` and `/MW/device/:id`

## Project skeleton

```text
MWDashboard/
|-- .env
|-- .env.example
|-- .gitignore
|-- README.md
|-- SETUP-SECRETS.md
|-- .secrets/
|   `-- README.md
|-- reference/
|   `-- (local example scripts / notes)
|-- backend/
|   |-- requirements.txt
|   `-- app/
|       |-- main.py                       # FastAPI app + CORS + health/db-check endpoints
|       |-- schemas.py                    # Pydantic request/response models
|       |-- routers/
|       |   `-- devices.py                # /api/devices routes
|       `-- services/
|           |-- db.py                     # DB connection + env config helpers
|           `-- device_service.py         # module discovery, status, graph queries
`-- frontend/
    |-- package.json
    |-- package-lock.json
    |-- index.html
    |-- tsconfig.json
    |-- vite.config.ts
    `-- src/
        |-- main.tsx                      # app bootstrap
        |-- App.tsx                       # app routes
        |-- api.ts                        # frontend API client
        |-- types.ts                      # shared frontend types
        |-- styles.css                    # global styles
        |-- components/
        |   |-- DeviceCard.tsx            # controller status card
        |   `-- GraphBuilder.tsx          # Plotly graph renderer + export
        |-- pages/
        |   |-- DeviceOverviewPage.tsx    # /MW
        |   `-- DeviceDetailPage.tsx      # /MW/device/:id
        `-- types/
            `-- plotly-js-dist-min.d.ts   # local module declaration
```

## Local run

Backend:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend:
```powershell
cd frontend
npm install
npm run dev
```

Open:
- Frontend: `http://localhost:5173/MW`
- API docs: `http://127.0.0.1:8000/docs`
