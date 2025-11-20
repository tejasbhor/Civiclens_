"""
AI Configuration - Mapped to CivicLens Backend Schema
Customized for Navi Mumbai Municipal Corporation
"""

import os
from typing import Dict, List


class AIConfig:
    """AI Configuration matching your existing enums and departments"""
    
    # Model Configuration
    ZERO_SHOT_MODEL = "facebook/bart-large-mnli"
    SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
    MODEL_CACHE_DIR = os.path.join(os.getcwd(), "models", "cache")
    AI_MODEL_VERSION = "v1.0.0-civiclens-navimumbai"
    
    # Category Mapping (Matches your ReportCategory enum exactly)
    # IMPROVED: More specific, descriptive labels for better zero-shot classification
    CATEGORIES = {
        "roads": {
            "label": "damaged roads with potholes cracks or broken pavement requiring repair",
            "keywords": ["pothole", "road", "street", "highway", "pavement", "asphalt", 
                        "crack", "footpath", "bridge", "broken road", "damaged road", 
                        "road repair", "resurfacing", "tar", "cement", "construction"],
            "department_name": "Public Works Department",
            "examples": ["pothole on main road", "broken footpath", "road cracks", "bridge damage"]
        },
        "water": {
            "label": "water supply problems including leakage pipeline burst or shortage",
            "keywords": ["water", "pipe", "leak", "burst", "supply", "tap", "pipeline", 
                        "drinking water", "pressure", "shortage", "no water", "water supply",
                        "leaking pipe", "broken pipe", "water tank", "contamination"],
            "department_name": "Water Supply Department",
            "examples": ["water leakage", "no water supply", "pipe burst", "low pressure"]
        },
        "sanitation": {
            "label": "garbage waste collection and sanitation cleanliness issues",
            "keywords": ["garbage", "waste", "trash", "dump", "collection", "bin", 
                        "litter", "sweeping", "sanitation", "hygiene", "dirty", "cleaning",
                        "dustbin", "disposal", "rubbish", "filth", "toilet", "public toilet",
                        "washroom", "restroom", "lavatory", "urinal"],
            "department_name": "Sanitation Department",
            "examples": ["garbage not collected", "overflowing dustbin", "dirty area", "waste pile"]
        },
        "electricity": {
            "label": "electrical power supply problems transformer or wiring issues",
            "keywords": ["electricity", "power", "outage", "transformer", "wire", "electric wire",
                        "electric pole", "connection", "meter", "no power", "blackout",
                        "power cut", "electrical fault", "short circuit", "hanging wire", "loose wire"],
            "department_name": "Electrical Department",
            "examples": ["power outage", "transformer problem", "no electricity", "wire damage"]
        },
        "streetlight": {
            "label": "street light not working or damaged requiring lamp bulb replacement",
            "keywords": ["streetlight", "street light", "lamp", "light pole", "bulb", 
                        "dark", "illumination", "night", "not working", "lighting",
                        "lamp post", "broken light", "dim light", "no light"],
            "department_name": "Electrical Department",
            "examples": ["streetlight not working", "broken lamp", "dark street", "bulb fused"]
        },
        "drainage": {
            "label": "drainage blockage sewage overflow or waterlogging flooding problems",
            "keywords": ["drainage", "drain", "sewer", "clog", "overflow", "flood", 
                        "rainwater", "gutter", "manhole", "blockage", "waterlogging",
                        "blocked drain", "sewage", "stagnant water", "flooding", "manhole cover",
                        "missing cover", "open manhole"],
            "department_name": "Public Works Department",
            "examples": ["blocked drain", "waterlogging", "sewage overflow", "flooded street"]
        },
        "public_property": {
            "label": "parks gardens trees or public property damage vandalism maintenance",
            "keywords": ["park", "garden", "bench", "playground", "fence", "wall", 
                        "public property", "vandalism", "tree", "broken", "plants",
                        "green space", "trimming", "cutting", "beautification", "equipment",
                        "swing", "slide", "see-saw", "merry-go-round", "children", "park bench",
                        "oxygen park", "tagore hill", "maintenance needed"],
            "department_name": "Horticulture Department",
            "examples": ["broken bench", "damaged park", "tree cutting needed", "garden maintenance"]
        },
        "other": {
            "label": "other civic issues not fitting specific categories requiring review",
            "keywords": ["other", "miscellaneous", "general", "complaint", "issue"],
            "department_name": None,
            "examples": ["general complaint", "miscellaneous issue"]
        }
    }
    
    # Severity Mapping (Matches your ReportSeverity enum exactly)
    # NOTE: These are FALLBACK labels for zero-shot. Primary detection uses rule-based keywords.
    SEVERITY_LABELS = {
        "critical": "life-threatening emergency requiring immediate response",
        "high": "urgent problem requiring priority attention within 24 hours",
        "medium": "routine maintenance issue requiring scheduled repair",
        "low": "minor cosmetic issue with low priority"
    }
    
    # Duplicate Detection Settings (PRODUCTION-READY)
    DUPLICATE_SIMILARITY_THRESHOLD = 0.75  # 75% semantic similarity required
    DUPLICATE_GEO_RADIUS_METERS = 200  # 200m radius default
    DUPLICATE_TIME_WINDOW_DAYS = 30  # Check reports from last 30 days
    DUPLICATE_HIGH_CONFIDENCE_THRESHOLD = 0.90  # ≥90% = auto-mark, <90% = needs review
    
    # Category-Specific Geo Radius (for better duplicate detection)
    CATEGORY_GEO_RADIUS = {
        "streetlight": 50,      # Streetlights are precise
        "roads": 200,           # Roads can be longer
        "water": 150,           # Water issues affect areas
        "sanitation": 100,      # Garbage collection points
        "electricity": 150,     # Transformer coverage
        "drainage": 200,        # Drainage systems extend
        "public_property": 100, # Parks/benches are localized
        "other": 150            # Default
    }
    
    # Confidence Thresholds (Calibrated for Zero-Shot Models)
    # IMPROVED: Higher thresholds to reduce misclassification
    # Zero-shot models typically produce 0.30-0.70 confidence scores
    # These thresholds are based on empirical testing with BART-large-mnli
    MIN_CLASSIFICATION_CONFIDENCE = 0.50  # Minimum to accept AI classification (raised from 0.40)
    AUTO_ASSIGN_CONFIDENCE = 0.60  # Auto-assign to department (raised from 0.50)
    AUTO_ASSIGN_OFFICER_CONFIDENCE = 0.70  # Auto-assign to officer (raised from 0.60)
    HIGH_CONFIDENCE_THRESHOLD = 0.80  # Consider high confidence (raised from 0.70)
    
    # Confidence Calculation Weights (for weighted average)
    # Category is most important, severity less so, department routing is algorithmic
    CONFIDENCE_WEIGHTS = {
        "category": 0.50,    # 50% weight - most critical
        "severity": 0.30,    # 30% weight - important but subjective
        "department": 0.20   # 20% weight - mostly rule-based
    }
    
    # Status Transition Rules
    STATUS_TRANSITIONS = {
        "duplicate": "RECEIVED",           # Stays at RECEIVED, marked duplicate
        "classified": "CLASSIFIED",        # AI classified successfully
        "auto_assigned": "ASSIGNED_TO_OFFICER",  # Full auto-assignment
        "needs_review": "PENDING_CLASSIFICATION"  # Admin review required
    }
    
    # Processing Settings
    MAX_TEXT_LENGTH = 512
    BATCH_SIZE = 8
    ENABLE_DUPLICATE_DETECTION = False  # ⚠️ DISABLED - Enable when ready for production
    ENABLE_AUTO_ASSIGNMENT = True  # Enabled for automatic department assignment
    ENABLE_AUTO_OFFICER_ASSIGNMENT = True  # Enabled for automatic officer assignment
    OFFICER_ASSIGNMENT_STRATEGY = "balanced"  # Strategy: balanced, least_busy, round_robin
    
    @classmethod
    def get_category_labels(cls) -> List[str]:
        """Get zero-shot classification labels"""
        return [info["label"] for info in cls.CATEGORIES.values()]
    
    @classmethod
    def get_severity_labels(cls) -> List[str]:
        """Get severity labels for zero-shot"""
        return list(cls.SEVERITY_LABELS.values())
    
    @classmethod
    def map_category_label(cls, predicted_label: str) -> str:
        """Map predicted label back to ReportCategory enum"""
        for key, info in cls.CATEGORIES.items():
            if info["label"] == predicted_label:
                return key
        return "other"
    
    @classmethod
    def map_severity_label(cls, predicted_label: str) -> str:
        """Map predicted severity label back to ReportSeverity enum"""
        for key, label in cls.SEVERITY_LABELS.items():
            if label == predicted_label:
                return key
        return "medium"  # Safe default
    
    @classmethod
    def get_geo_radius_for_category(cls, category: str) -> int:
        """Get category-specific geo radius"""
        return cls.CATEGORY_GEO_RADIUS.get(category, 150)
    
    @classmethod
    def get_department_name_for_category(cls, category: str) -> str:
        """Get expected department name for category"""
        return cls.CATEGORIES.get(category, {}).get("department_name")
