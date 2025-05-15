// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer to Main (one-way): Not strictly needed for AutoPlayer but good for future
  // send: (channel, data) => ipcRenderer.send(channel, data),
  
  // Main to Renderer: Allow renderer to subscribe to specific channels
  onUpdateGameState: (callback) => ipcRenderer.on('update-game-state', (_event, value) => callback(value)),
  onLogMessage: (callback) => ipcRenderer.on('log-message', (_event, value) => callback(value)),
  onLastAction: (callback) => ipcRenderer.on('last-action', (_event, value) => callback(value)),

  // Function to remove listeners if a component unmounts (good practice for UI frameworks)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

console.log('preload.js loaded');
