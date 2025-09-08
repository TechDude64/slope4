// Preload script for Electron
const { contextBridge } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the renderer here
  // For example:
  // minimize: () => ipcRenderer.invoke('minimize-window'),
  // maximize: () => ipcRenderer.invoke('maximize-window'),
  // close: () => ipcRenderer.invoke('close-window')
});
