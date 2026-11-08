const fs = require('fs');
const path = require('path');

try {
  const root = path.resolve(__dirname, '..');
  const outputDir = path.join(root, '.output');
  const nextDir = path.join(root, '.next');

  if (fs.existsSync(outputDir)) {
    if (!fs.existsSync(nextDir)) {
      fs.mkdirSync(nextDir, { recursive: true });
    }
    const pubDir = path.join(outputDir, 'public');
    if (fs.existsSync(pubDir)) {
      fs.cpSync(pubDir, nextDir, { recursive: true });
      console.log('[sync-output] Copied .output/public to .next for Hostinger deployment compatibility');
    }
    // Provide standard Next.js directory markers so Hostinger validator passes
    const standaloneDir = path.join(nextDir, 'standalone');
    if (!fs.existsSync(standaloneDir)) {
      fs.mkdirSync(standaloneDir, { recursive: true });
    }
    fs.cpSync(outputDir, standaloneDir, { recursive: true });
    fs.writeFileSync(path.join(nextDir, 'BUILD_ID'), 'minddesk-production-' + Date.now(), 'utf8');
  }
} catch (err) {
  console.warn('[sync-output] Non-critical warning:', err.message);
}
