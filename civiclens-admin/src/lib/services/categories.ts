// Categories Service for CivicLens - Matches Backend Enums
export interface Category {
  value: string;
  label: string;
  description: string;
  department: string;
  icon: string;
}

export interface Severity {
  value: string;
  label: string;
  description: string;
  color: string;
  priority: number;
}

// Categories matching backend ReportCategory enum
export const REPORT_CATEGORIES: Category[] = [
  {
    value: 'roads',
    label: 'Roads & Infrastructure',
    description: 'Potholes, road damage, traffic issues, road construction',
    department: 'Public Works Department',
    icon: '🛣️'
  },
  {
    value: 'water',
    label: 'Water Supply',
    description: 'Water shortage, pipe leaks, water quality issues',
    department: 'Water Supply Department',
    icon: '💧'
  },
  {
    value: 'sanitation',
    label: 'Sanitation & Waste Management',
    description: 'Garbage collection, waste disposal, cleanliness issues',
    department: 'Sanitation Department',
    icon: '🗑️'
  },
  {
    value: 'electricity',
    label: 'Electrical Issues',
    description: 'Power outages, electrical faults, transformer issues',
    department: 'Electrical Department',
    icon: '⚡'
  },
  {
    value: 'streetlight',
    label: 'Street Lighting',
    description: 'Non-functional street lights, inadequate lighting',
    department: 'Electrical Department',
    icon: '💡'
  },
  {
    value: 'drainage',
    label: 'Drainage Systems',
    description: 'Blocked drains, waterlogging, sewage overflow',
    department: 'Public Works Department',
    icon: '🌊'
  },
  {
    value: 'public_property',
    label: 'Public Property',
    description: 'Damage to public buildings, parks, facilities',
    department: 'Public Works Department',
    icon: '🏛️'
  },
  {
    value: 'other',
    label: 'Other Municipal Issues',
    description: 'Issues not covered by other categories',
    department: 'General Administration',
    icon: '📋'
  }
];

// Severity levels matching backend ReportSeverity enum
export const REPORT_SEVERITIES: Severity[] = [
  {
    value: 'low',
    label: 'Low Priority',
    description: 'Non-urgent issues that can be addressed in regular schedule',
    color: 'green',
    priority: 1
  },
  {
    value: 'medium',
    label: 'Medium Priority',
    description: 'Standard issues requiring normal response time',
    color: 'yellow',
    priority: 2
  },
  {
    value: 'high',
    label: 'High Priority',
    description: 'Important issues requiring prompt attention',
    color: 'orange',
    priority: 3
  },
  {
    value: 'critical',
    label: 'Critical',
    description: 'Emergency issues requiring immediate response',
    color: 'red',
    priority: 4
  }
];

// Utility functions
export const getCategoryByValue = (value: string): Category | undefined => {
  return REPORT_CATEGORIES.find(cat => cat.value === value);
};

export const getSeverityByValue = (value: string): Severity | undefined => {
  return REPORT_SEVERITIES.find(sev => sev.value === value);
};

export const getCategoriesByDepartment = (department: string): Category[] => {
  return REPORT_CATEGORIES.filter(cat => cat.department === department);
};

export const getSeverityColor = (severity: string): string => {
  const sev = getSeverityByValue(severity);
  return sev?.color || 'gray';
};

export const getSeverityPriority = (severity: string): number => {
  const sev = getSeverityByValue(severity);
  return sev?.priority || 0;
};

// Department mapping
export const DEPARTMENTS = [
  'Public Works Department',
  'Water Supply Department', 
  'Sanitation Department',
  'Electrical Department',
  'General Administration'
];

export const getDepartmentCategories = (department: string): Category[] => {
  return REPORT_CATEGORIES.filter(cat => cat.department === department);
};