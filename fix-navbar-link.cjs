const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
content = content.replace(/<div className="border-t border-primary\/20 pt-4">\s*<p className="text-xs text-secondary mb-2 font-medium">Link Your Account<\/p>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g, '</div>\n                      </div>');
fs.writeFileSync('src/components/Navbar.tsx', content);
