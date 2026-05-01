const fs = require('fs');

let reservationCode = fs.readFileSync('src/components/Reservation.tsx', 'utf8');
reservationCode = reservationCode.replace(/type="tel" required\n                  value=\{formData\.phone\}/g, 'type="tel" required pattern="[0-9]{10}" maxLength={10}\n                  value={formData.phone}');
fs.writeFileSync('src/components/Reservation.tsx', reservationCode);

let adminCode = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

// The input in add modal
adminCode = adminCode.replace(/type="tel" \n                    required /g, 'type="tel" \n                    required pattern="[0-9]{10}" maxLength={10} ');

// The phone displays
adminCode = adminCode.replace(/<span className="text-\[15px\] text-secondary\/60 whitespace-nowrap font-mono">\{res\.phone\}<\/span>/g, '<span className="text-[15px] text-secondary/60 whitespace-nowrap font-mono flex items-center"><Plus size={12} className="text-secondary/40 mr-0.5" />{res.phone}</span>');
// Table allocation also has a phone display
adminCode = adminCode.replace(/<span className="text-secondary font-medium">\{allocatingRes\.phone\}<\/span>/g, '<span className="text-secondary font-medium flex items-center"><Plus size={14} className="text-secondary/40 mr-1" />{allocatingRes.phone}</span>');

fs.writeFileSync('src/pages/Admin.tsx', adminCode);
