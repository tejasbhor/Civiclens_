"""
Upload Test Complaints to CivicLens Backend
Creates citizen user and uploads complaints with images from test_ai_complaints.json
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional
import httpx

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"

# Default credentials (can be overridden via prompts)
DEFAULT_CITIZEN_PHONE = "+919021932646"
DEFAULT_CITIZEN_EMAIL = "mohan@gmail.com"
DEFAULT_CITIZEN_PASSWORD = "MohanVishwas@9021"
DEFAULT_CITIZEN_NAME = "Mohan Vishwas"

# Paths
SCRIPT_DIR = Path(__file__).parent
TEST_COMPLAINTS_FILE = SCRIPT_DIR / "test_ai_complaints.json"
TEST_IMAGES_DIR = SCRIPT_DIR / "test_images"


class ComplaintUploader:
    def __init__(self, phone: str, email: str, password: str, name: str, upload_mode: str, upload_limit: int):
        self.access_token: Optional[str] = None
        self.user_id: Optional[int] = None
        self.client = httpx.AsyncClient(timeout=30.0)
        self.phone = phone
        self.email = email
        self.password = password
        self.name = name
        self.upload_mode = upload_mode  # 'all' or 'images_only'
        self.upload_limit = upload_limit
        
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    async def create_or_login_user(self) -> bool:
        """Create user if doesn't exist, or login"""
        print("\n" + "=" * 70)
        print("STEP 1: User Authentication")
        print("=" * 70)
        
        # Try to login first
        print(f"\n🔐 Attempting login for: {self.phone}")
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/auth/login",
                json={
                    "phone": self.phone,
                    "password": self.password,
                    "portal_type": "citizen"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data["access_token"]
                self.user_id = data["user_id"]
                print(f"✅ Login successful! User ID: {self.user_id}")
                return True
                
        except Exception as e:
            print(f"⚠️  Login failed: {e}")
        
        # If login fails, try signup
        print(f"\n📝 Creating new user: {self.name}")
        try:
            response = await self.client.post(
                f"{API_BASE_URL}/auth/signup",
                json={
                    "phone": self.phone,
                    "email": self.email,
                    "full_name": self.name,
                    "password": self.password
                }
            )
            
            if response.status_code == 200:
                signup_data = response.json()
                print(f"✅ Signup successful! User created.")
                
                # Get OTP from response (if in dev mode)
                otp = signup_data.get("otp")
                if otp:
                    print(f"📱 OTP (dev mode): {otp}")
                    
                    # Verify phone with OTP
                    print(f"\n📱 Verifying phone with OTP...")
                    verify_response = await self.client.post(
                        f"{API_BASE_URL}/auth/verify-phone",
                        json={
                            "phone": self.phone,
                            "otp": otp
                        }
                    )
                    
                    if verify_response.status_code == 200:
                        auth_data = verify_response.json()
                        self.access_token = auth_data["access_token"]
                        self.user_id = auth_data["user_id"]
                        print(f"✅ Phone verified! User ID: {self.user_id}")
                        return True
                else:
                    print("⚠️  Manual OTP verification required")
                    print("   Please verify phone via SMS and then run login")
                    return False
                    
        except Exception as e:
            print(f"❌ Signup failed: {e}")
            if hasattr(e, 'response'):
                print(f"   Response: {e.response.text if hasattr(e.response, 'text') else e.response}")
            return False
        
        return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
    
    def check_images_exist(self, complaint_id: int, category: str) -> List[Path]:
        """Check if images exist for a complaint"""
        category_folder = TEST_IMAGES_DIR / category
        
        if not category_folder.exists():
            return []
        
        # Look for images with this complaint ID
        complaint_id_str = f"{complaint_id:02d}_"
        images = []
        
        for image_file in category_folder.glob("*.jpg"):
            if image_file.name.startswith(complaint_id_str):
                images.append(image_file)
        
        for image_file in category_folder.glob("*.png"):
            if image_file.name.startswith(complaint_id_str):
                images.append(image_file)
        
        return sorted(images)
    
    async def upload_report(self, complaint: Dict) -> Optional[int]:
        """Upload a single report"""
        complaint_id = complaint["id"]
        title = complaint["title"]
        category = complaint["expected_category"]
        
        # Check upload limit
        if complaint_id > self.upload_limit:
            return None
        
        # Check for images
        images = self.check_images_exist(complaint_id, category)
        
        # Skip if upload_mode is 'images_only' and no images
        if self.upload_mode == 'images_only' and not images:
            return None
        
        print(f"\n[{complaint_id}/{self.upload_limit}] Processing: {title[:60]}...")
        
        if images:
            print(f"   📸 Found {len(images)} image(s)")
        else:
            print(f"   📷 No images (will create report without images)")
        
        # Prepare report data
        report_data = {
            "title": complaint["title"],
            "description": complaint["description"],
            "category": complaint["expected_category"],
            "severity": complaint.get("expected_severity", "medium"),
            "latitude": complaint.get("latitude", 19.0728),
            "longitude": complaint.get("longitude", 73.0016),
            "address": complaint.get("address", "Navi Mumbai, Maharashtra"),
            "landmark": complaint.get("landmark", ""),
            "ward_number": complaint.get("ward_number", ""),
            "pincode": complaint.get("pincode", "400703"),
            "district": "Navi Mumbai",
            "state": "Maharashtra"
        }
        
        try:
            # Create report
            response = await self.client.post(
                f"{API_BASE_URL}/reports/",
                headers=self.get_auth_headers(),
                json=report_data
            )
            
            if response.status_code not in [200, 201]:
                print(f"   ❌ Failed to create report: {response.status_code}")
                print(f"      {response.text}")
                return None
            
            report = response.json()
            report_id = report["id"]
            report_number = report.get("report_number", "N/A")
            print(f"   ✅ Report created: {report_number} (ID: {report_id})")
            
            # Upload images if available
            if images:
                print(f"   📤 Uploading {len(images)} image(s)...")
                uploaded_count = 0
                
                for idx, image_path in enumerate(images, 1):
                    try:
                        # Read image file
                        with open(image_path, 'rb') as f:
                            files = {
                                'files': (image_path.name, f, 'image/jpeg')
                            }
                            
                            # Upload to bulk endpoint
                            upload_response = await self.client.post(
                                f"{API_BASE_URL}/media/upload/{report_id}/bulk",
                                headers={"Authorization": f"Bearer {self.access_token}"},
                                files=files
                            )
                            
                            if upload_response.status_code in [200, 201]:
                                uploaded_count += 1
                                print(f"      [{idx}/{len(images)}] ✅ {image_path.name}")
                            else:
                                print(f"      [{idx}/{len(images)}] ❌ {image_path.name} - {upload_response.status_code}")
                                
                    except Exception as e:
                        print(f"      [{idx}/{len(images)}] ❌ {image_path.name} - Error: {e}")
                
                print(f"   📊 Uploaded {uploaded_count}/{len(images)} images successfully")
            else:
                print(f"   ℹ️  No images to upload")
            
            return report_id
            
        except Exception as e:
            print(f"   ❌ Error uploading report: {e}")
            return None
    
    async def run(self):
        """Main execution"""
        print("\n" + "=" * 70)
        print("🚀 CIVICLENS TEST COMPLAINTS UPLOADER")
        print("=" * 70)
        print(f"Citizen: {self.name}")
        print(f"Phone: {self.phone}")
        print(f"Email: {self.email}")
        print(f"Upload Mode: {'Only with images' if self.upload_mode == 'images_only' else 'All complaints'}")
        print(f"Upload Limit: 1-{self.upload_limit}")
        print("=" * 70)
        
        # Step 1: Authenticate
        if not await self.create_or_login_user():
            print("\n❌ Authentication failed. Exiting.")
            return
        
        # Step 2: Load test complaints
        print("\n" + "=" * 70)
        print("STEP 2: Loading Test Complaints")
        print("=" * 70)
        
        if not TEST_COMPLAINTS_FILE.exists():
            print(f"❌ File not found: {TEST_COMPLAINTS_FILE}")
            return
        
        with open(TEST_COMPLAINTS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        complaints = data.get("test_complaints", [])
        print(f"✅ Loaded {len(complaints)} complaints from JSON")
        
        # Step 3: Check test_images directory
        if not TEST_IMAGES_DIR.exists():
            print(f"\n❌ Images directory not found: {TEST_IMAGES_DIR}")
            print("   Please create test_images/ folder and add images first.")
            return
        
        print(f"✅ Images directory found: {TEST_IMAGES_DIR}")
        
        # Step 4: Upload reports
        print("\n" + "=" * 70)
        mode_text = "Only with Images" if self.upload_mode == 'images_only' else "With or Without Images"
        print(f"STEP 3: Uploading Reports (1-{self.upload_limit}) - {mode_text}")
        print("=" * 70)
        
        uploaded = 0
        with_images = 0
        without_images = 0
        skipped = 0
        failed = 0
        
        for complaint in complaints:
            result = await self.upload_report(complaint)
            
            if result:
                uploaded += 1
                # Check if it had images
                if self.check_images_exist(complaint["id"], complaint["expected_category"]):
                    with_images += 1
                else:
                    without_images += 1
            elif result is None:
                # Check if skipped due to mode or limit
                if complaint["id"] <= self.upload_limit:
                    if self.upload_mode == 'images_only' and not self.check_images_exist(complaint["id"], complaint["expected_category"]):
                        skipped += 1
                    else:
                        failed += 1
            
            # Small delay between uploads
            await asyncio.sleep(0.5)
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 UPLOAD SUMMARY")
        print("=" * 70)
        print(f"✅ Total Uploaded:     {uploaded} reports (1-{self.upload_limit})")
        print(f"   📸 With images:     {with_images} reports")
        print(f"   📷 Without images:  {without_images} reports")
        if skipped > 0:
            print(f"⏭️  Skipped:            {skipped} reports (no images in 'images_only' mode)")
        print(f"❌ Failed:             {failed} reports")
        remaining = len(complaints) - self.upload_limit
        if remaining > 0:
            print(f"⏹️  Not uploaded:       {remaining} reports ({self.upload_limit + 1}-{len(complaints)})")
        print(f"📝 Total in JSON:      {len(complaints)} complaints")
        print("=" * 70)
        
        if uploaded > 0:
            print("\n🎉 Success! Check your reports at:")
            print(f"   http://localhost:8080/citizen/reports")
            print(f"\n   Login with:")
            print(f"   Phone: {self.phone}")
            print(f"   Password: {self.password}")
        
        print()


def get_user_input() -> tuple:
    """Get user inputs interactively"""
    print("\n" + "=" * 70)
    print("🔧 CIVICLENS UPLOAD CONFIGURATION")
    print("=" * 70)
    
    # User credentials
    print("\n📝 STEP 1: User Credentials")
    print("-" * 70)
    print(f"Press Enter to use default values shown in [brackets]")
    print()
    
    name = input(f"Full Name [{DEFAULT_CITIZEN_NAME}]: ").strip()
    if not name:
        name = DEFAULT_CITIZEN_NAME
    
    phone = input(f"Phone [{DEFAULT_CITIZEN_PHONE}]: ").strip()
    if not phone:
        phone = DEFAULT_CITIZEN_PHONE
    
    email = input(f"Email [{DEFAULT_CITIZEN_EMAIL}]: ").strip()
    if not email:
        email = DEFAULT_CITIZEN_EMAIL
    
    password = input(f"Password [{DEFAULT_CITIZEN_PASSWORD}]: ").strip()
    if not password:
        password = DEFAULT_CITIZEN_PASSWORD
    
    # Upload mode
    print("\n📤 STEP 2: Upload Mode")
    print("-" * 70)
    print("Choose upload mode:")
    print("  1. Upload ALL complaints (with or without images)")
    print("  2. Upload ONLY complaints that have images")
    print()
    
    while True:
        mode_choice = input("Enter choice [1/2] (default: 1): ").strip()
        if not mode_choice:
            mode_choice = "1"
        
        if mode_choice in ["1", "2"]:
            upload_mode = "all" if mode_choice == "1" else "images_only"
            break
        else:
            print("❌ Invalid choice. Please enter 1 or 2.")
    
    # Upload limit
    print("\n🔢 STEP 3: Number of Complaints")
    print("-" * 70)
    print("Total complaints in JSON: 35")
    print("How many complaints do you want to upload?")
    print()
    
    while True:
        limit_input = input("Enter number (1-35) (default: 30): ").strip()
        if not limit_input:
            upload_limit = 30
            break
        
        try:
            upload_limit = int(limit_input)
            if 1 <= upload_limit <= 35:
                break
            else:
                print("❌ Please enter a number between 1 and 35.")
        except ValueError:
            print("❌ Invalid input. Please enter a number.")
    
    # Confirmation
    print("\n" + "=" * 70)
    print("📋 CONFIGURATION SUMMARY")
    print("=" * 70)
    print(f"Name:         {name}")
    print(f"Phone:        {phone}")
    print(f"Email:        {email}")
    print(f"Password:     {'*' * len(password)}")
    print(f"Upload Mode:  {'All complaints' if upload_mode == 'all' else 'Only with images'}")
    print(f"Upload Limit: 1-{upload_limit} complaints")
    print("=" * 70)
    
    confirm = input("\nProceed with upload? [Y/n]: ").strip().lower()
    if confirm and confirm != 'y':
        print("\n❌ Upload cancelled")
        sys.exit(0)
    
    return name, phone, email, password, upload_mode, upload_limit


async def main():
    """Main entry point"""
    # Get user inputs
    name, phone, email, password, upload_mode, upload_limit = get_user_input()
    
    # Create uploader with user inputs
    uploader = ComplaintUploader(phone, email, password, name, upload_mode, upload_limit)
    try:
        await uploader.run()
    finally:
        await uploader.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Upload cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
