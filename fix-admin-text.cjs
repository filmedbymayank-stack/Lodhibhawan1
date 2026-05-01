const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// The text was text-base font-medium font-normal, let's fix it to text-lg font-medium
code = code.replace(/text-base font-medium font-normal/g, 'text-lg font-medium');

// The phone and time is text-[13px], let's make it text-sm
code = code.replace(/text-\[13px\]/g, 'text-[14px]');

fs.writeFileSync('src/pages/Admin.tsx', code);
