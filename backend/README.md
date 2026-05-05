# Rentals Backend

FastAPI + Strawberry GraphQL backend for the rental flat/plot MVP.

The backend now uses PostgreSQL as the single application database. Listing images are represented as
metadata rows that point to object-storage URLs; do not store image binaries in Postgres.

## Local setup

From the repository root:

```bash
cd /Users/unbxd/Desktop/rentals
source .venv/bin/activate
pip install -e "backend[dev]"
cp backend/.env.example backend/.env
docker compose up -d postgres
cd backend
uvicorn app.main:app --reload
```

API health check:

```bash
curl http://127.0.0.1:8000/health
```

Interactive docs:

```text
http://127.0.0.1:8000/docs
```

GraphQL endpoint:

```text
http://127.0.0.1:8000/graphql
```

## MVP boundaries

- PostgreSQL stores users, roles, listings, listing image metadata, inquiries, and flexible listing attributes via JSONB.
- Listing image files should live in object storage such as Cloudflare R2, Backblaze B2, S3, or DigitalOcean Spaces.
- Google Maps integration will be consumed by the Flutter app. The backend expects latitude and longitude from the client.
