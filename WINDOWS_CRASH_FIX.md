# Windows App Crash Fix

## Problem
The Electron app was crashing immediately on launch after successful build and release on Windows with the following error:

```
Uncaught Exception:
Error: spawn C:\Users\jheri\AppData\Local\Programs\Dashboard Penilaian Kinerja Pegawai Dinas Sosial\Dashboard Penilaian Kinerja Pegawai Dinas Sosial.exe ENOENT
    at ChildProcess._handle.onexit (node:internal/child_process:484:16)
    at onErrorNT (node:internal/child_process:282:16)
    at processTicksAndRejections (node:internal/process/task_queues:82:21)
```

## Root Cause
The issue was in the `main.js` file where `child_process.fork()` was trying to spawn the main Electron executable instead of properly running the Node.js server script. This is a common problem with packaged Electron apps on Windows.

## Solution
Modified the server startup process in `main.js` to:

1. **Use `spawn()` instead of `fork()` for Windows packaged apps**: This provides better control over the process execution
2. **Set proper stdio configuration**: Ensures IPC communication works correctly
3. **Use `ELECTRON_RUN_AS_NODE=1`**: Forces Electron to run in Node.js mode

### Code Changes

In `/main.js`, replaced the server startup logic:

```javascript
// OLD CODE (causing crash)
this.serverProcess = fork(serverPath, [], forkOptions);

// NEW CODE (fixed)
if (isPackaged && process.platform === 'win32') {
  // For Windows packaged apps, use spawn with ELECTRON_RUN_AS_NODE to avoid spawn ENOENT errors
  this.serverProcess = spawn(process.execPath, [serverPath], {
    ...forkOptions,
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: {
      ...forkOptions.env,
      ELECTRON_RUN_AS_NODE: '1'
    }
  });
} else {
  // For development and other platforms, use fork for better integration
  this.serverProcess = fork(serverPath, [], forkOptions);
}
```

## Additional Steps Taken

1. **Rebuilt native modules**: Ran `npm run rebuild:electron` to ensure better-sqlite3 is properly compiled for Electron
2. **Verified native module compatibility**: Confirmed better-sqlite3 loads correctly in both Node.js and Electron environments

## Testing

To test the fix:

1. Build the application: `npm run dist:win`
2. Install and run the generated executable
3. Verify the app launches without crashing
4. Check that the backend server starts properly
5. Confirm database operations work correctly

## Prevention

To prevent similar issues in the future:

1. Always test packaged builds on the target platform
2. Use platform-specific process spawning when necessary
3. Ensure native modules are properly rebuilt for Electron
4. Include comprehensive error handling for child processes

## Related Files Modified

- `/main.js` - Fixed server process spawning logic
- This fix maintains compatibility with development mode and other platforms