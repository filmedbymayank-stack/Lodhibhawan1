const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(/href="#reserve"/g, 'href="#reserve-section"');
code = code.replace(/'#reserve'/g, "'#reserve-section'");

fs.writeFileSync('src/components/Navbar.tsx', code);
