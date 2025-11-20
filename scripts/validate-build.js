#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

let errors = [];
let warnings = [];

// Check if required files exist
const requiredFiles = [
  'package.json',
  'index.html',
  'script.js',
  'style.css',
  'api/joke.js',
];

console.log('🔍 Validating build...\n');

// Check required files
requiredFiles.forEach(file => {
  const path = join(rootDir, file);
  if (!existsSync(path)) {
    errors.push(`Missing required file: ${file}`);
  } else {
    console.log(`✓ Found: ${file}`);
  }
});

// Validate package.json
try {
  const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
  
  if (!packageJson.name) {
    warnings.push('package.json missing "name" field');
  }
  
  if (!packageJson.version) {
    warnings.push('package.json missing "version" field');
  }
  
  if (packageJson.type !== 'module') {
    warnings.push('package.json should have "type": "module" for ES modules');
  }
  
  console.log('✓ package.json is valid');
} catch (e) {
  errors.push(`Invalid package.json: ${e.message}`);
}

// Validate API function syntax
try {
  const apiPath = join(rootDir, 'api/joke.js');
  if (existsSync(apiPath)) {
    const apiCode = readFileSync(apiPath, 'utf-8');
    
    // Check for export default
    if (!apiCode.includes('export default')) {
      errors.push('api/joke.js must export a default handler function');
    }
    
    // Check for handler function
    if (!apiCode.includes('function handler') && !apiCode.includes('handler =')) {
      errors.push('api/joke.js must have a handler function');
    }
    
    // Check for environment variable usage
    if (!apiCode.includes('process.env.GEMINI_API_KEY')) {
      warnings.push('api/joke.js should use process.env.GEMINI_API_KEY');
    }
    
    console.log('✓ api/joke.js structure is valid');
  }
} catch (e) {
  errors.push(`Error validating api/joke.js: ${e.message}`);
}

// Check for .env.example or documentation
if (!existsSync(join(rootDir, '.env.example')) && !existsSync(join(rootDir, '.env'))) {
  warnings.push('Consider adding .env.example file for documentation');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Build validation passed!');
  process.exit(0);
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(err => console.log(`  - ${err}`));
  }
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warn => console.log(`  - ${warn}`));
  }
  console.log('\n' + '='.repeat(50));
  process.exit(errors.length > 0 ? 1 : 0);
}

