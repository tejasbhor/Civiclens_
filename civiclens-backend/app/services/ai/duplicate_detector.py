"""
Duplicate Detection using Semantic Similarity + Geospatial Proximity
Combines Sentence-BERT embeddings with PostGIS spatial queries
"""

import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sentence_transformers import SentenceTransformer
from geoalchemy2.functions import ST_DWithin, ST_MakePoint
import numpy as np

from app.models.report import Report, ReportStatus
from app.services.ai.config import AIConfig

logger = logging.getLogger(__name__)


class DuplicateDetector:
    """
    Detects duplicate reports using:
    1. Semantic similarity (Sentence-BERT)
    2. Geospatial proximity (PostGIS)
    3. Temporal window
    """
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Lazy load the sentence transformer model"""
        try:
            logger.info("Loading sentence transformer model...")
            self.model = SentenceTransformer(AIConfig.SENTENCE_TRANSFORMER_MODEL)
            logger.info("✅ Sentence transformer loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load sentence transformer: {str(e)}")
            raise
    
    async def check_duplicate(
        self,
        title: str,
        description: str,
        latitude: float,
        longitude: float,
        db: AsyncSession,
        category: Optional[str] = None,
        report_id: Optional[int] = None
    ) -> Dict:
        """
        Check if report is a duplicate
        
        Args:
            title: Report title
            description: Report description
            latitude: GPS latitude
            longitude: GPS longitude
            db: Database session
            category: Optional category for radius adjustment
            
        Returns:
            {
                "is_duplicate": False,
                "duplicate_of": None,
                "similarity": 0.0,
                "distance_meters": 0.0,
                "explanation": "..."
            }
        """
        try:
            # Get geo radius based on category
            radius_meters = AIConfig.get_geo_radius_for_category(category or "other")
            
            # Time window
            time_threshold = datetime.utcnow() - timedelta(
                days=AIConfig.DUPLICATE_TIME_WINDOW_DAYS
            )
            
            # Step 1: Spatial query to get nearby reports
            nearby_reports = await self._get_nearby_reports(
                db, latitude, longitude, radius_meters, time_threshold, report_id
            )
            
            if not nearby_reports:
                logger.info("No nearby reports found")
                return {
                    "is_duplicate": False,
                    "duplicate_of": None,
                    "similarity": 0.0,
                    "distance_meters": 0.0,
                    "explanation": "No nearby reports in spatial/temporal window"
                }
            
            logger.info(f"Found {len(nearby_reports)} nearby reports")
            
            # Step 2: Semantic similarity check
            query_text = f"{title}. {description}"
            query_embedding = self.model.encode(query_text, convert_to_numpy=True)
            
            best_match = None
            best_similarity = 0.0
            
            for report in nearby_reports:
                report_text = f"{report.title}. {report.description}"
                report_embedding = self.model.encode(report_text, convert_to_numpy=True)
                
                # Cosine similarity
                similarity = self._cosine_similarity(query_embedding, report_embedding)
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match = report
            
            # Step 3: Determine if duplicate
            is_duplicate = best_similarity >= AIConfig.DUPLICATE_SIMILARITY_THRESHOLD
            
            if is_duplicate and best_match:
                logger.info(
                    f"Duplicate detected! Similar to report {best_match.id} "
                    f"(similarity: {best_similarity:.2f})"
                )
                
                return {
                    "is_duplicate": True,
                    "duplicate_of": best_match.id,
                    "similarity": round(best_similarity, 3),
                    "distance_meters": radius_meters,  # Approximate
                    "explanation": (
                        f"Similar report found (Report #{best_match.report_number or best_match.id}). "
                        f"Similarity: {best_similarity:.0%}, within {radius_meters}m radius."
                    ),
                    "original_report": {
                        "id": best_match.id,
                        "report_number": best_match.report_number,
                        "title": best_match.title,
                        "status": best_match.status.value,
                        "created_at": best_match.created_at.isoformat()
                    }
                }
            else:
                logger.info(
                    f"Not a duplicate. Best similarity: {best_similarity:.2f} "
                    f"(threshold: {AIConfig.DUPLICATE_SIMILARITY_THRESHOLD})"
                )
                
                return {
                    "is_duplicate": False,
                    "duplicate_of": None,
                    "similarity": round(best_similarity, 3),
                    "distance_meters": radius_meters,
                    "explanation": f"No similar reports found (best similarity: {best_similarity:.0%})"
                }
            
        except Exception as e:
            logger.error(f"Duplicate detection error: {str(e)}", exc_info=True)
            # Fail safe - don't mark as duplicate on error
            return {
                "is_duplicate": False,
                "duplicate_of": None,
                "similarity": 0.0,
                "distance_meters": 0.0,
                "explanation": f"Duplicate detection failed: {str(e)}",
                "error": str(e)
            }
    
    async def _get_nearby_reports(
        self,
        db: AsyncSession,
        latitude: float,
        longitude: float,
        radius_meters: int,
        time_threshold: datetime,
        exclude_report_id: Optional[int] = None
    ) -> list:
        """
        Get reports within spatial and temporal window
        Uses PostGIS ST_DWithin for efficient spatial query
        Works with GEOGRAPHY type (no need for ST_Transform)
        """
        try:
            # Create point using latitude/longitude columns directly
            # Since Report.location is GEOGRAPHY type, we use lat/lon columns
            point = func.ST_SetSRID(func.ST_MakePoint(longitude, latitude), 4326)
            
            # Build query conditions
            conditions = [
                # Spatial filter using lat/lon columns
                func.ST_DWithin(
                    func.ST_SetSRID(
                        func.ST_MakePoint(Report.longitude, Report.latitude),
                        4326
                    ),
                    point,
                    radius_meters  # ST_DWithin with geography uses meters directly
                ),
                # Temporal filter
                Report.created_at >= time_threshold,
                # Exclude duplicates and rejected
                Report.status.not_in([
                    ReportStatus.DUPLICATE,
                    ReportStatus.REJECTED,
                    ReportStatus.CLOSED
                ])
            ]
            
            # Exclude the current report being checked
            if exclude_report_id:
                conditions.append(Report.id != exclude_report_id)
            
            # Query nearby reports using lat/lon columns
            query = select(Report).where(and_(*conditions)).limit(50)  # Limit for performance
            
            result = await db.execute(query)
            reports = result.scalars().all()
            
            return list(reports)
            
        except Exception as e:
            logger.error(f"Spatial query error: {str(e)}", exc_info=True)
            return []
    
    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return float(dot_product / (norm1 * norm2))
