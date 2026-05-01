const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
content = content.replace(/const \[linkPhone, setLinkPhone\] = useState\(""\);\n\n  const handleLinkPhone = \(\) => \{\n    if \(linkPhone.trim\(\) !== ''\) \{\n      localStorage.setItem\('virtualAccountPhone', linkPhone.trim\(\)\);\n      \/\/ Trigger a re-evaluation\n      window.dispatchEvent\(new Event\('reservationUpdated'\)\);\n      setLinkPhone\(""\);\n    \}\n  \};\n/g, '');
fs.writeFileSync('src/components/Navbar.tsx', content);
