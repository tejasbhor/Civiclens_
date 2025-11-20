// Debug script to test officers API
// Run this in browser console on the admin page

async function testOfficersAPI() {
  console.log('🔍 Testing Officers API...');
  
  try {
    // Get auth token from localStorage or sessionStorage
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    
    if (!token) {
      console.error('❌ No auth token found');
      return;
    }
    
    // Test the officers endpoint
    const response = await fetch('/api/v1/users/officers', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const officers = await response.json();
      console.log('✅ Officers loaded:', officers.length);
      
      // Group by department
      const byDept = officers.reduce((acc, officer) => {
        const deptId = officer.department_id || 'unassigned';
        if (!acc[deptId]) acc[deptId] = [];
        acc[deptId].push(officer);
        return acc;
      }, {});
      
      console.log('📊 Officers by department:', byDept);
      
      // Test specific department (PWD = 1)
      const pwdResponse = await fetch('/api/v1/users/officers?department_id=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (pwdResponse.ok) {
        const pwdOfficers = await pwdResponse.json();
        console.log('🏗️ PWD Officers:', pwdOfficers.length, pwdOfficers);
      } else {
        console.error('❌ PWD filter failed:', pwdResponse.status);
      }
      
    } else {
      const error = await response.text();
      console.error('❌ API Error:', response.status, error);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error);
  }
}

// Run the test
testOfficersAPI();