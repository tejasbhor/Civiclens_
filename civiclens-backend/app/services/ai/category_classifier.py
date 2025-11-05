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
        Classify report into category with improved accuracy
        
        Args:
            title: Report title
            description: Report description
            
        Returns:
            {
                "category": "roads",
                "confidence": 0.87,
                "all_scores": {...},
                "method": "zero_shot" or "keyword_boost"
            }
        """
        try:
            # Combine title and description with emphasis on title
            text = f"{title}. {title}. {description}"  # Repeat title for emphasis
            
            # Truncate if too long
            if len(text) > AIConfig.MAX_TEXT_LENGTH:
                text = text[:AIConfig.MAX_TEXT_LENGTH]
            
            # Get category labels
            candidate_labels = AIConfig.get_category_labels()
            
            # Classify using zero-shot
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
            
            # IMPROVEMENT: Keyword-based override and confidence boost
            # Check ALL categories for strong keyword matches
            text_lower = text.lower()
            
            # Find best category by keyword matches AND zero-shot score
            # Priority: Categories with 2+ keywords, ranked by zero-shot score
            keyword_candidates = []
            
            for cat_key, cat_info in AIConfig.CATEGORIES.items():
                keywords = cat_info.get("keywords", [])
                matches = sum(1 for kw in keywords if kw in text_lower)
                if matches >= 2:  # Only consider categories with 2+ keyword matches
                    zero_shot_score = all_scores.get(cat_key, 0.0)
                    keyword_candidates.append({
                        "category": cat_key,
                        "keyword_count": matches,
                        "zero_shot_score": zero_shot_score,
                        "combined_score": zero_shot_score + (matches * 0.05)  # Slight boost for keywords
                    })
            
            # Sort by combined score (zero-shot + keyword bonus)
            keyword_candidates.sort(key=lambda x: x["combined_score"], reverse=True)
            
            # Get best keyword candidate
            best_keyword_category = keyword_candidates[0]["category"] if keyword_candidates else None
            best_keyword_count = keyword_candidates[0]["keyword_count"] if keyword_candidates else 0
            
            # OVERRIDE: If strong keyword match (2+), use that category instead
            # Lower threshold for override when zero-shot is uncertain
            should_override = False
            if best_keyword_count >= 2 and best_keyword_category != category:
                # Get the zero-shot score for the keyword-matched category
                keyword_category_score = all_scores.get(best_keyword_category, 0.0)
                
                # Override if:
                # 1. Keyword category had reasonable zero-shot score (>0.12), OR
                # 2. Very strong keyword match (4+) even with low zero-shot score, OR
                # 3. Keyword category has significantly higher zero-shot score than predicted
                zero_shot_diff = keyword_category_score - all_scores.get(category, 0.0)
                
                if (keyword_category_score > 0.12 or 
                    best_keyword_count >= 4 or 
                    (best_keyword_count >= 3 and zero_shot_diff > -0.10)):
                    should_override = True
                    logger.info(
                        f"Keyword override: {category} ({confidence:.2f}) → "
                        f"{best_keyword_category} ({keyword_category_score:.2f}) "
                        f"[{best_keyword_count} keyword matches]"
                    )
                    category = best_keyword_category
                    confidence = min(0.95, max(keyword_category_score + 0.20, 0.50))  # Boost for keyword match
            
            # BOOST: If predicted category has keyword matches, boost confidence
            category_keywords = AIConfig.CATEGORIES.get(category, {}).get("keywords", [])
            keyword_matches = sum(1 for kw in category_keywords if kw in text_lower)
            
            if keyword_matches >= 2:
                # Boost confidence by up to 0.15 based on keyword matches
                boost = min(0.15, keyword_matches * 0.03)
                original_confidence = confidence
                confidence = min(0.99, confidence + boost)
                logger.info(
                    f"Keyword boost: {keyword_matches} matches, "
                    f"confidence {original_confidence:.2f} → {confidence:.2f}"
                )
            
            # Check if confidence is too low (ambiguous classification)
            if confidence < AIConfig.MIN_CLASSIFICATION_CONFIDENCE:
                # Check if second-best score is close (ambiguous)
                if len(result['scores']) > 1:
                    second_best = result['scores'][1]
                    if confidence - second_best < 0.10:  # Too close
                        logger.warning(
                            f"Ambiguous classification: {category} ({confidence:.2f}) "
                            f"vs {AIConfig.map_category_label(result['labels'][1])} ({second_best:.2f})"
                        )
                        return {
                            "category": "other",
                            "confidence": 0.40,
                            "all_scores": all_scores,
                            "reason": "ambiguous_classification",
                            "top_candidates": [
                                {"category": category, "score": round(confidence, 3)},
                                {"category": AIConfig.map_category_label(result['labels'][1]), "score": round(second_best, 3)}
                            ]
                        }
            
            logger.info(
                f"Classified as '{category}' with confidence {confidence:.2f}"
            )
            
            # Determine classification method
            if should_override:
                method = "keyword_override"
            elif keyword_matches >= 2:
                method = "keyword_boost"
            else:
                method = "zero_shot"
            
            return {
                "category": category,
                "confidence": round(confidence, 3),
                "all_scores": all_scores,
                "predicted_label": predicted_label,
                "method": method
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
