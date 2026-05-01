const fs = require('fs');
let code = fs.readFileSync('src/components/Reservation.tsx', 'utf8');
code = code.replace(/type="tel" required/g, 'type="tel" required pattern="[0-9]{10}" maxLength={10}');
fs.writeFileSync('src/components/Reservation.tsx', code);
