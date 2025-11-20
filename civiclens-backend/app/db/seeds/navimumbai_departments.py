"""
Seed data for Navi Mumbai Municipal Corporation Departments
Based on official NMMC structure (Est. December 17, 1991)

Area: 146 sq km
Population: 1,200,000+ (approx)
Wards: 118 administrative wards
Zones: 2 (Vashi and CBD Belapur)
"""

# Navi Mumbai Municipal Corporation (NMMC) - 6 Core Departments
DEPARTMENTS = [
    {
        "name": "Public Works Department",
        "code": "PWD",
        "description": "Manages roads, bridges, footpaths, drainage, and civil infrastructure across Navi Mumbai",
        "keywords": "roads,potholes,bridges,footpaths,drainage,culverts,public buildings,civil construction,repairs,resurfacing,cracks,broken,damaged",
        "contact_email": "pwd@nmmc.gov.in",
        "contact_phone": "+91-22-27650451"
    },
    {
        "name": "Water Supply Department",
        "code": "WSD",
        "description": "Water supply, distribution, leakage repairs, quality management, and 24x7 emergency services",
        "keywords": "water,supply,leakage,pipeline,breaks,quality,tank,maintenance,distribution,shortage,contamination,pressure",
        "contact_email": "water@nmmc.gov.in",
        "contact_phone": "+91-22-27650452"
    },
    {
        "name": "Sanitation Department",
        "code": "SAN",
        "description": "Waste management, garbage collection, sanitation services, and public toilet maintenance",
        "keywords": "garbage,waste,sanitation,collection,dumping,toilet,cleaning,sweeping,disposal,hygiene,litter,trash",
        "contact_email": "sanitation@nmmc.gov.in",
        "contact_phone": "+91-22-27650453"
    },
    {
        "name": "Electrical Department",
        "code": "ELD",
        "description": "Streetlight maintenance, electrical infrastructure, and public lighting across all zones",
        "keywords": "streetlight,electricity,lighting,bulb,transformer,power,electrical,illumination,lamp,pole,wiring",
        "contact_email": "electrical@nmmc.gov.in",
        "contact_phone": "+91-22-27650454"
    },
    {
        "name": "Horticulture Department",
        "code": "HRT",
        "description": "Parks, gardens, trees, green space maintenance, and beautification projects",
        "keywords": "parks,gardens,trees,plants,green,horticulture,trimming,cutting,maintenance,beautification,landscaping",
        "contact_email": "horticulture@nmmc.gov.in",
        "contact_phone": "+91-22-27650455"
    },
    {
        "name": "Health & Medical Department",
        "code": "HMD",
        "description": "Public health services, medical facilities, disease control, and healthcare infrastructure management",
        "keywords": "health,medical,hospital,clinic,disease,vaccination,healthcare,ambulance,emergency,medical waste,public health,sanitary",
        "contact_email": "health@nmmc.gov.in",
        "contact_phone": "+91-22-27650456"
    }
]


# Sample Officers for each department
OFFICERS = [
    # Public Works Department (PWD) - 5 officers
    {
        "employee_id": "PWD-001",
        "full_name": "Rajesh Kumar Singh",
        "phone": "+919876543210",
        "email": "rajesh.kumar@nmmc.gov.in",
        "department_name": "Public Works Department",
        "role": "nodal_officer",
        "password": "Officer@123"  # Will be hashed
    },
    {
        "employee_id": "PWD-002",
        "full_name": "Amit Sharma",
        "phone": "+919876543211",
        "email": "amit.sharma@nmmc.gov.in",
        "department_name": "Public Works Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "PWD-003",
        "full_name": "Suresh Prasad",
        "phone": "+919876543212",
        "email": "suresh.prasad@nmmc.gov.in",
        "department_name": "Public Works Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "PWD-004",
        "full_name": "Deepak Kumar",
        "phone": "+919876543213",
        "email": "deepak.kumar@nmmc.gov.in",
        "department_name": "Public Works Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "PWD-005",
        "full_name": "Vikash Singh",
        "phone": "+919876543214",
        "email": "vikash.singh@nmmc.gov.in",
        "department_name": "Public Works Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    
    # Water Supply Department (WSD) - 4 officers
    {
        "employee_id": "WSD-001",
        "full_name": "Priya Singh",
        "phone": "+919876543215",
        "email": "priya.singh@nmmc.gov.in",
        "department_name": "Water Supply Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "WSD-002",
        "full_name": "Anil Kumar Verma",
        "phone": "+919876543216",
        "email": "anil.verma@nmmc.gov.in",
        "department_name": "Water Supply Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "WSD-003",
        "full_name": "Santosh Kumar",
        "phone": "+919876543217",
        "email": "santosh.kumar@nmmc.gov.in",
        "department_name": "Water Supply Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "WSD-004",
        "full_name": "Ravi Shankar",
        "phone": "+919876543218",
        "email": "ravi.shankar@nmmc.gov.in",
        "department_name": "Water Supply Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    
    # Sanitation Department (SD) - 5 officers
    {
        "employee_id": "SD-001",
        "full_name": "Ram Kumar Yadav",
        "phone": "+919876543219",
        "email": "ram.kumar@nmmc.gov.in",
        "department_name": "Sanitation Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "SD-002",
        "full_name": "Sunita Devi",
        "phone": "+919876543220",
        "email": "sunita.devi@nmmc.gov.in",
        "department_name": "Sanitation Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "SD-003",
        "full_name": "Manoj Kumar",
        "phone": "+919876543221",
        "email": "manoj.kumar@nmmc.gov.in",
        "department_name": "Sanitation Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "SD-004",
        "full_name": "Pankaj Singh",
        "phone": "+919876543222",
        "email": "pankaj.singh@nmmc.gov.in",
        "department_name": "Sanitation Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "SD-005",
        "full_name": "Anita Kumari",
        "phone": "+919876543223",
        "email": "anita.kumari@nmmc.gov.in",
        "department_name": "Sanitation Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    
    # Electrical Department (ED) - 3 officers
    {
        "employee_id": "ED-001",
        "full_name": "Rakesh Kumar",
        "phone": "+919876543224",
        "email": "rakesh.kumar@nmmc.gov.in",
        "department_name": "Electrical Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "ED-002",
        "full_name": "Sanjay Prasad",
        "phone": "+919876543225",
        "email": "sanjay.prasad@nmmc.gov.in",
        "department_name": "Electrical Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "ED-003",
        "full_name": "Dinesh Kumar",
        "phone": "+919876543226",
        "email": "dinesh.kumar@nmmc.gov.in",
        "department_name": "Electrical Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    
    # Horticulture Department (HD) - 3 officers
    {
        "employee_id": "HD-001",
        "full_name": "Ramesh Chandra",
        "phone": "+919876543227",
        "email": "ramesh.chandra@nmmc.gov.in",
        "department_name": "Horticulture Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "HD-002",
        "full_name": "Kavita Sharma",
        "phone": "+919876543228",
        "email": "kavita.sharma@nmmc.gov.in",
        "department_name": "Horticulture Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "HD-003",
        "full_name": "Ashok Kumar",
        "phone": "+919876543229",
        "email": "ashok.kumar@nmmc.gov.in",
        "department_name": "Horticulture Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    
    # Health & Medical Department (HMD) - 4 officers
    {
        "employee_id": "HMD-001",
        "full_name": "Dr. Priya Verma",
        "phone": "+919876543230",
        "email": "priya.verma@nmmc.gov.in",
        "department_name": "Health & Medical Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "HMD-002",
        "full_name": "Dr. Rajesh Gupta",
        "phone": "+919876543231",
        "email": "rajesh.gupta@nmmc.gov.in",
        "department_name": "Health & Medical Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "HMD-003",
        "full_name": "Nurse Sunita Singh",
        "phone": "+919876543232",
        "email": "sunita.singh@nmmc.gov.in",
        "department_name": "Health & Medical Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    },
    {
        "employee_id": "HMD-004",
        "full_name": "Dr. Amit Sinha",
        "phone": "+919876543233",
        "email": "amit.sinha@nmmc.gov.in",
        "department_name": "Health & Medical Department",
        "role": "nodal_officer",
        "password": "Officer@123"
    }
]
