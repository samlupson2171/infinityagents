const fs = require('fs');
const path = require('path');

// Import the Excel parser (we'll need to compile it first)
async function testExcelParser() {
  try {
    // Read the Excel file
    const filePath = path.join(__dirname, 'offers/benidorm/Benidorm Superpackages 2026.xlsx');
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Excel file not found at:', filePath);
      return;
    }

    const buffer = fs.readFileSync(filePath);
    console.log('✅ Excel file loaded successfully');
    console.log('📊 File size:', buffer.length, 'bytes');

    // For now, let's just confirm the file exists and can be read
    console.log('🎯 Ready to parse Excel file with the new system');
    console.log('📋 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Login as admin: admin@infinityweekends.co.uk / admin123');
    console.log('   3. Go to Admin Dashboard > Offers Management > Upload Excel tab');
    console.log('   4. Upload the Excel file and configure column mapping');
    console.log('   5. Import the offers into the system');

  } catch (error) {
    console.error('❌ Error testing Excel parser:', error);
  }
}

testExcelParser();