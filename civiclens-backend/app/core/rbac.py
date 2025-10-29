"""
🔐 Role-Based Access Control (RBAC) System
Hierarchical 7-Level Permission System for CivicLens

ROLE HIERARCHY:
    LEVEL 7: SUPER_ADMIN (System Owner)
    LEVEL 6: ADMIN (Municipal Manager)
    LEVEL 5: AUDITOR (Government Oversight)
    LEVEL 4: NODAL_OFFICER (Field Worker)
    LEVEL 3: MODERATOR (Community Curator)
    LEVEL 2: CONTRIBUTOR (Trusted Citizen)
    LEVEL 1: CITIZEN (Base User)
"""

from enum import Enum
from typing import List, Set, Optional
from app.models.user import UserRole


# ============================================================================
# ROLE LEVELS - Higher number = More privileges
# ============================================================================

ROLE_LEVELS = {
    UserRole.CITIZEN: 1,
    UserRole.CONTRIBUTOR: 2,
    UserRole.MODERATOR: 3,
    UserRole.NODAL_OFFICER: 4,
    UserRole.AUDITOR: 5,
    UserRole.ADMIN: 6,
    UserRole.SUPER_ADMIN: 7,
}


# ============================================================================
# PERMISSIONS ENUM
# ============================================================================

class Permission(str, Enum):
    """Granular permissions for the system"""
    
    # ========== Report Permissions ==========
    CREATE_REPORT = "create:report"
    READ_REPORT = "read:report"
    UPDATE_OWN_REPORT = "update:own_report"
    UPDATE_OWN_REPORT_24H = "update:own_report_24h"  # Time-limited update
    UPDATE_ANY_REPORT = "update:any_report"
    DELETE_OWN_REPORT = "delete:own_report"
    DELETE_OWN_REPORT_IF_RECEIVED = "delete:own_report_if_received"  # Status-based delete
    DELETE_ANY_REPORT = "delete:any_report"
    VALIDATE_REPORT = "validate:report"
    CLASSIFY_REPORT = "classify:report"
    VIEW_NEARBY_REPORTS = "view:nearby_reports"
    RATE_RESOLUTION = "rate:resolution"
    TRACK_REPORT_STATUS = "track:report_status"
    
    # ========== Validation Permissions ==========
    VALIDATION_WEIGHT_1X = "validation:weight_1x"  # Citizen
    VALIDATION_WEIGHT_2X = "validation:weight_2x"  # Contributor
    VALIDATION_WEIGHT_3X = "validation:weight_3x"  # Moderator
    ADD_VALIDATION_COMMENT = "add:validation_comment"
    OVERRIDE_VALIDATION = "override:validation"
    ACCESS_VALIDATION_QUEUE = "access:validation_queue"
    
    # ========== Moderation Permissions ==========
    MODERATE_CONTENT = "moderate:content"
    FLAG_SPAM = "flag:spam"
    MERGE_DUPLICATE_REPORTS = "merge:duplicate_reports"
    EDIT_REPORT_CATEGORY = "edit:report_category"
    RESOLVE_DISPUTES = "resolve:disputes"
    BAN_USER = "ban:user"
    UNBAN_USER = "unban:user"
    SUSPEND_USER = "suspend:user"
    REVIEW_FLAGS = "review:flags"
    
    # ========== Task Permissions ==========
    CREATE_TASK = "create:task"
    READ_TASK = "read:task"
    UPDATE_TASK = "update:task"
    ASSIGN_TASK = "assign:task"
    ACKNOWLEDGE_TASK = "acknowledge:task"
    COMPLETE_TASK = "complete:task"
    DELETE_TASK = "delete:task"
    APPROVE_TASK_COMPLETION = "approve:task_completion"
    GPS_CHECKIN = "gps:checkin"
    UPLOAD_TASK_PHOTOS = "upload:task_photos"
    COMPLETE_TASK_CHECKLIST = "complete:task_checklist"
    SUBMIT_COMPLETION_REPORT = "submit:completion_report"
    
    # ========== User Permissions ==========
    READ_USER = "read:user"
    READ_ALL_USERS = "read:all_users"
    UPDATE_OWN_PROFILE = "update:own_profile"
    UPDATE_ANY_PROFILE = "update:any_profile"
    DELETE_USER = "delete:user"
    PERMANENT_DELETE_USER = "permanent:delete_user"
    IMPERSONATE_USER = "impersonate:user"
    FORCE_LOGOUT_USER = "force:logout_user"
    RESET_USER_PASSWORD = "reset:user_password"
    
    # ========== Role Permissions ==========
    PROMOTE_TO_CONTRIBUTOR = "promote:contributor"
    ASSIGN_MODERATOR = "assign:moderator"
    ASSIGN_OFFICER = "assign:officer"
    ASSIGN_ADMIN = "assign:admin"
    ASSIGN_AUDITOR = "assign:auditor"
    ASSIGN_SUPER_ADMIN = "assign:super_admin"
    CHANGE_ANY_ROLE = "change:any_role"
    
    # ========== Department Permissions ==========
    CREATE_DEPARTMENT = "create:department"
    UPDATE_DEPARTMENT = "update:department"
    DELETE_DEPARTMENT = "delete:department"
    ASSIGN_DEPARTMENT = "assign:department"
    VIEW_DEPARTMENT_DATA = "view:department_data"
    
    # ========== Analytics Permissions ==========
    VIEW_BASIC_ANALYTICS = "view:basic_analytics"
    VIEW_PERSONAL_ANALYTICS = "view:personal_analytics"
    VIEW_AREA_ANALYTICS = "view:area_analytics"
    VIEW_DEPARTMENT_ANALYTICS = "view:department_analytics"
    VIEW_SYSTEM_ANALYTICS = "view:system_analytics"
    VIEW_LEADERBOARD = "view:leaderboard"
    EXPORT_DATA = "export:data"
    GENERATE_COMPLIANCE_REPORT = "generate:compliance_report"
    
    # ========== System Permissions ==========
    MANAGE_SETTINGS = "manage:settings"
    CONFIGURE_SYSTEM_SETTINGS = "configure:system_settings"
    MODIFY_SECURITY_POLICIES = "modify:security_policies"
    CONFIGURE_AI_PARAMETERS = "configure:ai_parameters"
    SET_FEATURE_FLAGS = "set:feature_flags"
    VIEW_AUDIT_LOGS = "view:audit_logs"
    VIEW_IMMUTABLE_AUDIT_LOGS = "view:immutable_audit_logs"
    MANAGE_INTEGRATIONS = "manage:integrations"
    MANAGE_DATABASE_BACKUPS = "manage:database_backups"
    EMERGENCY_DATABASE_ACCESS = "emergency:database_access"
    VIEW_SERVER_HEALTH = "view:server_health"
    DISASTER_RECOVERY = "disaster:recovery"
    BLOCKCHAIN_AUDIT_VERIFICATION = "blockchain:audit_verification"
    SYSTEM_ADMIN = "system:admin"


# ============================================================================
# ROLE PERMISSIONS MAPPING
# ============================================================================

ROLE_PERMISSIONS: dict[UserRole, Set[Permission]] = {
    
    # LEVEL 1: CITIZEN (Base User)
    UserRole.CITIZEN: {
        Permission.CREATE_REPORT,
        Permission.READ_REPORT,
        Permission.UPDATE_OWN_REPORT,
        Permission.UPDATE_OWN_REPORT_24H,
        Permission.DELETE_OWN_REPORT,
        Permission.DELETE_OWN_REPORT_IF_RECEIVED,
        Permission.UPDATE_OWN_PROFILE,
        Permission.READ_USER,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_NEARBY_REPORTS,
        Permission.RATE_RESOLUTION,
        Permission.TRACK_REPORT_STATUS,
        Permission.VALIDATION_WEIGHT_1X,
    },
    
    # LEVEL 2: CONTRIBUTOR (Trusted Citizen)
    UserRole.CONTRIBUTOR: {
        # Inherits all CITIZEN permissions
        Permission.CREATE_REPORT,
        Permission.READ_REPORT,
        Permission.UPDATE_OWN_REPORT,
        Permission.UPDATE_OWN_REPORT_24H,
        Permission.DELETE_OWN_REPORT,
        Permission.DELETE_OWN_REPORT_IF_RECEIVED,
        Permission.UPDATE_OWN_PROFILE,
        Permission.READ_USER,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_NEARBY_REPORTS,
        Permission.RATE_RESOLUTION,
        Permission.TRACK_REPORT_STATUS,
        # Additional permissions
        Permission.VALIDATE_REPORT,
        Permission.CLASSIFY_REPORT,
        Permission.VALIDATION_WEIGHT_2X,
        Permission.ACCESS_VALIDATION_QUEUE,
        Permission.ADD_VALIDATION_COMMENT,
        Permission.VIEW_PERSONAL_ANALYTICS,
        Permission.VIEW_LEADERBOARD,
    },
    
    # LEVEL 3: MODERATOR (Community Curator)
    UserRole.MODERATOR: {
        # Inherits all CONTRIBUTOR permissions
        Permission.CREATE_REPORT,
        Permission.READ_REPORT,
        Permission.UPDATE_OWN_REPORT,
        Permission.UPDATE_OWN_REPORT_24H,
        Permission.DELETE_OWN_REPORT,
        Permission.DELETE_OWN_REPORT_IF_RECEIVED,
        Permission.UPDATE_OWN_PROFILE,
        Permission.READ_USER,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_NEARBY_REPORTS,
        Permission.RATE_RESOLUTION,
        Permission.TRACK_REPORT_STATUS,
        Permission.VALIDATE_REPORT,
        Permission.CLASSIFY_REPORT,
        Permission.ACCESS_VALIDATION_QUEUE,
        Permission.ADD_VALIDATION_COMMENT,
        Permission.VIEW_PERSONAL_ANALYTICS,
        Permission.VIEW_LEADERBOARD,
        # Additional permissions
        Permission.UPDATE_ANY_REPORT,
        Permission.MODERATE_CONTENT,
        Permission.FLAG_SPAM,
        Permission.MERGE_DUPLICATE_REPORTS,
        Permission.EDIT_REPORT_CATEGORY,
        Permission.RESOLVE_DISPUTES,
        Permission.OVERRIDE_VALIDATION,
        Permission.REVIEW_FLAGS,
        Permission.READ_ALL_USERS,
        Permission.BAN_USER,
        Permission.UNBAN_USER,
        Permission.SUSPEND_USER,
        Permission.VALIDATION_WEIGHT_3X,
        Permission.VIEW_AREA_ANALYTICS,
    },
    
    # LEVEL 4: NODAL OFFICER (Field Worker)
    UserRole.NODAL_OFFICER: {
        # Inherits all MODERATOR permissions
        Permission.CREATE_REPORT,
        Permission.READ_REPORT,
        Permission.UPDATE_OWN_REPORT,
        Permission.UPDATE_OWN_REPORT_24H,
        Permission.UPDATE_ANY_REPORT,
        Permission.DELETE_OWN_REPORT,
        Permission.DELETE_OWN_REPORT_IF_RECEIVED,
        Permission.UPDATE_OWN_PROFILE,
        Permission.READ_USER,
        Permission.READ_ALL_USERS,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_NEARBY_REPORTS,
        Permission.VALIDATE_REPORT,
        Permission.CLASSIFY_REPORT,
        Permission.MODERATE_CONTENT,
        Permission.FLAG_SPAM,
        Permission.REVIEW_FLAGS,
        Permission.BAN_USER,
        Permission.UNBAN_USER,
        Permission.VIEW_PERSONAL_ANALYTICS,
        Permission.VIEW_AREA_ANALYTICS,
        # Additional permissions
        Permission.CREATE_TASK,
        Permission.READ_TASK,
        Permission.UPDATE_TASK,
        Permission.ACKNOWLEDGE_TASK,
        Permission.COMPLETE_TASK,
        Permission.GPS_CHECKIN,
        Permission.UPLOAD_TASK_PHOTOS,
        Permission.COMPLETE_TASK_CHECKLIST,
        Permission.SUBMIT_COMPLETION_REPORT,
        Permission.VIEW_DEPARTMENT_ANALYTICS,
        Permission.VIEW_DEPARTMENT_DATA,
        Permission.ASSIGN_DEPARTMENT,
    },
    
    # LEVEL 5: AUDITOR (Government Oversight)
    UserRole.AUDITOR: {
        # READ-ONLY access to everything
        Permission.READ_REPORT,
        Permission.READ_TASK,
        Permission.READ_USER,
        Permission.READ_ALL_USERS,
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_PERSONAL_ANALYTICS,
        Permission.VIEW_AREA_ANALYTICS,
        Permission.VIEW_DEPARTMENT_ANALYTICS,
        Permission.VIEW_SYSTEM_ANALYTICS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.VIEW_IMMUTABLE_AUDIT_LOGS,
        Permission.VIEW_DEPARTMENT_DATA,
        Permission.EXPORT_DATA,
        Permission.GENERATE_COMPLIANCE_REPORT,
        # NO write permissions
    },
    
    # LEVEL 6: ADMIN (Municipal Manager)
    UserRole.ADMIN: {
        # ALL permissions except SUPER_ADMIN exclusive ones
        Permission.CREATE_REPORT,
        Permission.READ_REPORT,
        Permission.UPDATE_OWN_REPORT,
        Permission.UPDATE_OWN_REPORT_24H,
        Permission.UPDATE_ANY_REPORT,
        Permission.DELETE_OWN_REPORT,
        Permission.DELETE_OWN_REPORT_IF_RECEIVED,
        Permission.DELETE_ANY_REPORT,
        Permission.VALIDATE_REPORT,
        Permission.CLASSIFY_REPORT,
        Permission.VIEW_NEARBY_REPORTS,
        Permission.RATE_RESOLUTION,
        Permission.TRACK_REPORT_STATUS,
        Permission.ACCESS_VALIDATION_QUEUE,
        Permission.ADD_VALIDATION_COMMENT,
        Permission.OVERRIDE_VALIDATION,
        
        Permission.CREATE_TASK,
        Permission.READ_TASK,
        Permission.UPDATE_TASK,
        Permission.ASSIGN_TASK,
        Permission.ACKNOWLEDGE_TASK,
        Permission.COMPLETE_TASK,
        Permission.DELETE_TASK,
        Permission.APPROVE_TASK_COMPLETION,
        Permission.GPS_CHECKIN,
        Permission.UPLOAD_TASK_PHOTOS,
        
        Permission.READ_USER,
        Permission.READ_ALL_USERS,
        Permission.UPDATE_OWN_PROFILE,
        Permission.UPDATE_ANY_PROFILE,
        Permission.DELETE_USER,
        Permission.RESET_USER_PASSWORD,
        
        Permission.PROMOTE_TO_CONTRIBUTOR,
        Permission.ASSIGN_MODERATOR,
        Permission.ASSIGN_OFFICER,
        Permission.CHANGE_ANY_ROLE,
        
        Permission.CREATE_DEPARTMENT,
        Permission.UPDATE_DEPARTMENT,
        Permission.DELETE_DEPARTMENT,
        Permission.ASSIGN_DEPARTMENT,
        Permission.VIEW_DEPARTMENT_DATA,
        
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_PERSONAL_ANALYTICS,
        Permission.VIEW_AREA_ANALYTICS,
        Permission.VIEW_DEPARTMENT_ANALYTICS,
        Permission.VIEW_SYSTEM_ANALYTICS,
        Permission.VIEW_LEADERBOARD,
        Permission.EXPORT_DATA,
        
        Permission.MODERATE_CONTENT,
        Permission.FLAG_SPAM,
        Permission.MERGE_DUPLICATE_REPORTS,
        Permission.EDIT_REPORT_CATEGORY,
        Permission.RESOLVE_DISPUTES,
        Permission.BAN_USER,
        Permission.UNBAN_USER,
        Permission.SUSPEND_USER,
        Permission.REVIEW_FLAGS,
        
        Permission.MANAGE_SETTINGS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.MANAGE_INTEGRATIONS,
        # Cannot: Create admin/auditor, system settings, impersonate, etc.
    },
    
    # LEVEL 7: SUPER_ADMIN (System Owner)
    UserRole.SUPER_ADMIN: {
        # ALL permissions including SUPER_ADMIN exclusive ones
        # Inherits ALL ADMIN permissions
        Permission.CREATE_REPORT,
        Permission.READ_REPORT,
        Permission.UPDATE_OWN_REPORT,
        Permission.UPDATE_OWN_REPORT_24H,
        Permission.UPDATE_ANY_REPORT,
        Permission.DELETE_OWN_REPORT,
        Permission.DELETE_OWN_REPORT_IF_RECEIVED,
        Permission.DELETE_ANY_REPORT,
        Permission.VALIDATE_REPORT,
        Permission.CLASSIFY_REPORT,
        Permission.VIEW_NEARBY_REPORTS,
        Permission.RATE_RESOLUTION,
        Permission.TRACK_REPORT_STATUS,
        Permission.ACCESS_VALIDATION_QUEUE,
        Permission.ADD_VALIDATION_COMMENT,
        Permission.OVERRIDE_VALIDATION,
        
        Permission.CREATE_TASK,
        Permission.READ_TASK,
        Permission.UPDATE_TASK,
        Permission.ASSIGN_TASK,
        Permission.ACKNOWLEDGE_TASK,
        Permission.COMPLETE_TASK,
        Permission.DELETE_TASK,
        Permission.APPROVE_TASK_COMPLETION,
        Permission.GPS_CHECKIN,
        Permission.UPLOAD_TASK_PHOTOS,
        Permission.COMPLETE_TASK_CHECKLIST,
        Permission.SUBMIT_COMPLETION_REPORT,
        
        Permission.READ_USER,
        Permission.READ_ALL_USERS,
        Permission.UPDATE_OWN_PROFILE,
        Permission.UPDATE_ANY_PROFILE,
        Permission.DELETE_USER,
        Permission.PERMANENT_DELETE_USER,
        Permission.IMPERSONATE_USER,
        Permission.FORCE_LOGOUT_USER,
        Permission.RESET_USER_PASSWORD,
        
        Permission.PROMOTE_TO_CONTRIBUTOR,
        Permission.ASSIGN_MODERATOR,
        Permission.ASSIGN_OFFICER,
        Permission.ASSIGN_ADMIN,
        Permission.ASSIGN_AUDITOR,
        Permission.ASSIGN_SUPER_ADMIN,
        Permission.CHANGE_ANY_ROLE,
        
        Permission.CREATE_DEPARTMENT,
        Permission.UPDATE_DEPARTMENT,
        Permission.DELETE_DEPARTMENT,
        Permission.ASSIGN_DEPARTMENT,
        Permission.VIEW_DEPARTMENT_DATA,
        
        Permission.VIEW_BASIC_ANALYTICS,
        Permission.VIEW_PERSONAL_ANALYTICS,
        Permission.VIEW_AREA_ANALYTICS,
        Permission.VIEW_DEPARTMENT_ANALYTICS,
        Permission.VIEW_SYSTEM_ANALYTICS,
        Permission.VIEW_LEADERBOARD,
        Permission.EXPORT_DATA,
        Permission.GENERATE_COMPLIANCE_REPORT,
        
        Permission.MODERATE_CONTENT,
        Permission.FLAG_SPAM,
        Permission.MERGE_DUPLICATE_REPORTS,
        Permission.EDIT_REPORT_CATEGORY,
        Permission.RESOLVE_DISPUTES,
        Permission.BAN_USER,
        Permission.UNBAN_USER,
        Permission.SUSPEND_USER,
        Permission.REVIEW_FLAGS,
        
        # SUPER_ADMIN EXCLUSIVE PERMISSIONS
        Permission.MANAGE_SETTINGS,
        Permission.CONFIGURE_SYSTEM_SETTINGS,
        Permission.MODIFY_SECURITY_POLICIES,
        Permission.CONFIGURE_AI_PARAMETERS,
        Permission.SET_FEATURE_FLAGS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.VIEW_IMMUTABLE_AUDIT_LOGS,
        Permission.MANAGE_INTEGRATIONS,
        Permission.MANAGE_DATABASE_BACKUPS,
        Permission.EMERGENCY_DATABASE_ACCESS,
        Permission.VIEW_SERVER_HEALTH,
        Permission.DISASTER_RECOVERY,
        Permission.BLOCKCHAIN_AUDIT_VERIFICATION,
        Permission.SYSTEM_ADMIN,
    },
}


# ============================================================================
# RBAC HELPER FUNCTIONS
# ============================================================================

def get_role_level(role: UserRole) -> int:
    """Get the hierarchical level of a role"""
    return ROLE_LEVELS.get(role, 0)


def has_permission(user_role: UserRole, permission: Permission) -> bool:
    """Check if a role has a specific permission"""
    return permission in ROLE_PERMISSIONS.get(user_role, set())


def has_any_permission(user_role: UserRole, permissions: List[Permission]) -> bool:
    """Check if a role has any of the specified permissions"""
    role_perms = ROLE_PERMISSIONS.get(user_role, set())
    return any(perm in role_perms for perm in permissions)


def has_all_permissions(user_role: UserRole, permissions: List[Permission]) -> bool:
    """Check if a role has all of the specified permissions"""
    role_perms = ROLE_PERMISSIONS.get(user_role, set())
    return all(perm in role_perms for perm in permissions)


def get_user_permissions(user_role: UserRole) -> Set[Permission]:
    """Get all permissions for a role"""
    return ROLE_PERMISSIONS.get(user_role, set())


def is_higher_role(role1: UserRole, role2: UserRole) -> bool:
    """Check if role1 has higher privileges than role2"""
    return get_role_level(role1) > get_role_level(role2)


def can_manage_role(manager_role: UserRole, target_role: UserRole) -> bool:
    """Check if a manager can manage (promote/demote) a target role"""
    # Super Admins can manage anyone
    if manager_role == UserRole.SUPER_ADMIN:
        return True
    
    # Admins can manage all roles below them (not other admins or super admins)
    if manager_role == UserRole.ADMIN:
        return target_role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]
    
    # Auditors cannot manage anyone
    if manager_role == UserRole.AUDITOR:
        return False
    
    # Others can only manage roles below them
    return is_higher_role(manager_role, target_role)


def get_valid_role_transitions(current_role: UserRole) -> List[UserRole]:
    """Get valid role transitions for a given role"""
    transitions = {
        UserRole.CITIZEN: [
            UserRole.CONTRIBUTOR,
            UserRole.MODERATOR,
            UserRole.NODAL_OFFICER,
        ],
        UserRole.CONTRIBUTOR: [
            UserRole.MODERATOR,
            UserRole.NODAL_OFFICER,
        ],
        UserRole.MODERATOR: [
            UserRole.NODAL_OFFICER,
            UserRole.ADMIN,
        ],
        UserRole.NODAL_OFFICER: [
            UserRole.ADMIN,
        ],
        UserRole.AUDITOR: [],  # Terminal role - cannot transition
        UserRole.ADMIN: [
            UserRole.AUDITOR,  # Can be demoted to auditor
            UserRole.SUPER_ADMIN,  # Can be promoted by super admin only
        ],
        UserRole.SUPER_ADMIN: [
            UserRole.ADMIN,  # Can step down to admin
        ],
    }
    
    return transitions.get(current_role, [])


def is_valid_role_transition(from_role: UserRole, to_role: UserRole) -> bool:
    """Check if a role transition is valid"""
    valid_transitions = get_valid_role_transitions(from_role)
    return to_role in valid_transitions


def get_role_description(role: UserRole) -> str:
    """Get human-readable description of a role"""
    descriptions = {
        UserRole.CITIZEN: "Base User - Can report issues and track their status",
        UserRole.CONTRIBUTOR: "Trusted Citizen - Can validate and classify reports with 2x weight",
        UserRole.MODERATOR: "Community Curator - Can moderate content and manage users in assigned areas with 3x weight",
        UserRole.NODAL_OFFICER: "Field Worker - Can manage tasks and complete field work in assigned department",
        UserRole.AUDITOR: "Government Oversight - Read-only access to all system data and compliance reports",
        UserRole.ADMIN: "Municipal Manager - Full operational access and user management",
        UserRole.SUPER_ADMIN: "System Owner - Ultimate authority with system administration capabilities",
    }
    
    return descriptions.get(role, "Unknown role")


def get_role_display_name(role: UserRole) -> str:
    """Get display name for a role"""
    display_names = {
        UserRole.CITIZEN: "Citizen",
        UserRole.CONTRIBUTOR: "Contributor",
        UserRole.MODERATOR: "Moderator",
        UserRole.NODAL_OFFICER: "Nodal Officer",
        UserRole.AUDITOR: "Auditor",
        UserRole.ADMIN: "Administrator",
        UserRole.SUPER_ADMIN: "Super Administrator",
    }
    
    return display_names.get(role, role.value.title())


# ============================================================================
# PERMISSION DECORATORS & VALIDATORS
# ============================================================================

def require_permission(permission: Permission):
    """Decorator to require a specific permission"""
    def decorator(func):
        func._required_permission = permission
        return func
    return decorator


def require_any_permission(*permissions: Permission):
    """Decorator to require any of the specified permissions"""
    def decorator(func):
        func._required_permissions_any = permissions
        return func
    return decorator


def require_all_permissions(*permissions: Permission):
    """Decorator to require all of the specified permissions"""
    def decorator(func):
        func._required_permissions_all = permissions
        return func
    return decorator


def require_min_role_level(min_level: int):
    """Decorator to require minimum role level"""
    def decorator(func):
        func._min_role_level = min_level
        return func
    return decorator


# ============================================================================
# ROLE HIERARCHY VISUALIZATION
# ============================================================================

def print_role_hierarchy():
    """Print the role hierarchy for debugging"""
    print("\n" + "="*60)
    print("🔐 CivicLens Role Hierarchy")
    print("="*60)
    
    roles_by_level = sorted(ROLE_LEVELS.items(), key=lambda x: x[1], reverse=True)
    
    for role, level in roles_by_level:
        permissions = ROLE_PERMISSIONS.get(role, set())
        print(f"\nLEVEL {level}: {get_role_display_name(role).upper()}")
        print(f"Description: {get_role_description(role)}")
        print(f"Permissions: {len(permissions)}")
        print(f"Valid Transitions: {', '.join([r.value for r in get_valid_role_transitions(role)])}")
    
    print("\n" + "="*60)


if __name__ == "__main__":
    # Test the RBAC system
    print_role_hierarchy()
    
    # Test permission checks
    print("\n🧪 Testing Permission Checks:")
    print(f"Can CITIZEN validate reports? {has_permission(UserRole.CITIZEN, Permission.VALIDATE_REPORT)}")
    print(f"Can CONTRIBUTOR validate reports? {has_permission(UserRole.CONTRIBUTOR, Permission.VALIDATE_REPORT)}")
    print(f"Can ADMIN delete any report? {has_permission(UserRole.ADMIN, Permission.DELETE_ANY_REPORT)}")
    print(f"Can AUDITOR delete reports? {has_permission(UserRole.AUDITOR, Permission.DELETE_ANY_REPORT)}")
    
    # Test role transitions
    print("\n🔄 Testing Role Transitions:")
    print(f"CITIZEN → CONTRIBUTOR valid? {is_valid_role_transition(UserRole.CITIZEN, UserRole.CONTRIBUTOR)}")
    print(f"CITIZEN → ADMIN valid? {is_valid_role_transition(UserRole.CITIZEN, UserRole.ADMIN)}")
    print(f"MODERATOR → ADMIN valid? {is_valid_role_transition(UserRole.MODERATOR, UserRole.ADMIN)}")
