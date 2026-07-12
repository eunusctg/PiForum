import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = '/home/z/my-project/public';
const SVG_PATH = join(PUBLIC_DIR, 'logo.svg');

const svgBuffer = readFileSync(SVG_PATH);

// Generate PNGs at different sizes
const sizes = [72, 192, 512];

async function generatePNGs() {
  for (const size of sizes) {
    const outputPath = join(PUBLIC_DIR, `icon-${size}.png`);
    await sharp(svgBuffer, { density: 300 })
      .resize(size, size, { fit: 'cover' })
      .png({ quality: 100, compressionLevel: 6 })
      .toFile(outputPath);
    console.log(`✅ Generated icon-${size}.png (${size}x${size})`);
  }
}

async function generateFavicon() {
  // Generate 16, 32, 48 PNGs for ICO
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];
  
  for (const size of icoSizes) {
    const buf = await sharp(svgBuffer, { density: 300 })
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer: buf });
    console.log(`  Generated ${size}x${size} PNG for ICO`);
  }

  // Build ICO file manually
  // ICO format: header + directory entries + image data
  const imageCount = pngBuffers.length;
  const headerSize = 6;        // ICONDIR
  const entrySize = 16;        // ICONDIRENTRY per image
  const headerAndEntries = headerSize + (entrySize * imageCount);
  
  // Calculate offsets
  let currentOffset = headerAndEntries;
  const entries = [];
  
  for (const { size, buffer } of pngBuffers) {
    entries.push({
      width: size >= 256 ? 0 : size,  // ICO spec: 0 means 256
      height: size >= 256 ? 0 : size,
      colorCount: 0,  // 0 = no palette
      planes: 1,
      bitCount: 32,
      sizeInBytes: buffer.length,
      offset: currentOffset,
      buffer
    });
    currentOffset += buffer.length;
  }
  
  // Build the ICO file
  const icoBuffer = Buffer.alloc(currentOffset);
  
  // ICONDIR header
  icoBuffer.writeUInt16LE(0, 0);        // Reserved
  icoBuffer.writeUInt16LE(1, 2);        // Type: 1 = ICO
  icoBuffer.writeUInt16LE(imageCount, 4); // Image count
  
  // ICONDIRENTRY for each image
  let entryOffset = headerSize;
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, entryOffset + 0);
    icoBuffer.writeUInt8(entry.height, entryOffset + 1);
    icoBuffer.writeUInt8(entry.colorCount, entryOffset + 2);
    icoBuffer.writeUInt8(0, entryOffset + 3);  // Reserved
    icoBuffer.writeUInt16LE(entry.planes, entryOffset + 4);
    icoBuffer.writeUInt16LE(entry.bitCount, entryOffset + 6);
    icoBuffer.writeUInt32LE(entry.sizeInBytes, entryOffset + 8);
    icoBuffer.writeUInt32LE(entry.offset, entryOffset + 12);
    entryOffset += entrySize;
  }
  
  // Image data
  for (const entry of entries) {
    entry.buffer.copy(icoBuffer, entry.offset);
  }
  
  const icoPath = join(PUBLIC_DIR, 'favicon.ico');
  writeFileSync(icoPath, icoBuffer);
  console.log(`✅ Generated favicon.ico (16, 32, 48)`);
}

async function main() {
  console.log('🎨 Generating PiForum icon assets from logo.svg...\n');
  await generatePNGs();
  console.log('');
  await generateFavicon();
  console.log('\n🎉 All icon assets generated successfully!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
