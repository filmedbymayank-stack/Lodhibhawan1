const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
code = code.replace(/<div className="py-2">\s*<p className="text-secondary\/50 text-xs italic mb-4 text-center">No reservations found.<\/p>\s*<\/div>\s*<\/div>/g, '<div className="py-2">\n                        <p className="text-secondary/50 text-xs italic mb-4 text-center">No reservations found.</p>\n                      </div>');
fs.writeFileSync('src/components/Navbar.tsx', code);
