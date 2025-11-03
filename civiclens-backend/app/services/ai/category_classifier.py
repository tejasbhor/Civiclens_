"""
Category Classification using Zero-Shot Learning
Maps report text to ReportCategory enum
"""

import logging
from typing import Dict
from transformers import pipeline
from app.services.ai.config import AIConfig

logger = logging.getLogger(__name__)


class CategoryClassifier:
    """
    Zero-shot category classifier using BART
    Classifies reports into your 8 categories
    """
    
    def __init__(self):
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Lazy load the model"""
        try:
            logger.info("Loading zero-shot classification model...")
            self.model = pipeline(
                "zero-shot-classification",
                model=AIConfig.ZERO_SHOT_MODEL,
                device=-1  # CPU, use 0 for GPU
            )
            logger.info("✅ Classification model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load classification model: {str(e)}")
            raise
    
    def classify(self, title: str, description: str) -> Dict:
        """
        Classify report into category
        
        Args:
            title: Report title
            description: Report description
            
        Returns:
            {
                "category": "roads",
                "confidence": 0.87,
                "all_scores": {...}
            }
        """
        try:
            # Combine title and description
            text = f"{title}. {description}"
            
            # Truncate if too long
            if len(text) > AIConfig.MAX_TEXT_LENGTH:
                text = text[:AIConfig.MAX_TEXT_LENGTH]
            
            # Get category labels
            candidate_labels = AIConfig.get_category_labels()
            
            # Classify
            result = self.model(
                text,
                candidate_labels,
                multi_label=False
            )
            
            # Map back to enum value
            predicted_label = result['labels'][0]
            confidence = result['scores'][0]
            category = AIConfig.map_category_label(predicted_label)
            
            # Build scores dict
            all_scores = {}
            for label, score in zip(result['labels'], result['scores']):
                cat_key = AIConfig.map_category_label(label)
                all_scores[cat_key] = round(score, 3)
            
            logger.info(
                f"Classified as '{category}' with confidence {confidence:.2f}"
            )
            
            return {
                "category": category,
                "confidence": round(confidence, 3),
                "all_scores": all_scores,
                "predicted_label": predicted_label
            }
            
        except Exception as e:
            logger.error(f"Classification error: {str(e)}", exc_info=True)
            # Return safe default
            return {
                "category": "other",
                "confidence": 0.3,
                "all_scores": {},
                "error": str(e)
            }
