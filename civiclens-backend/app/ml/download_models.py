"""
Download AI Models for CivicLens
One-time script to download required models
"""

import os
from transformers import pipeline
from sentence_transformers import SentenceTransformer

def download_models():
    """Download all required AI models"""
    
    # Create cache directory
    cache_dir = os.path.join(os.getcwd(), "models", "cache")
    os.makedirs(cache_dir, exist_ok=True)
    
    print("=" * 60)
    print("🤖 CivicLens AI Model Download")
    print("=" * 60)
    print("This will download ~1.6GB of models")
    print("Please ensure you have stable internet connection")
    print("=" * 60)
    
    try:
        # Download zero-shot classifier (~1.5GB)
        print("\n📥 Downloading Zero-Shot Classifier (BART)...")
        print("   Model: facebook/bart-large-mnli (~1.5GB)")
        pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=-1  # CPU
        )
        print("✅ Zero-shot classifier downloaded successfully")
        
        # Download sentence transformer (~80MB)
        print("\n📥 Downloading Sentence Transformer...")
        print("   Model: all-MiniLM-L6-v2 (~80MB)")
        SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Sentence transformer downloaded successfully")
        
        print("\n" + "=" * 60)
        print("🎉 All models downloaded successfully!")
        print("=" * 60)
        print("\nYou can now start the AI worker:")
        print("  python -m app.workers.ai_worker")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error downloading models: {str(e)}")
        print("Please check your internet connection and try again")
        raise


if __name__ == "__main__":
    download_models()
