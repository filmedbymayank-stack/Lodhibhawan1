const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// For reservation cards typography
code = code.replace(/text-\[13px\]/g, 'text-base font-medium');
code = code.replace(/text-\[11px\]/g, 'text-[13px]');
code = code.replace(/text-\[9px\]/g, 'text-[11px]');
code = code.replace(/text-\[10px\]/g, 'text-[12px]');

fs.writeFileSync('src/pages/Admin.tsx', code);
