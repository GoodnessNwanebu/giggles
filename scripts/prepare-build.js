#!/usr/bin/env node

import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

// Files and directories to copy to public
const filesToCopy = [
  'index.html',
  'script.js',
  'style.css',
  'manifest.json',
  'sw.js',
];

const dirsToCopy = [
  'icon',
];

// Create public directory
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// Copy files
filesToCopy.forEach(file => {
  const src = join(rootDir, file);
  const dest = join(publicDir, file);
  try {
    copyFileSync(src, dest);
    console.log(`✓ Copied: ${file}`);
  } catch (error) {
    console.error(`✗ Failed to copy ${file}:`, error.message);
  }
});

// Copy directories recursively
function copyDir(src, dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  const entries = readdirSync(src);
  entries.forEach(entry => {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  });
}

dirsToCopy.forEach(dir => {
  const src = join(rootDir, dir);
  const dest = join(publicDir, dir);
  if (existsSync(src)) {
    copyDir(src, dest);
    console.log(`✓ Copied directory: ${dir}`);
  }
});

console.log('\n✅ Build preparation complete!');
console.log('📁 Output directory: public/');

