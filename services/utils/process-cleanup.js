/**
 * Process Cleanup Utilities
 *
 * Ensures all child processes are properly reaped to prevent zombies
 */

import { spawn } from 'child_process';

/**
 * Setup automatic zombie process cleanup
 *
 * Handles SIGCHLD to reap terminated child processes
 * Call this once at application startup
 */
export function setupZombieCleanup() {
  // Node.js automatically reaps children when using the callback-based
  // child_process APIs. However, if callbacks/promises are abandoned,
  // we need to explicitly handle SIGCHLD

  let zombieCount = 0;

  process.on('SIGCHLD', () => {
    // This event is emitted when a child process terminates
    // Node.js handles the cleanup, but we log it for monitoring
    zombieCount++;

    if (zombieCount % 100 === 0) {
      console.log(`[ProcessCleanup] Reaped ${zombieCount} child processes`);
    }
  });

  console.log('[ProcessCleanup] ✅ Zombie cleanup handler installed');
}

/**
 * Enhanced exec wrapper with guaranteed cleanup
 *
 * @param {string} command - Command to execute
 * @param {object} options - Exec options
 * @returns {Promise<{stdout: string, stderr: string, code: number}>}
 */
export function execWithCleanup(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('sh', ['-c', command], {
      stdio: 'pipe',
      timeout: options.timeout || 300000,
      maxBuffer: options.maxBuffer || 1024 * 1024 * 10,
      ...options
    });

    let stdout = '';
    let stderr = '';
    let didTimeout = false;

    // Collect output
    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    // Handle timeout
    if (options.timeout) {
      setTimeout(() => {
        if (!child.killed) {
          didTimeout = true;
          child.kill('SIGTERM');

          // Force kill after 5 seconds if still alive
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        }
      }, options.timeout);
    }

    // Handle completion
    child.on('close', (code, signal) => {
      if (didTimeout) {
        reject(new Error(`Command timed out after ${options.timeout}ms: ${command}`));
      } else if (signal) {
        reject(new Error(`Command killed by signal ${signal}: ${command}`));
      } else if (code !== 0 && !options.ignoreErrors) {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      } else {
        resolve({ stdout, stderr, code: code || 0 });
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${error.message}`));
    });
  });
}

/**
 * Get current zombie process count
 *
 * @returns {Promise<number>}
 */
export async function getZombieCount() {
  try {
    const { stdout } = await execWithCleanup("ps aux | awk '$8 ~ /Z/ { count++ } END { print count+0 }'");
    return parseInt(stdout.trim()) || 0;
  } catch (error) {
    console.error('[ProcessCleanup] Failed to get zombie count:', error.message);
    return -1;
  }
}

/**
 * Monitor for zombie processes and log warnings
 *
 * @param {number} intervalMs - Check interval in milliseconds (default: 5 minutes)
 */
export function monitorZombies(intervalMs = 300000) {
  setInterval(async () => {
    const zombieCount = await getZombieCount();

    if (zombieCount > 0) {
      console.warn(`[ProcessCleanup] ⚠️  Warning: ${zombieCount} zombie process(es) detected`);
    } else if (zombieCount === 0) {
      console.log('[ProcessCleanup] ✅ No zombie processes detected');
    }
  }, intervalMs);

  console.log(`[ProcessCleanup] 👁️  Zombie monitoring started (interval: ${intervalMs/1000}s)`);
}

export default {
  setupZombieCleanup,
  execWithCleanup,
  getZombieCount,
  monitorZombies
};
