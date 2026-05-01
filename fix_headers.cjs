const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// Make section headers larger
code = code.replace(/text-2xl/g, 'text-3xl');

fs.writeFileSync('src/pages/Admin.tsx', code);
