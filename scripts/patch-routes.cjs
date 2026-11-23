const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Normalize line endings temporarily or use regex
content = content.replace(
  /<ProtectedRoute allowedRoles=\{STUDENT_ROLES\}>([\s\S]*?)<\/ProtectedRoute>/,
  '<PauseRestrictedRoute isPaused={isPaused}>\r\n                        <ProtectedRoute allowedRoles={STUDENT_ROLES}>$1</ProtectedRoute>\r\n                      </PauseRestrictedRoute>'
);

content = content.replace(
  /<ProtectedRoute allowedRoles=\{POINT_HISTORY_ROLES\}>([\s\S]*?)<\/ProtectedRoute>/,
  '<PauseRestrictedRoute isPaused={isPaused}>\r\n                        <ProtectedRoute allowedRoles={POINT_HISTORY_ROLES}>$1</ProtectedRoute>\r\n                      </PauseRestrictedRoute>'
);

content = content.replace(
  /<ProtectedRoute allowedRoles=\{STUDENT_ROLES\}>([\s\S]*?)<\/ProtectedRoute>/,
  '<PauseRestrictedRoute isPaused={isPaused}>\r\n                        <ProtectedRoute allowedRoles={STUDENT_ROLES}>$1</ProtectedRoute>\r\n                      </PauseRestrictedRoute>'
);

content = content.replace(
  '<Route path="/portfolio/:username" element={<SetupRedirectGuard><StudentPortfolio embedded={false} /></SetupRedirectGuard>} />',
  '<Route path="/portfolio/:username" element={<SetupRedirectGuard><PauseRestrictedRoute isPaused={isPaused}><StudentPortfolio embedded={false} /></PauseRestrictedRoute></SetupRedirectGuard>} />'
);

content = content.replace(
  /<ProtectedRoute allowedRoles=\{TEACHER_ROLES\}>([\s\S]*?)<\/ProtectedRoute>/,
  '<PauseRestrictedRoute isPaused={isPaused}>\r\n                        <ProtectedRoute allowedRoles={TEACHER_ROLES}>$1</ProtectedRoute>\r\n                      </PauseRestrictedRoute>'
);

content = content.replace(
  '<Route path="/book/:id" element={<SetupRedirectGuard><BookDetails /></SetupRedirectGuard>} />',
  '<Route path="/book/:id" element={<SetupRedirectGuard><PauseRestrictedRoute isPaused={isPaused}><BookDetails /></PauseRestrictedRoute></SetupRedirectGuard>} />'
);

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('App.tsx route patching done');
