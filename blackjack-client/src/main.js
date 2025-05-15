const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const AutoPlayer = require('./core/autoPlayer');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;
let autoPlayer;

// Define server configuration and credentials
const SERVER_HOST = 'localhost'; // Updated host
// const SERVER_HOST = 'eah-2025-ai-jam.dev.elastic.cloud'; // Updated host
const SERVER_PORT = 8081;      // Corrected port
const USERNAME = 'derpbot';    // Updated username
const PASSWORD = 'bar';        // Dummy password

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200, // Increased width for better layout
    height: 800, // Increased height
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY, 
      // contextIsolation and nodeIntegration are true/false by default based on Electron version
      // Ensure they are compatible with your preload script needs.
      // For Electron 12+, contextIsolation is true by default.
      // nodeIntegration is false by default.
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (autoPlayer) {
        autoPlayer.stop();
        autoPlayer = null;
    }
  });
};

// Function to send messages to the renderer process
function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Initialize and start the AutoPlayer
  autoPlayer = new AutoPlayer(SERVER_HOST, SERVER_PORT, USERNAME, PASSWORD, sendToRenderer);
  autoPlayer.start();

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      // If window is recreated, re-establish autoPlayer or ensure it's still running
      // For simplicity, current setup assumes autoPlayer continues or restarts with app
      if (!autoPlayer) { // Or if (autoPlayer.isStopped) or similar check
        autoPlayer = new AutoPlayer(SERVER_HOST, SERVER_PORT, USERNAME, PASSWORD, sendToRenderer);
        autoPlayer.start();
      }
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
  // Ensure autoplayer is stopped if app quits this way
  if (autoPlayer) {
    autoPlayer.stop();
  }
});

// IPC listeners (if any needed from renderer to main)
// Example: ipcMain.on('some-action-from-renderer', (event, arg) => {
//   console.log(arg); 
//   // autoPlayer.performSomeAction(arg);
// });

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
