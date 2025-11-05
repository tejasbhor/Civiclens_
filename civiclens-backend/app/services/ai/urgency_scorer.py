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
        Score report urgency/severity using HYBRID approach:
        1. Rule-based keyword detection (most reliable)
        2. Context analysis (urgency indicators)
        3. Zero-shot classification (fallback)
        
        Args:
            title: Report title
            description: Report description
            category: Optional category for context
            
        Returns:
            {
                "severity": "high",
                "confidence": 0.82,
                "priority": 7,
                "method": "rule_based" or "context_aware" or "zero_shot"
            }
        """
        try:
            # Combine text
            text = f"{title}. {description}".lower()
            
            # STEP 1: Rule-based keyword detection (HIGHEST PRIORITY)
            rule_result = self._rule_based_severity(text, category)
            if rule_result:
                logger.info(
                    f"Rule-based severity: '{rule_result['severity']}' "
                    f"(confidence: {rule_result['confidence']:.2f}, "
                    f"matched: {rule_result.get('matched_keywords', [])})"
                )
                return rule_result
            
            # STEP 2: Context-aware analysis (MEDIUM PRIORITY)
            context_result = self._context_aware_severity(text, category)
            if context_result['confidence'] >= 0.60:
                logger.info(
                    f"Context-aware severity: '{context_result['severity']}' "
                    f"(confidence: {context_result['confidence']:.2f})"
                )
                return context_result
            
            # STEP 3: Zero-shot classification (FALLBACK)
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
                f"Zero-shot severity: '{severity}' with confidence {confidence:.2f}, priority {priority}"
            )
            
            return {
                "severity": severity,
                "confidence": round(confidence, 3),
                "priority": priority,
                "all_scores": all_scores,
                "method": "zero_shot"
            }
            
        except Exception as e:
            logger.error(f"Urgency scoring error: {str(e)}", exc_info=True)
            # Return safe default
            return {
                "severity": "medium",
                "confidence": 0.5,
                "priority": 5,
                "method": "error_fallback",
                "error": str(e)
            }
    
    def _rule_based_severity(self, text: str, category: str = None) -> Dict:
        """
        Rule-based severity detection using keyword matching
        Returns None if no strong match found
        """
        # CRITICAL keywords (life-threatening, emergency)
        critical_keywords = [
            "fire", "explosion", "electrocution", "gas leak", "collapse", "collapsing",
            "sparking", "live wire", "short circuit", "death", "died", "injury", "injured",
            "ambulance", "emergency", "life threatening", "life-threatening", "someone will die",
            "hanging dangerously", "wire hanging"
        ]
        
        # HIGH keywords (urgent, major disruption)
        high_keywords = [
            "burst", "flooding", "flood", "major leak", "sewage overflow", "power outage",
            "no electricity", "no water", "urgent", "immediate attention", "widespread",
            "affecting many", "not collected", "5 days", "multiple", "many days",
            "contamination", "railing damaged", "pole damaged", "accident risk", "major accident"
        ]
        
        # MEDIUM keywords (routine maintenance)
        medium_keywords = [
            "needs repair", "maintenance", "cleaning needed", "minor leak",
            "small pothole", "incomplete", "equipment broken"
        ]
        
        # LOW keywords (cosmetic, non-urgent)
        low_keywords = [
            "cosmetic", "aesthetic", "beautification", "trimming", "paint", "scratch",
            "garden maintenance", "non-essential", "can wait", "general complaint", "dim light"
        ]
        
        # Count matches
        critical_matches = sum(1 for kw in critical_keywords if kw in text)
        high_matches = sum(1 for kw in high_keywords if kw in text)
        medium_matches = sum(1 for kw in medium_keywords if kw in text)
        low_matches = sum(1 for kw in low_keywords if kw in text)
        
        # Determine severity based on matches with category context
        if critical_matches >= 1:
            return {
                "severity": "critical",
                "confidence": min(0.95, 0.75 + (critical_matches * 0.10)),
                "priority": 9,
                "method": "rule_based",
                "matched_keywords": [kw for kw in critical_keywords if kw in text]
            }
        elif high_matches >= 2:
            return {
                "severity": "high",
                "confidence": min(0.90, 0.70 + (high_matches * 0.05)),
                "priority": 7,
                "method": "rule_based",
                "matched_keywords": [kw for kw in high_keywords if kw in text]
            }
        elif low_matches >= 2:
            # Public property with low keywords should be low
            return {
                "severity": "low",
                "confidence": min(0.85, 0.65 + (low_matches * 0.05)),
                "priority": 3,
                "method": "rule_based",
                "matched_keywords": [kw for kw in low_keywords if kw in text]
            }
        elif medium_matches >= 2:
            return {
                "severity": "medium",
                "confidence": min(0.85, 0.65 + (medium_matches * 0.05)),
                "priority": 5,
                "method": "rule_based",
                "matched_keywords": [kw for kw in medium_keywords if kw in text]
            }
        elif high_matches == 1:
            # Single high keyword might still be high for certain categories
            if category in ["electricity", "water", "drainage"]:
                return {
                    "severity": "high",
                    "confidence": 0.70,
                    "priority": 7,
                    "method": "rule_based",
                    "matched_keywords": [kw for kw in high_keywords if kw in text]
                }
        elif medium_matches == 1:
            # Single medium keyword for roads/sanitation = medium (not high)
            if category in ["roads", "sanitation"]:
                return {
                    "severity": "medium",
                    "confidence": 0.65,
                    "priority": 5,
                    "method": "rule_based",
                    "matched_keywords": [kw for kw in medium_keywords if kw in text]
                }
        
        return None  # No strong match, fall through to context analysis
    
    def _context_aware_severity(self, text: str, category: str = None) -> Dict:
        """
        Context-aware severity scoring based on category and text analysis
        """
        # Default severity by category
        category_defaults = {
            "electricity": "medium",  # Varies by issue
            "water": "medium",  # Varies by issue
            "drainage": "medium",  # Varies by issue
            "roads": "medium",  # Road issues vary
            "streetlight": "low",  # Usually not urgent
            "sanitation": "medium",  # Varies by severity
            "public_property": "low",  # Usually cosmetic
            "other": "low"  # General complaints are usually low priority
        }
        
        base_severity = category_defaults.get(category, "medium")
        confidence = 0.60  # Base confidence for context-aware
        
        # Adjust based on urgency indicators
        urgency_words = ["urgent", "immediate", "emergency", "asap", "quickly", "now"]
        impact_words = ["many people", "entire area", "whole street", "multiple", "widespread"]
        
        urgency_count = sum(1 for word in urgency_words if word in text)
        impact_count = sum(1 for word in impact_words if word in text)
        
        # Upgrade severity if urgency/impact indicators present
        if urgency_count >= 1 or impact_count >= 1:
            if base_severity == "low":
                base_severity = "medium"
            elif base_severity == "medium":
                base_severity = "high"
            confidence += 0.10
        
        priority = self._calculate_priority(base_severity, confidence)
        
        return {
            "severity": base_severity,
            "confidence": min(0.80, confidence),
            "priority": priority,
            "method": "context_aware"
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
