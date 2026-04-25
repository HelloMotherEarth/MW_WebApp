# MW Dashboard Scaffold

This project is scaffolded for:
- `backend/` Python FastAPI API (device status + graph query endpoints)
- `frontend/` React + TypeScript UI (`/MW` overview and `/MW/device/:id`)

## Backend quick start

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Frontend quick start

```powershell
cd frontend
npm install
npm run dev
```

Open:
- Frontend: `http://localhost:5173/MW`
- API docs: `http://localhost:8000/docs`

## What is scaffolded

- Landing page with one panel per device (auto-refresh every 5s).
- Device detail page with:
  - field selection
  - date/time range inputs
  - graph request button
- Backend endpoints:
  - `GET /api/health`
  - `GET /api/devices`
  - `GET /api/devices/status`
  - `GET /api/devices/{device_id}`
  - `GET /api/devices/{device_id}/fields`
  - `POST /api/devices/{device_id}/graph`

## Next integration steps

1. Replace mock `DEVICE_REGISTRY` and synthetic graph generation in `backend/app/services/device_service.py`.
2. Add SQL query logic for your table pattern (`MWController_Module_XXX`).
3. Replace the graph placeholder in `frontend/src/components/GraphBuilder.tsx` with Plotly.
4. Add authentication before public deployment.
