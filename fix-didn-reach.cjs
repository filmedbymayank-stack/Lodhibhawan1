const fs = require('fs');

function fixAdmin() {
  let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');
  content = content.replace(
    /\{res\.status === 'SuggestedNewTime' \? 'Suggested New Time' : res\.status\}/g,
    "{res.status === 'SuggestedNewTime' ? 'Suggested New Time' : res.status === 'DidntReach' ? \"Didn't Reached\" : res.status}"
  );
  content = content.replace(
    /res\.status === 'SuggestedNewTime' && res\.suggestedDatetime \? `Suggested - \$\{new Date\(res\.suggestedDatetime\)\.toLocaleString\('en-IN', \{ dateStyle: 'short', timeStyle: 'short' \}\)\}` : `\$\{res\.status\}`/g,
    "res.status === 'SuggestedNewTime' && res.suggestedDatetime ? `Suggested - ${new Date(res.suggestedDatetime).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}` : `${res.status === 'DidntReach' ? \"Didn't Reached\" : res.status}`"
  );
  fs.writeFileSync('src/pages/Admin.tsx', content);
}

function fixNavbar() {
  let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');
  content = content.replace(
    /\{res\.status === 'SuggestedNewTime' \? 'Suggested New Time' : res\.status\}/g,
    "{res.status === 'SuggestedNewTime' ? 'Suggested New Time' : res.status === 'DidntReach' ? \"Didn't Reached\" : res.status}"
  );
  fs.writeFileSync('src/components/Navbar.tsx', content);
}

fixAdmin();
fixNavbar();
