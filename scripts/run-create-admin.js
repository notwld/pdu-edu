#!/usr/bin/env node

/**
 * Simple script to run the create-admin.ts script with ts-node
 */
const { execSync } = require('child_process');
const path = require('path');

// Path to the create-admin.ts script
const scriptPath = path.join(__dirname, 'create-admin.ts');

try {
  console.log('Running admin creation script...');
  // Run the script using ts-node
  execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit' });
  console.log('Admin creation completed successfully!');
} catch (error) {
  console.error('Failed to create admin:', error);
  process.exit(1);
} 