const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/Logo.svg');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  console.log('🎨 Generating PWA icons from Logo.svg...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    try {
      // Create a background with the brand color and the logo centered
      const background = Buffer.from(
        `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1BD79E"/>
        </svg>`
      );
      
      // Resize the logo to fit within the icon (with padding)
      const logoSize = Math.floor(size * 0.7);
      const padding = Math.floor((size - logoSize) / 2);
      
      await sharp(inputSvg)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
        .then(async (logoBuffer) => {
          await sharp(background)
            .composite([{
              input: logoBuffer,
              top: padding,
              left: padding
            }])
            .png()
            .toFile(outputPath);
        });
      
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (err) {
      console.error(`❌ Failed to generate icon-${size}x${size}.png:`, err.message);
    }
  }
  
  console.log('\n🎉 PWA icons generated successfully!');
  console.log('📁 Location: public/icons/');
}

generateIcons();

