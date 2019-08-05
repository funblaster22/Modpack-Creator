const electron = require('electron');
const { app, BrowserWindow, Menu, shell } = electron;  //https://electronjs.org/docs/tutorial/first-app

function createPopup (website) {
  // Create the popup window.
  let popup = new BrowserWindow({
    parent: win,
    modal: true,
    resizable: false,
    alwaysOnTop: true,
    //width: 100,
    //height: 100,
    webPreferences: {
      nodeIntegration: true
    }
  });

  popup.loadFile(website);
  popup.openDevTools();
  //popup.removeMenu();
  //popup.setMenuBarVisibility(false);
}

var win;
function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
    show: false,
    //backgroundColor: '#ffffff', bug black when resizing
    webPreferences: {
      nodeIntegration: true,
      //webviewTag: true
      //nativeWindowOpen: true
    }
  });
  win.maximize();
  win.show();

  var menu = Menu.buildFromTemplate([
    {
      label: 'File',  //(process.platform === 'darwin') ? app.getName() : 'File'
      submenu: [
        {label:'&New Modpack'},
        {label:'Export', submenu: [{label:'Twitch'}, {label:'MultiMC'}, {label:'Minecraft Launcher'}]},
        {label:'Import', submenu: [{label:'Twitch'}, {label:'MultiMC'}, {label:'Minecraft Launcher'}]},
        {role:'quit'}
        ]
    },
    {
      label: 'Edit',
      submenu: [
        { label:'MC Location',
          click() { createPopup('locate.html'); }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {role:'reload'},
        {label:'Toggle Theme'},
        {
          label: 'Dev Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        }
      ]
    },
    {
      label: 'Help', // report bug, how to...
      submenu: [
        { label: 'About',
          click() { createPopup('about.html'); }
        },
        { label: 'License',
          click() {}
        },
        { label: 'Report bug/feature',
          click() { shell.openExternal('https://github.com/funblaster22/Modpack-Creator/issues'); }
        },
        { label: '&Find',
          click() { /* window.find(string) */ }
        }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  win.loadFile('index.html');
  win.openDevTools();
}

app.on('ready', createWindow)
