"""
Department Routing for Navi Mumbai's 6 Departments
Matches reports to appropriate departments using category mapping and keyword matching
"""

from typing import Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging

from app.models.department import Department
from app.services.ai.config import AIConfig

logger = logging.getLogger(__name__)


class DepartmentRouter:
    """
    Route reports to one of Navi Mumbai's 6 departments:
    1. Public Works Department
    2. Water Supply Department
    3. Sanitation Department
    4. Electrical Department
    5. Horticulture Department
    6. Health & Medical Department
    """
    
    # Department name mapping (from seed data)
    DEPARTMENT_MAPPINGS = {
        "roads": ["Public Works Department", "PWD"],
        "water": ["Water Supply Department", "Water Supply", "Jal Nigam"],
        "sanitation": ["Sanitation Department", "Solid Waste", "Swachh"],
        "electricity": ["Electrical Department", "Electric", "Street Light"],
        "streetlight": ["Electrical Department", "Street Light"],
        "drainage": ["Public Works Department", "Drainage", "PWD"],
        "public_property": ["Horticulture Department", "Parks", "Gardens"],
        "other": None  # Requires admin decision
    }
    
    async def route_to_department(
        self,
        category: str,
        title: str,
        description: str,
        db: AsyncSession
    ) -> Dict:
        """
        Route report to appropriate department
        
        Returns:
        {
            "department_id": 3,
            "department_name": "Public Works Department",
            "confidence": 0.90,
            "method": "category_mapping"
        }
        """
        
        try:
            # Get all departments from database
            result = await db.execute(select(Department))
            departments = result.scalars().all()
            
            if not departments:
                logger.error("No departments found in database!")
                return {"department_id": None, "error": "No departments configured"}
            
            # Create department lookup
            dept_lookup = {dept.name: dept for dept in departments}
            
            # Get expected department names for category
            expected_names = self.DEPARTMENT_MAPPINGS.get(category, [])
            
            if not expected_names:
                # Category = "other" - no automatic routing
                logger.warning(f"Category '{category}' requires manual department assignment")
                return {
                    "department_id": None,
                    "department_name": None,
                    "confidence": 0.0,
                    "method": "manual_required",
                    "reason": "Category 'other' requires admin review"
                }
            
            # Try exact match first
            for expected_name in expected_names:
                for dept_name, dept in dept_lookup.items():
                    if expected_name.lower() in dept_name.lower():
                        logger.info(f"Matched '{category}' → '{dept.name}' (exact match)")
                        return {
                            "department_id": dept.id,
                            "department_name": dept.name,
                            "confidence": 0.95,
                            "method": "category_mapping",
                            "matched_by": "exact_name_match"
                        }
            
            # Fallback: keyword matching in department.keywords field
            best_match = await self._keyword_match(
                category, title, description, departments
            )
            
            if best_match:
                return best_match
            
            # Last resort: return first department with warning
            fallback_dept = departments[0]
            logger.warning(
                f"No match found for '{category}', using fallback: {fallback_dept.name}"
            )
            
            return {
                "department_id": fallback_dept.id,
                "department_name": fallback_dept.name,
                "confidence": 0.40,
                "method": "fallback",
                "reason": "No strong match found"
            }
            
        except Exception as e:
            logger.error(f"Department routing failed: {str(e)}", exc_info=True)
            return {"department_id": None, "error": str(e)}
    
    async def _keyword_match(
        self,
        category: str,
        title: str,
        description: str,
        departments: list
    ) -> Optional[Dict]:
        """
        Match using Department.keywords field
        """
        
        category_keywords = AIConfig.CATEGORIES.get(category, {}).get("keywords", [])
        text_lower = f"{title} {description}".lower()
        
        best_dept = None
        best_score = 0
        
        for dept in departments:
            if not dept.keywords:
                continue
            
            dept_keywords = [kw.strip().lower() for kw in dept.keywords.split(",")]
            
            # Count matching keywords
            matches = 0
            for kw in category_keywords:
                if kw in dept_keywords:
                    matches += 2  # Strong signal
            
            for kw in dept_keywords:
                if kw in text_lower:
                    matches += 1  # Weaker signal
            
            if matches > best_score:
                best_score = matches
                best_dept = dept
        
        if best_dept and best_score >= 2:
            confidence = min(0.90, 0.60 + (best_score * 0.10))
            
            logger.info(
                f"Keyword match: '{category}' → '{best_dept.name}' "
                f"(score: {best_score}, confidence: {confidence:.2f})"
            )
            
            return {
                "department_id": best_dept.id,
                "department_name": best_dept.name,
                "confidence": round(confidence, 2),
                "method": "keyword_matching",
                "match_score": best_score
            }
        
        return None
