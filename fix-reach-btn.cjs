const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
content = content.replace(/<XCircle size=\{12\} \/> Didn't Reach/g, "<XCircle size={12} /> Didn't Reached");
fs.writeFileSync('src/pages/Admin.tsx', content);
