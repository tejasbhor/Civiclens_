# CivicLens Backend

A FastAPI-based backend for municipal civic engagement platform.

## Prerequisites

- Python 3.11+
- PostgreSQL with PostGIS
- Redis
- MinIO

## Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your database and service configurations
   ```

3. **Setup database:**
   ```sql
   -- Connect to PostgreSQL
   psql -U postgres
   
   -- Create database and user
   CREATE DATABASE civiclens_db;
   CREATE USER civiclens_user WITH PASSWORD 'password123';
   GRANT ALL PRIVILEGES ON DATABASE civiclens_db TO civiclens_user;
   
   -- Install PostGIS
   \c civiclens_db
   CREATE EXTENSION postgis;
   ```

4. **Start server (tables auto-created):**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0
   ```
   
   The app automatically:
   - ✅ Installs PostGIS extension
   - ✅ Creates all database tables
   - ✅ Checks all service connections

5. **Seed initial data (optional):**
   ```bash
   python -m app.db.seeds.seed_Navi Mumbai_data
   ```

## API Documentation

- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

## Default Admin

- **Email:** admin@civiclens.gov.in
- **Password:** Admin123!

## Project Structure

```
app/
├── api/          # API routes
├── core/         # Core functionality  
├── models/       # Database models
├── services/     # Business logic
├── db/           # Database utilities and seeds
└── main.py       # FastAPI application
```
