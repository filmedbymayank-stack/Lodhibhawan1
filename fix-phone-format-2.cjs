const fs = require('fs');

let reservationCode = fs.readFileSync('src/components/Reservation.tsx', 'utf8');
reservationCode = reservationCode.replace(/type="tel" required\n                  value=\{formData\.phone\}/g, 'type="tel" required pattern="[0-9]{10}" maxLength={10}\n                  value={formData.phone}');
fs.writeFileSync('src/components/Reservation.tsx', reservationCode);
