"""
AI Configuration - Mapped to CivicLens Backend Schema
Customized for Ranchi Municipal Corporation
"""

import os
from typing import Dict, List


class AIConfig:
    """AI Configuration matching your existing enums and departments"""
    
    # Model Configuration
    ZERO_SHOT_MODEL = "facebook/bart-large-mnli"
    SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
    MODEL_CACHE_DIR = os.path.join(os.getcwd(), "models", "cache")
    AI_MODEL_VERSION = "v1.0.0-civiclens-ranchi"
    
    # Category Mapping (Matches your ReportCategory enum exactly)
    CATEGORIES = {
        "roads": {
            "label": "roads potholes and infrastructure damage",
            "keywords": ["pothole", "road", "street", "highway", "pavement", 
                        "asphalt", "crack", "footpath", "bridge", "broken road"],
            "department_name": "Public Works Department"
        },
        "water": {
            "label": "water supply distribution and leakage issues",
            "keywords": ["water", "pipe", "leak", "burst", "supply", "tap", 
                        "pipeline", "drinking water", "pressure", "shortage", "no water"],
            "department_name": "Water Supply Department"
        },
        "sanitation": {
            "label": "garbage collection and sanitation waste management",
            "keywords": ["garbage", "waste", "trash", "dump", "collection", 
                        "bin", "litter", "sweeping", "sanitation", "hygiene", "dirty"],
            "department_name": "Sanitation Department"
        },
        "electricity": {
            "label": "electrical infrastructure and power supply problems",
            "keywords": ["electricity", "power", "outage", "transformer", 
                        "wire", "electric pole", "connection", "meter", "no power"],
            "department_name": "Electrical Department"
        },
        "streetlight": {
            "label": "street lighting and lamp maintenance issues",
            "keywords": ["streetlight", "street light", "lamp", "light pole", 
                        "bulb", "dark", "illumination", "night", "not working"],
            "department_name": "Electrical Department"  # Maps to same dept
        },
        "drainage": {
            "label": "drainage sewage and water overflow problems",
            "keywords": ["drainage", "drain", "sewer", "clog", "overflow", 
                        "flood", "rainwater", "gutter", "manhole", "blockage", "waterlogging"],
            "department_name": "Public Works Department"
        },
        "public_property": {
            "label": "public property parks and infrastructure damage",
            "keywords": ["park", "garden", "bench", "playground", "fence", 
                        "wall", "public property", "vandalism", "tree", "broken"],
            "department_name": "Horticulture Department"
        },
        "other": {
            "label": "other miscellaneous civic issues",
            "keywords": ["other", "miscellaneous", "general"],
            "department_name": None  # Admin decides
        }
    }
    
    # Severity Mapping (Matches your ReportSeverity enum exactly)
    SEVERITY_LABELS = {
        "critical": "critical emergency requiring immediate life safety attention",
        "high": "high priority urgent problem requiring prompt action",
        "medium": "medium priority issue requiring routine maintenance",
        "low": "low priority minor issue for scheduled maintenance"
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
    # Zero-shot models typically produce 0.30-0.70 confidence scores
    # These thresholds are based on empirical testing with BART-large-mnli
    MIN_CLASSIFICATION_CONFIDENCE = 0.40  # Minimum to accept AI classification
    AUTO_ASSIGN_CONFIDENCE = 0.50  # Auto-assign to department (was 0.80, too high)
    AUTO_ASSIGN_OFFICER_CONFIDENCE = 0.60  # Auto-assign to officer (was 0.85, too high)
    HIGH_CONFIDENCE_THRESHOLD = 0.70  # Consider high confidence (was 0.85)
    
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
        """Map predicted label back to ReportSeverity enum"""
        for key, label in cls.SEVERITY_LABELS.items():
            if label == predicted_label:
                return key
        return "medium"
    
    @classmethod
    def get_geo_radius_for_category(cls, category: str) -> int:
        """Get category-specific geo radius"""
        return cls.CATEGORY_GEO_RADIUS.get(category, 150)
    
    @classmethod
    def get_department_name_for_category(cls, category: str) -> str:
        """Get expected department name for category"""
        return cls.CATEGORIES.get(category, {}).get("department_name")
