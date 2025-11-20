/**
 * Debug Script for Mobile Report Submission
 * Run this to test the /reports/submit-complete endpoint
 */

const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testSubmission() {
  try {
    console.log('🧪 Testing /reports/submit-complete endpoint...');

    // Create test FormData
    const formData = new FormData();
    
    // Add required fields
    formData.append('title', 'Test Report from Mobile Debug');
    formData.append('description', 'This is a test report to debug the 422 error from mobile submission');
    formData.append('category', 'roads');
    formData.append('severity', 'medium');
    formData.append('latitude', '23.2599');
    formData.append('longitude', '77.4126');
    formData.append('address', 'Test Address, Bhopal, Madhya Pradesh, India');
    formData.append('is_public', 'true');
    formData.append('is_sensitive', 'false');
    
    // Create a test image file (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
      0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0x8E, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    formData.append('files', testImageBuffer, {
      filename: 'test_image.png',
      contentType: 'image/png'
    });

    console.log('📋 FormData fields:');
    console.log('- title:', 'Test Report from Mobile Debug');
    console.log('- description:', 'This is a test report...');
    console.log('- category:', 'roads');
    console.log('- severity:', 'medium');
    console.log('- latitude:', '23.2599');
    console.log('- longitude:', '77.4126');
    console.log('- address:', 'Test Address, Bhopal...');
    console.log('- is_public:', 'true');
    console.log('- is_sensitive:', 'false');
    console.log('- files:', '1 test image (PNG, ~70 bytes)');

    // Make request to backend
    const response = await axios.post(
      'http://localhost:8000/api/v1/reports/submit-complete',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Bearer YOUR_TEST_TOKEN_HERE' // Replace with actual token
        },
        timeout: 30000
      }
    );

    console.log('✅ Success! Response:', response.data);

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📝 Response data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 422) {
        console.error('🔍 Validation errors:');
        const details = error.response.data?.detail || [];
        details.forEach((detail, index) => {
          console.error(`  ${index + 1}. ${detail.msg || detail.message}`);
          console.error(`     Field: ${detail.loc?.join('.') || 'unknown'}`);
          console.error(`     Input: ${JSON.stringify(detail.input)}`);
        });
      }
    }
  }
}

// Test different scenarios
async function runTests() {
  console.log('🚀 Starting mobile submission debug tests...\n');
  
  // Test 1: Basic submission
  await testSubmission();
  
  console.log('\n📋 Common 422 Error Causes:');
  console.log('1. Missing required fields (title, description, category, severity, latitude, longitude, address)');
  console.log('2. Invalid field values (category not in enum, severity not in enum)');
  console.log('3. Field length violations (title < 5 chars, description < 10 chars)');
  console.log('4. Invalid coordinates (lat not -90 to 90, lng not -180 to 180)');
  console.log('5. Missing files array or empty files');
  console.log('6. Invalid file types or sizes');
  console.log('7. Authentication issues (invalid or missing token)');
  
  console.log('\n🔧 To fix mobile submission:');
  console.log('1. Check all required fields are present');
  console.log('2. Validate field values match backend enums');
  console.log('3. Ensure proper FormData construction');
  console.log('4. Verify authentication token is valid');
  console.log('5. Check file upload format matches backend expectations');
}

runTests();
