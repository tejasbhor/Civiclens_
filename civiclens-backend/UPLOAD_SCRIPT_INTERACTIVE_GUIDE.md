# 🎯 Interactive Upload Script Guide

## Enhanced Features

The upload script is now **fully interactive** with prompts for:
1. ✅ User credentials (phone, email, password, name)
2. ✅ Upload mode (all complaints or only with images)
3. ✅ Number of complaints to upload (1-35)

---

## 🚀 How to Run

```powershell
cd D:\Civiclens\civiclens-backend
uv run python upload_test_complaints.py
```

---

## 📝 Interactive Prompts

### **STEP 1: User Credentials**

The script will ask for citizen account details:

```
Full Name [Mohan Vishwas]: 
Phone [+919021932646]: 
Email [mohan@gmail.com]: 
Password [MohanVishwas@9021]: 
```

**Tips:**
- Press **Enter** to use default values (shown in brackets)
- Or type your own values
- Default account will be created if it doesn't exist

---

### **STEP 2: Upload Mode**

Choose how to upload complaints:

```
Choose upload mode:
  1. Upload ALL complaints (with or without images)
  2. Upload ONLY complaints that have images

Enter choice [1/2] (default: 1): 
```

**Options:**
- **Option 1** - Uploads all complaints, creates reports even without images
- **Option 2** - Only uploads complaints that have images in test_images/ folder

---

### **STEP 3: Number of Complaints**

Choose how many complaints to upload:

```
Total complaints in JSON: 35
How many complaints do you want to upload?

Enter number (1-35) (default: 30): 
```

**Tips:**
- Enter any number from **1 to 35**
- Press **Enter** for default (30)
- Script will upload complaints from ID 1 to your chosen number

---

### **STEP 4: Confirmation**

Review your configuration and confirm:

```
📋 CONFIGURATION SUMMARY
======================================================================
Name:         Mohan Vishwas
Phone:        +919021932646
Email:        mohan@gmail.com
Password:     ****************
Upload Mode:  All complaints
Upload Limit: 1-30 complaints
======================================================================

Proceed with upload? [Y/n]: 
```

Press **Y** or **Enter** to proceed, **N** to cancel.

---

## 💡 Usage Examples

### **Example 1: Upload First 10 with Images Only**

```
Full Name [Mohan Vishwas]: <Enter>
Phone [+919021932646]: <Enter>
Email [mohan@gmail.com]: <Enter>
Password [MohanVishwas@9021]: <Enter>

Enter choice [1/2] (default: 1): 2
Enter number (1-35) (default: 30): 10

Proceed with upload? [Y/n]: y
```

**Result:** Uploads complaints 1-10 that have images only

---

### **Example 2: Upload All 35 Complaints**

```
Full Name [Mohan Vishwas]: <Enter>
Phone [+919021932646]: <Enter>
Email [mohan@gmail.com]: <Enter>
Password [MohanVishwas@9021]: <Enter>

Enter choice [1/2] (default: 1): 1
Enter number (1-35) (default: 30): 35

Proceed with upload? [Y/n]: y
```

**Result:** Uploads all 35 complaints, with or without images

---

### **Example 3: Use Different Account**

```
Full Name [Mohan Vishwas]: Rahul Sharma
Phone [+919021932646]: +919876543210
Email [mohan@gmail.com]: rahul@example.com
Password [MohanVishwas@9021]: SecurePass@123

Enter choice [1/2] (default: 1): 1
Enter number (1-35) (default: 30): 20

Proceed with upload? [Y/n]: y
```

**Result:** Creates new account "Rahul Sharma" and uploads 20 complaints

---

## 📊 Upload Modes Comparison

| Mode | What Gets Uploaded | Use Case |
|------|-------------------|----------|
| **Mode 1: All** | All complaints up to limit, regardless of images | Testing with partial images, seeding database |
| **Mode 2: Images Only** | Only complaints that have images | Demo with visuals, quality over quantity |

---

## 🎯 Common Scenarios

### **Scenario 1: Testing with Roads Images Only**
- Current: You have 4 road complaint images
- Choose: **Mode 2** (images only), **Limit 35**
- Result: Uploads 4 road complaints with images

### **Scenario 2: Full Database Seeding**
- Goal: Populate all test data
- Choose: **Mode 1** (all), **Limit 35**
- Result: Uploads all 35 complaints (4 with images, 31 without)

### **Scenario 3: Quick Demo (10 items)**
- Goal: Small demo dataset
- Choose: **Mode 1** (all), **Limit 10**
- Result: Uploads first 10 complaints

### **Scenario 4: Visual Demo Only**
- Goal: Only show complaints with photos
- Choose: **Mode 2** (images only), **Limit 35**
- Result: Uploads only complaints with images

---

## 🔧 Tips & Tricks

### **Quick Default Run:**
Just press Enter for all prompts:
```
<Enter>  # Use default name
<Enter>  # Use default phone
<Enter>  # Use default email
<Enter>  # Use default password
<Enter>  # Mode 1 (all)
<Enter>  # Limit 30
y        # Confirm
```

### **Cancel Anytime:**
- Press `Ctrl+C` to cancel at any prompt
- Answer `n` at confirmation to cancel

### **Multiple Runs:**
- Script can be run multiple times
- Each run will create duplicate reports
- Use different accounts or delete old reports via admin dashboard

---

## 📈 Expected Output

After configuration, you'll see:

```
============================================================================
🚀 CIVICLENS TEST COMPLAINTS UPLOADER
============================================================================
Citizen: Mohan Vishwas
Phone: +919021932646
Email: mohan@gmail.com
Upload Mode: All complaints
Upload Limit: 1-30
============================================================================

[Authentication...]
✅ Login successful! User ID: 28

[Loading...]
✅ Loaded 35 complaints from JSON
✅ Images directory found

[Uploading...]
[1/30] Processing: Big pothole on Palm Beach Road...
   📸 Found 3 image(s)
   ✅ Report created: CL-2025-RNC-00035 (ID: 35)
   📤 Uploading 3 image(s)...
   ...

[Summary...]
============================================================================
📊 UPLOAD SUMMARY
============================================================================
✅ Total Uploaded:     30 reports (1-30)
   📸 With images:     4 reports
   📷 Without images:  26 reports
❌ Failed:             0 reports
⏹️  Not uploaded:       5 reports (31-35)
📝 Total in JSON:      35 complaints
============================================================================

🎉 Success! Check your reports at:
   http://localhost:8080/citizen/reports
```

---

## 🐛 Troubleshooting

### **Error: "Authentication failed"**
- Check if backend is running
- Verify credentials are correct
- Try different phone number

### **No prompts appearing**
- Make sure you're running the script directly (not background)
- Check terminal supports interactive input

### **Script exits immediately**
- Answered `n` at confirmation
- Check for errors in configuration

---

## 🎉 Benefits

### **Before (Hardcoded):**
- ❌ Had to edit script to change settings
- ❌ One configuration only
- ❌ Had to remember defaults

### **After (Interactive):**
- ✅ Easy configuration via prompts
- ✅ Multiple configurations possible
- ✅ User-friendly with defaults
- ✅ Confirmation before upload
- ✅ Clear summary of what will happen

---

**Ready to use! Run the script and follow the prompts!** 🚀

```powershell
cd D:\Civiclens\civiclens-backend
uv run python upload_test_complaints.py
```
