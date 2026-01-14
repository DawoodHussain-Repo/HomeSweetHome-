/**
 * Generate Logo Base64 for Print Templates
 */
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '..', 'src', 'assets', 'Logo.png');
const outputPath = path.join(__dirname, '..', 'src', 'renderer', 'js', 'utils', 'logoBase64.js');

if (!fs.existsSync(logoPath)) {
  console.error('Logo.png not found at:', logoPath);
  process.exit(1);
}

const logoBuffer = fs.readFileSync(logoPath);
const base64 = logoBuffer.toString('base64');

const output = `/**
 * Logo Base64 - Auto-generated
 * DO NOT EDIT MANUALLY
 */

export const LOGO_BASE64 = 'data:image/png;base64,${base64}';
`;

fs.writeFileSync(outputPath, output);

console.log('✅ Logo base64 generated successfully!');
console.log(`   Size: ${(logoBuffer.length / 1024).toFixed(2)} KB`);
console.log(`   Output: ${outputPath}`);
