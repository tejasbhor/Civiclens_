# Remaining Bulk Operations - Implementation Guide

## Overview
Implementation guide for applying the same production-ready improvements to the remaining bulk operations that weren't fully updated in this session.

---

## 🔧 **BULK ASSIGN DEPARTMENT - Backend**

### **Current Issues to Fix:**
```python
# In civiclens-backend/app/api/v1/reports.py
@router.post("/bulk/assign-department", response_model=BulkOperationResult)
async def bulk_assign_department(req: BulkAssignDepartmentRequest, ...):
    # TODO: Add same validation improvements as bulk_update_status
    # - Production safety limits (max 100)
    # - Duplicate ID removal
    # - Department existence validation
    # - Comprehensive audit logging
    # - Better error handling
```

### **Service Layer Improvements Needed:**
```python
# In civiclens-backend/app/services/report_service.py
async def bulk_assign_department(self, report_ids: List[int], department_id: int, user_id: int):
    # TODO: Apply same pattern as bulk_update_status
    # - Pre-validate all reports exist
    # - Validate department exists
    # - Check for already assigned reports
    # - Atomic transaction management
    # - Comprehensive error collection
```

---

## 🔧 **BULK ASSIGN OFFICER - Backend**

### **Current Issues to Fix:**
```python
# Similar improvements needed for officer assignment
@router.post("/bulk/assign-officer", response_model=BulkOperationResult)
async def bulk_assign_officer(req: BulkAssignOfficerRequest, ...):
    # TODO: Add validation improvements
    # - Officer existence validation
    # - Department compatibility check
    # - Workload capacity validation
    # - Task creation validation
```

---

## 🔧 **BULK UPDATE SEVERITY - Backend**

### **Current Issues to Fix:**
```python
# Service layer needs improvement
async def bulk_update_severity(self, report_ids: List[int], severity: ReportSeverity, user_id: int):
    # TODO: Apply same improvements
    # - Pre-validation of all reports
    # - Check for duplicate severity assignments
    # - Critical severity escalation handling
    # - Priority recalculation for associated tasks
```

---

## 🎯 **IMPLEMENTATION PATTERN**

### **1. API Layer Template:**
```python
@router.post("/bulk/{operation}", response_model=BulkOperationResult)
async def bulk_operation(req: BulkOperationRequest, ...):
    """Bulk operation with comprehensive validation"""
    if not is_admin_user(current_user):
        raise ForbiddenException("Only admins can perform bulk operations")
    
    # Production safety validations
    if len(req.report_ids) > 100:
        raise ValidationException("Cannot process more than 100 reports at once")
    
    if len(req.report_ids) == 0:
        raise ValidationException("No report IDs provided")
    
    # Remove duplicates and validate IDs
    unique_ids = list(set(req.report_ids))
    if len(unique_ids) != len(req.report_ids):
        logger.warning(f"Duplicate report IDs removed from bulk operation by user {current_user.id}")
    
    try:
        # Use service layer for atomic bulk operation
        result = await report_service.bulk_operation(
            report_ids=unique_ids,
            **operation_params,
            user_id=current_user.id
        )
        
        # Determine audit status based on results
        audit_status = AuditStatus.SUCCESS
        if result['failed'] > 0:
            audit_status = AuditStatus.PARTIAL_SUCCESS if result['successful'] > 0 else AuditStatus.FAILURE
        
        # Comprehensive audit logging
        await audit_logger.log(
            db=db,
            action=AuditAction.BULK_OPERATION,
            status=audit_status,
            user=current_user,
            request=request,
            description=f"Bulk operation: {result['successful']}/{result['total']} successful",
            metadata={
                "operation": "bulk_operation_name",
                "total_reports": result['total'],
                "successful": result['successful'],
                "failed": result['failed'],
                "report_ids": unique_ids[:10],
                "has_failures": result['failed'] > 0,
                "error_count": len(result.get('errors', [])),
                "request_size": len(unique_ids),
                "duplicate_ids_removed": len(req.report_ids) - len(unique_ids)
            },
            resource_type="report",
            resource_id="bulk"
        )
        
        return BulkOperationResult(**result)
        
    except Exception as e:
        # Audit failed operation
        await audit_logger.log(
            db=db,
            action=AuditAction.BULK_OPERATION,
            status=AuditStatus.FAILURE,
            user=current_user,
            request=request,
            description=f"Bulk operation failed: {str(e)}",
            metadata={
                "operation": "bulk_operation_name",
                "total_reports": len(unique_ids),
                "report_ids": unique_ids[:10],
                "error": str(e),
                "error_type": type(e).__name__
            },
            resource_type="report",
            resource_id="bulk"
        )
        logger.error(f"Bulk operation failed for user {current_user.id}: {str(e)}")
        raise
```

### **2. Service Layer Template:**
```python
async def bulk_operation(self, report_ids: List[int], user_id: int, **params) -> Dict[str, Any]:
    """Bulk operation with comprehensive validation and transaction management"""
    results = {
        "total": len(report_ids),
        "successful": 0,
        "failed": 0,
        "errors": [],
        "successful_ids": [],
        "failed_ids": []
    }
    
    # Pre-validate all reports exist
    existing_reports = {}
    try:
        stmt = select(Report).where(Report.id.in_(report_ids))
        result = await self.db.execute(stmt)
        reports = result.scalars().all()
        
        for report in reports:
            existing_reports[report.id] = report
            
        # Check for non-existent reports
        missing_ids = set(report_ids) - set(existing_reports.keys())
        for missing_id in missing_ids:
            results["failed"] += 1
            results["failed_ids"].append(missing_id)
            results["errors"].append({
                "report_id": str(missing_id),
                "error": f"Report not found"
            })
            
    except Exception as e:
        logger.error(f"Failed to fetch reports for bulk operation: {str(e)}")
        raise ValidationException(f"Failed to validate reports: {str(e)}")
    
    # Process each report with individual error handling
    for report_id in report_ids:
        if report_id not in existing_reports:
            continue  # Already handled in missing_ids
            
        try:
            report = existing_reports[report_id]
            
            # Perform operation-specific validation
            await self.validate_operation_prerequisites(report, **params)
            
            # Perform the operation
            await self.perform_operation(report_id, user_id, **params)
            
            results["successful"] += 1
            results["successful_ids"].append(report_id)
            
        except Exception as e:
            results["failed"] += 1
            results["failed_ids"].append(report_id)
            results["errors"].append({
                "report_id": str(report_id),
                "error": str(e)
            })
            logger.warning(f"Failed to perform operation for report {report_id}: {str(e)}")
    
    # Commit all successful changes
    try:
        await self.db.commit()
        logger.info(f"Bulk operation completed: {results['successful']}/{results['total']} successful")
    except Exception as e:
        await self.db.rollback()
        logger.error(f"Failed to commit bulk operation: {str(e)}")
        raise ValidationException(f"Failed to save changes: {str(e)}")
        
    return results
```

---

## 🎯 **PRIORITY ORDER FOR IMPLEMENTATION**

### **1. High Priority (Complete First)**
1. **Bulk Assign Department** - Most commonly used
2. **Bulk Update Severity** - Critical for escalations
3. **Bulk Assign Officer** - Important for workflow

### **2. Implementation Steps**
1. Apply API layer improvements
2. Update service layer with transaction management
3. Add comprehensive validation
4. Update audit logging
5. Test edge cases
6. Update documentation

---

## 🧪 **TESTING CHECKLIST**

### **For Each Bulk Operation:**
- [ ] Empty report ID list
- [ ] Duplicate report IDs
- [ ] Non-existent report IDs
- [ ] Invalid parameters (department/officer/severity)
- [ ] Permission validation
- [ ] Transaction rollback scenarios
- [ ] Large batch operations (100 reports)
- [ ] Concurrent operations
- [ ] Network failure scenarios

---

## 📋 **COMPLETION CRITERIA**

### **Each bulk operation should have:**
- [ ] Production safety limits (max 100 reports)
- [ ] Duplicate ID removal and logging
- [ ] Comprehensive input validation
- [ ] Atomic transaction management
- [ ] Detailed error collection and reporting
- [ ] Professional audit logging
- [ ] Performance optimization
- [ ] Security hardening

---

## 🚀 **NEXT STEPS**

1. **Apply the template pattern** to remaining bulk operations
2. **Test thoroughly** with edge cases
3. **Update frontend** to match backend improvements
4. **Add monitoring** for bulk operation metrics
5. **Document** the final implementation

This ensures all bulk operations maintain the same high standard of production readiness! 🎯