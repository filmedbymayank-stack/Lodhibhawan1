const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
code = code.replace(/\{res\.phone\} <Phone size=\{12\} className="text-secondary\/30" \/>/g, '<Plus size={12} className="text-secondary/30" />{res.phone}');
fs.writeFileSync('src/pages/Admin.tsx', code);
