const fs = require('fs');

let adminCode = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
adminCode = adminCode.replace(/"Didn't Reached"/g, '"DIDN\\'T REACHED"');
adminCode = adminCode.replace(/> Didn\\'t Reached/g, "> DIDN'T REACHED");
fs.writeFileSync('src/pages/Admin.tsx', adminCode);

let navbarCode = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
navbarCode = navbarCode.replace(/"Didn't Reached"/g, '"DIDN\\'T REACHED"');
fs.writeFileSync('src/components/Navbar.tsx', navbarCode);
