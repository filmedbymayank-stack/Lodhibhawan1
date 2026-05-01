const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// Name
code = code.replace(/text-lg font-medium text-white/g, 'text-xl font-medium text-white');
// Time / Phone / Date
code = code.replace(/text-\[14px\]/g, 'text-[15px]');

fs.writeFileSync('src/pages/Admin.tsx', code);
