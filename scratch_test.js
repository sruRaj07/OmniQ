const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'frontend/src/components/buyer/CartItem.tsx'), 'utf8');

// The regex approach is difficult because there might be multiple components, 
// and inserting the getStyles call correctly is tricky.
console.log("File read successfully.");
