import asyncio
import sys
from pathlib import Path
from sqlalchemy import select

# Ensure project root is on sys.path so 'app' package can be imported when running tests as a script
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import AsyncSessionLocal
from app.models.department import Department


async def ensure_department_and_get_id(name: str = "Public Works") -> int:
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Department).where(Department.name == name))
        dep = res.scalar_one_or_none()
        if dep:
            return dep.id
        dep = Department(name=name, description="Auto-created for tests")
        db.add(dep)
        await db.commit()
        await db.refresh(dep)
        return dep.id


if __name__ == "__main__":
    dep_id = asyncio.run(ensure_department_and_get_id())
    print(dep_id)
