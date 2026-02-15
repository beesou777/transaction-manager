const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const faviconPath = path.join(__dirname, '../assets/favicon.png');
const outputBase = path.join(__dirname, '../android/app/src/main/res');

// Android icon sizes (in dp, but we need px)
// mdpi: 48x48, hdpi: 72x72, xhdpi: 96x96, xxhdpi: 144x144, xxxhdpi: 192x192
const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function generateAndroidIcons() {
  console.log('Generating Android app icons...');
  
  for (const [folder, size] of Object.entries(androidSizes)) {
    const folderPath = path.join(outputBase, folder);
    
    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // Generate square icon
    await sharp(faviconPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher.png'));
    
    // Generate round icon (same as square for now, Android will handle rounding)
    await sharp(faviconPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_round.png'));
    
    console.log(`✓ Generated ${folder}/ic_launcher.png (${size}x${size})`);
    console.log(`✓ Generated ${folder}/ic_launcher_round.png (${size}x${size})`);
  }
}

async function generateIOSIcons() {
  console.log('\nGenerating iOS app icons...');
  
  const iosBase = path.join(__dirname, '../ios/NepaliFinanceManagerNew/Images.xcassets/AppIcon.appiconset');
  
  if (!fs.existsSync(iosBase)) {
    fs.mkdirSync(iosBase, { recursive: true });
  }
  
  // iOS icon sizes (in points, but we need px - multiply by scale factor)
  // For @1x, @2x, @3x
  const iosSizes = [
    { size: 20, scale: 2, name: 'icon-20@2x.png' },
    { size: 20, scale: 3, name: 'icon-20@3x.png' },
    { size: 29, scale: 2, name: 'icon-29@2x.png' },
    { size: 29, scale: 3, name: 'icon-29@3x.png' },
    { size: 40, scale: 2, name: 'icon-40@2x.png' },
    { size: 40, scale: 3, name: 'icon-40@3x.png' },
    { size: 60, scale: 2, name: 'icon-60@2x.png' },
    { size: 60, scale: 3, name: 'icon-60@3x.png' },
    { size: 1024, scale: 1, name: 'icon-1024.png' },
  ];
  
  for (const { size, scale, name } of iosSizes) {
    const pixelSize = size * scale;
    await sharp(faviconPath)
      .resize(pixelSize, pixelSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(iosBase, name));
    
    console.log(`✓ Generated ${name} (${pixelSize}x${pixelSize})`);
  }
  
  // Update Contents.json
  const contentsJson = {
    images: [
      { size: '20x20', idiom: 'iphone', scale: '2x', filename: 'icon-20@2x.png' },
      { size: '20x20', idiom: 'iphone', scale: '3x', filename: 'icon-20@3x.png' },
      { size: '29x29', idiom: 'iphone', scale: '2x', filename: 'icon-29@2x.png' },
      { size: '29x29', idiom: 'iphone', scale: '3x', filename: 'icon-29@3x.png' },
      { size: '40x40', idiom: 'iphone', scale: '2x', filename: 'icon-40@2x.png' },
      { size: '40x40', idiom: 'iphone', scale: '3x', filename: 'icon-40@3x.png' },
      { size: '60x60', idiom: 'iphone', scale: '2x', filename: 'icon-60@2x.png' },
      { size: '60x60', idiom: 'iphone', scale: '3x', filename: 'icon-60@3x.png' },
      { size: '1024x1024', idiom: 'ios-marketing', scale: '1x', filename: 'icon-1024.png' },
    ],
    info: {
      author: 'xcode',
      version: 1,
    },
  };
  
  fs.writeFileSync(
    path.join(iosBase, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  
  console.log('✓ Updated Contents.json');
}

async function main() {
  try {
    if (!fs.existsSync(faviconPath)) {
      console.error(`Error: ${faviconPath} not found!`);
      process.exit(1);
    }
    
    await generateAndroidIcons();
    await generateIOSIcons();
    
    console.log('\n✅ All app icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
