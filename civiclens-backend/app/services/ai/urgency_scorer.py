"""
Urgency/Severity Scoring using Zero-Shot Learning
Maps report urgency to ReportSeverity enum
"""

import logging
from typing import Dict
from transformers import pipeline
from app.services.ai.config import AIConfig

logger = logging.getLogger(__name__)


class UrgencyScorer:
    """
    Zero-shot urgency scorer using BART
    Classifies reports into severity levels: low, medium, high, critical
    """
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Lazy load the model"""
        try:
            logger.info("Loading urgency scoring model...")
            self.model = pipeline(
                "zero-shot-classification",
                model=AIConfig.ZERO_SHOT_MODEL,
                device=-1  # CPU
            )
            logger.info("✅ Urgency scoring model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load urgency model: {str(e)}")
            raise
    
    def score_urgency(
        self,
        title: str,
        description: str,
        category: str = None
    ) -> Dict:
        """
        Score report urgency/severity
        
        Args:
            title: Report title
            description: Report description
            category: Optional category for context
            
        Returns:
            {
                "severity": "high",
                "confidence": 0.82,
                "priority": 7,
                "all_scores": {...}
            }
        """
        try:
            # Combine text
            text = f"{title}. {description}"
            
            # Truncate if needed
            if len(text) > AIConfig.MAX_TEXT_LENGTH:
                text = text[:AIConfig.MAX_TEXT_LENGTH]
            
            # Get severity labels
            candidate_labels = AIConfig.get_severity_labels()
            
            # Classify
            result = self.model(
                text,
                candidate_labels,
                multi_label=False
            )
            
            # Map back to enum value
            predicted_label = result['labels'][0]
            confidence = result['scores'][0]
            severity = AIConfig.map_severity_label(predicted_label)
            
            # Calculate priority score (1-10)
            priority = self._calculate_priority(severity, confidence)
            
            # Build scores dict
            all_scores = {}
            for label, score in zip(result['labels'], result['scores']):
                sev_key = AIConfig.map_severity_label(label)
                all_scores[sev_key] = round(score, 3)
            
            logger.info(
                f"Scored as '{severity}' with confidence {confidence:.2f}, priority {priority}"
            )
            
            return {
                "severity": severity,
                "confidence": round(confidence, 3),
                "priority": priority,
                "all_scores": all_scores,
                "predicted_label": predicted_label
            }
            
        except Exception as e:
            logger.error(f"Urgency scoring error: {str(e)}", exc_info=True)
            # Return safe default
            return {
                "severity": "medium",
                "confidence": 0.5,
                "priority": 5,
                "all_scores": {},
                "error": str(e)
            }
    
    def _calculate_priority(self, severity: str, confidence: float) -> int:
        """
        Calculate priority score (1-10) based on severity and confidence
        """
        base_priority = {
            "low": 3,
            "medium": 5,
            "high": 7,
            "critical": 9
        }.get(severity, 5)
        
        # Adjust based on confidence
        if confidence >= 0.90:
            adjustment = 1
        elif confidence >= 0.75:
            adjustment = 0
        else:
            adjustment = -1
        
        return max(1, min(10, base_priority + adjustment))
