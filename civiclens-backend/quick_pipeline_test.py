"""
Quick Pipeline Test - Create and process a single report
"""

import asyncio
from datetime import datetime
from app.core.database import AsyncSessionLocal
from app.models.report import Report, ReportStatus
from app.services.ai_pipeline_service import AIProcessingPipeline

async def test_pipeline():
    print("\n" + "=" * 60)
    print("🧪 QUICK AI PIPELINE TEST")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Create test report
        print("\n1️⃣ Creating test report...")
        report = Report(
            title="Severe pothole on Main Street causing accidents",
            description="There is a large dangerous pothole on Main Street near the hospital. Multiple vehicles have been damaged and it's causing traffic issues. Needs urgent repair.",
            latitude=23.3500,
            longitude=85.3200,
            category="roads",
            severity="high",
            status=ReportStatus.RECEIVED,
            user_id=1,
            address="Main Street, Near Hospital, Navi Mumbai",
            pincode="834001",
            ward_number="15",
            district="Navi Mumbai",
            state="Jharkhand"
        )
        
        db.add(report)
        await db.commit()
        await db.refresh(report)
        
        print(f"   ✅ Report created: ID={report.id}")
        print(f"   📍 Location: ({report.latitude}, {report.longitude})")
        print(f"   📝 Title: {report.title}")
        
        # Process through AI pipeline
        print("\n2️⃣ Processing through AI pipeline...")
        pipeline = AIProcessingPipeline(db)
        
        start_time = datetime.utcnow()
        result = await pipeline.process_report(report.id)
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        
        print(f"   ⏱️  Processing time: {processing_time:.2f}s")
        print(f"   📊 Status: {result['status']}")
        
        if result.get('stages'):
            print("\n3️⃣ Pipeline Stages:")
            for stage_name, stage_data in result['stages'].items():
                if isinstance(stage_data, dict):
                    if 'category' in stage_data:
                        print(f"   • {stage_name}: {stage_data['category']} ({stage_data.get('confidence', 0):.1%})")
                    elif 'severity' in stage_data:
                        print(f"   • {stage_name}: {stage_data['severity']} ({stage_data.get('confidence', 0):.1%})")
                    elif 'department_name' in stage_data:
                        print(f"   • {stage_name}: {stage_data['department_name']}")
        
        # Refresh report from database
        print("\n4️⃣ Checking database state...")
        from sqlalchemy import select
        result_query = await db.execute(select(Report).where(Report.id == report.id))
        updated_report = result_query.scalar_one()
        
        print(f"   📋 Status: {updated_report.status.value}")
        print(f"   🏢 Department ID: {updated_report.department_id}")
        print(f"   🤖 AI Processed: {'✅ Yes' if updated_report.ai_processed_at else '❌ No'}")
        print(f"   📊 AI Confidence: {updated_report.ai_confidence:.1%}" if updated_report.ai_confidence else "   📊 AI Confidence: ❌ Not set")
        print(f"   🏷️  AI Category: {updated_report.ai_category or '❌ Not set'}")
        print(f"   ⚠️  Needs Review: {'Yes' if updated_report.needs_review else 'No'}")
        
        # Final verdict
        print("\n" + "=" * 60)
        success = (
            updated_report.ai_processed_at is not None and
            updated_report.ai_confidence is not None and
            updated_report.ai_category is not None
        )
        
        if success:
            print("✅ TEST PASSED!")
            print("   • Report was processed by AI")
            print("   • Database fields are set correctly")
            print("   • Pipeline is working properly")
        else:
            print("❌ TEST FAILED!")
            if not updated_report.ai_processed_at:
                print("   • ai_processed_at is NULL")
            if not updated_report.ai_confidence:
                print("   • ai_confidence is NULL")
            if not updated_report.ai_category:
                print("   • ai_category is NULL")
            print("\n   💡 Database commits may be failing")
        
        print("=" * 60)
        
        return success

if __name__ == "__main__":
    print("\n🚀 Starting quick pipeline test...")
    try:
        success = asyncio.run(test_pipeline())
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
