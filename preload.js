var ipcRenderer = require('electron').ipcRenderer;
// TODO: can't read plain text (eg json)
document.addEventListener("DOMContentLoaded", function () {
  ipcRenderer.sendToHost('html-content' , document.body.innerHTML);
});
