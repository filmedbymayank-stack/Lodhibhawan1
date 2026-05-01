const fs = require('fs');
let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replaceAll('border-primary/10 rounded-sm relative"', 'rounded-sm relative ${ res.status === \'Confirmed\' ? \'border-[#8A9A5B]/30\' : res.status === \'Completed\' ? \'border-[#E6D7A3]/30\' : res.status === \'Cancelled\' || res.status === \'DidntReach\' ? \'border-[#E2725B]/30\' : res.status === \'Reached\' ? \'border-[#CD7F32]/30\' : res.status === \'SuggestedNewTime\' ? \'border-[#FF9933]/30\' : \'border-[#BF00FF]/30\' }`');

code = code.replaceAll('className="text-sm bg-dark p-3 border rounded-sm relative', 'className={`text-sm bg-dark p-3 border rounded-sm relative');

code = code.replaceAll('bg-[#F4C430]', 'bg-[#FF9933]');
code = code.replaceAll('text-[#F4C430]', 'text-[#FF9933]');
code = code.replaceAll('border-[#F4C430]', 'border-[#FF9933]');

code = code.replaceAll('bg-amber-900/10 border border-amber-500/20', 'bg-[#FF9933]/10 border border-[#FF9933]/20');
code = code.replaceAll('text-amber-400 font-mono', 'text-[#FF9933] font-mono');
code = code.replaceAll('bg-amber-500/20 text-amber-500 border border-amber-500/30', 'bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30');
code = code.replaceAll('hover:bg-amber-500/30', 'hover:bg-[#FF9933]/30');

fs.writeFileSync('src/components/Navbar.tsx', code);
