/**
 * Safe Command Execution Utilities
 *
 * Provides secure wrappers around child_process to prevent command injection
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { sanitizeClientId, sanitizeShellArg, buildSafeCommand } from './input-validator.js';

const execAsync = promisify(exec);

/**
 * Execute a Node.js script with validated client ID
 * This is the SAFE replacement for direct execAsync calls
 *
 * @param {string} scriptPath - Path to the script (must be in project)
 * @param {string} clientId - Client ID (will be validated)
 * @param {object} options - Additional exec options
 * @returns {Promise<{stdout: string, stderr: string}>}
 * @throws {Error} - If validation fails or execution errors
 */
export async function executeNodeScript(scriptPath, clientId, options = {}) {
  // Validate script path (prevent path traversal)
  const allowedScripts = [
    'client-manager.js',
    'auto-fix-all.js',
    'auto-fix-titles.js',
    'auto-fix-h1-tags.js',
    'auto-fix-image-alt.js',
    'test-auth.js'
  ];

  if (!allowedScripts.includes(scriptPath)) {
    throw new Error(`Script "${scriptPath}" is not in the allowed list`);
  }

  // Validate and sanitize client ID
  const safeClientId = sanitizeClientId(clientId);

  // Build safe command
  const command = `node ${scriptPath} ${safeClientId}`;

  // Execute with timeout protection
  const execOptions = {
    maxBuffer: 1024 * 1024 * 10, // 10MB
    timeout: options.timeout || 300000, // 5 min default
    ...options
  };

  try {
    const result = await execAsync(command, execOptions);
    return result;
  } catch (error) {
    // Enhance error message without exposing internals
    throw new Error(`Failed to execute ${scriptPath}: ${error.message}`);
  }
}

/**
 * Execute a Node.js script with multiple validated arguments
 *
 * @param {string} scriptPath - Path to the script
 * @param {string[]} args - Arguments (all will be validated)
 * @param {object} options - Exec options
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export async function executeNodeScriptWithArgs(scriptPath, args = [], options = {}) {
  // Validate script path
  const allowedScripts = [
    'client-manager.js',
    'auto-fix-all.js',
    'auto-fix-titles.js',
    'scripts/run-autofix-dryrun.js',
    'scripts/run-rank-tracking.js',
    'scripts/run-local-seo.js'
  ];

  if (!allowedScripts.includes(scriptPath)) {
    throw new Error(`Script "${scriptPath}" is not in the allowed list`);
  }

  // Validate all arguments
  const safeArgs = args.map(arg => sanitizeShellArg(arg));

  // Build command
  const command = `node ${scriptPath} ${safeArgs.join(' ')}`;

  const execOptions = {
    maxBuffer: 1024 * 1024 * 10,
    timeout: options.timeout || 300000,
    ...options
  };

  try {
    return await execAsync(command, execOptions);
  } catch (error) {
    throw new Error(`Failed to execute ${scriptPath}: ${error.message}`);
  }
}

/**
 * Spawn a process with validated arguments (better for long-running tasks)
 *
 * @param {string} command - Command to run (must be in allowed list)
 * @param {string[]} args - Arguments
 * @param {object} options - Spawn options
 * @returns {ChildProcess}
 */
export function spawnSafeProcess(command, args = [], options = {}) {
  const allowedCommands = ['node', 'npm', 'git'];

  if (!allowedCommands.includes(command)) {
    throw new Error(`Command "${command}" is not allowed`);
  }

  // Validate all arguments
  const safeArgs = args.map(arg => sanitizeShellArg(arg));

  return spawn(command, safeArgs, {
    stdio: options.stdio || 'pipe',
    ...options
  });
}

/**
 * Execute audit for a client (safe wrapper)
 *
 * @param {string} clientId - Client ID
 * @returns {Promise<{stdout: string, stderr: string, duration: number}>}
 */
export async function executeAudit(clientId) {
  const startTime = Date.now();

  const result = await executeNodeScript('client-manager.js', clientId, {
    timeout: 120000 // 2 minutes for audits
  });

  return {
    ...result,
    duration: Date.now() - startTime
  };
}

/**
 * Execute optimization for a client (safe wrapper)
 *
 * @param {string} clientId - Client ID
 * @returns {Promise<{stdout: string, stderr: string, duration: number}>}
 */
export async function executeOptimization(clientId) {
  const startTime = Date.now();

  const result = await executeNodeScript('client-manager.js', clientId, {
    timeout: 300000 // 5 minutes for optimization
  });

  return {
    ...result,
    duration: Date.now() - startTime
  };
}

/**
 * Execute auto-fix script for a client (safe wrapper)
 *
 * @param {string} scriptName - Script name (without path)
 * @param {string} clientId - Client ID
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export async function executeAutoFix(scriptName, clientId) {
  const allowedScripts = {
    'all': 'auto-fix-all.js',
    'titles': 'auto-fix-titles.js',
    'h1': 'auto-fix-h1-tags.js',
    'images': 'auto-fix-image-alt.js'
  };

  const scriptPath = allowedScripts[scriptName];

  if (!scriptPath) {
    throw new Error(`Unknown auto-fix script: ${scriptName}`);
  }

  return executeNodeScript(scriptPath, clientId);
}

/**
 * Test authentication for a client (safe wrapper)
 *
 * @param {string} clientId - Client ID
 * @returns {Promise<{stdout: string, stderr: string}>}
 */
export async function testAuthentication(clientId) {
  return executeNodeScript('test-auth.js', clientId, {
    timeout: 30000 // 30 seconds
  });
}

export default {
  executeNodeScript,
  executeNodeScriptWithArgs,
  spawnSafeProcess,
  executeAudit,
  executeOptimization,
  executeAutoFix,
  testAuthentication
};
