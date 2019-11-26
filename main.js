const electron = require('electron');
const { app, BrowserWindow, Menu, shell, ipcMain } = electron;  //https://electronjs.org/docs/tutorial/first-app
const { autoUpdater } = require("electron-updater");

function createPopup (website) {
  // Create the popup window.
  let popup = new BrowserWindow({
    parent: win,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    //width: 100,
    //height: 100,
    webPreferences: {
      nodeIntegration: true
    }
  });

  popup.loadFile(website);
  if (process.defaultApp)
    popup.openDevTools();
  //popup.removeMenu();
  popup.setMenuBarVisibility(false);
  return popup;
}

var win;
function createWindow () {
  autoUpdater.checkForUpdatesAndNotify();

  // Create the browser window.
  win = new BrowserWindow({
    show: false,
    icon: __dirname + '\\assets\\profile.jpg',
    //backgroundColor: '#ffffff', bug black when resizing
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true
      //nativeWindowOpen: true
    }
  });
  win.maximize();

  var menu = Menu.buildFromTemplate([
    {
      label: 'File',  //(process.platform === 'darwin') ? app.getName() : 'File'
      submenu: [
        { label:'&New Modpack',
          click() { win.webContents.send('new-modpack'); }
        },
        {label:'Export', submenu: [{label:'Twitch'}, {label:'MultiMC'}, {label:'Minecraft Launcher'}, {label:'Auto Mod Updater'}]},
        {label:'Import', submenu: [{label:'Twitch'}, {label:'MultiMC'}, {label:'Minecraft Launcher'}, {label:'Auto Mod Updater'}]},
        {role:'quit'}
        ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'MC Location',
          click() { createPopup('menus/locate.html'); }
        },
        { label: 'Update All',
          click() {}
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {role:'reload'},
        { label:'Toggle Theme',
          click() { win.webContents.send('toggle-theme'); }
        },
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
          click() { createPopup('menus/about.html'); }
        },
        { label: 'License',
          click() { shell.openExternal("LICENSE.txt"); }
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
  if (process.defaultApp)
    win.openDevTools();

  win.once('ready-to-show', () => {
    win.show();
  });

  win.webContents.on('new-window', (event, url, frameName, disposition, options, additionalFeatures) => {
    // open window as modal
    //if (frameName === 'modal')
    event.preventDefault();
    url = url.split('/');
    event.newGuest = createPopup(url[url.length-1]);
  });

  win.webContents.session.on('will-download', (event, item, webContents) => {
    // Set the save path, making Electron not to prompt a save dialog.
    item.setSavePath(saveTo[item.getURLChain()[0]]);

    item.on('updated', (event, state) => { // TODO: send status to render
      if (state === 'interrupted') {
        console.log('Download is interrupted but can be resumed')
      } else if (state === 'progressing') {
        if (item.isPaused()) {
          console.log('Download is paused')
        } else {
          console.log('Received bytes: ' + item.getReceivedBytes())
        }
      }
    })
    item.once('done', (event, state) => {
      if (state === 'completed') {
        console.log('Download successful')
      } else {
        console.log('Download failed: ' + state)
      }
    })
  });
}

var saveTo = {};
ipcMain.on('download-to', (event, arg) => {
  console.log(arg);
  saveTo[arg[0]] = arg[1];
  // assoc. with url so knows correct save name if multiple downloads running
});

//var globEvent; TODO: more sophisticated & display progress in render
ipcMain.on('check-updates', (event, arg) => {
  autoUpdater.checkForUpdatesAndNotify();
  //globEvent = event;
  //autoUpdater.checkForUpdates();

  //event.reply('has-update', event);
});

/*autoUpdater.on('update-available', (info) => {
  globEvent.reply('has-update', "Update Avalible!");
});
autoUpdater.on('update-not-available', (info) => {
  globEvent.reply('has-update', "You are up to date!");
});
autoUpdater.on('error', (err) => {
  globEvent.reply('has-update', err);
});*/

app.on('ready', createWindow);
