const electron = require('electron');
const { app, BrowserWindow, Menu, shell, ipcMain, dialog } = electron;  //https://electronjs.org/docs/tutorial/first-app
const { autoUpdater } = require("electron-updater");
const ProgressBar = require('electron-progressbar');
const fs = require("fs-extra");
var archiver = require('archiver');

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
        {label:'Export', submenu: [
          {label:'Twitch'},
          {label:'MultiMC', click() { exportModpack('multimc') }},
          {label:'Minecraft Launcher', click() { exportModpack('launcher')}},
          {label:'Auto Mod Updater', click() { exportModpack('self')}}
        ]},
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
        },
        { type: 'separator' },
        { role: 'resetzoom' },
        { role: 'zoomin', accelerator: "Ctrl+=" },
        { role: 'zoomout' }
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

function exportModpack(target) {
  var exportTo = dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  win.webContents.send('modpack-info', 'export');
  ipcMain.on('modpack-info', (event, arg) => {
    console.log(arg.name);
    switch (target) {
      case 'multimc':
        var newFolder = exportTo[0]+'\\'+arg.name;
        var output = fs.createWriteStream(newFolder + '.zip');
        var archive = archiver('zip');
        archive.pipe(output);
        fs.mkdirSync(newFolder+'\\.minecraft', { recursive: true });
        fs.writeFileSync(newFolder+'\\.packignore', '.minecraft');
        fs.writeFileSync(newFolder+'\\instance.cfg', "InstanceType=OneSix\n");
        fs.writeFileSync(newFolder+'\\mmc-pack.json', `{
  "components": [
    {
      "cachedName": "Minecraft",
      "important": true,
      "uid": "net.minecraft",
      "version": "${(arg.settings.MCversion == 'auto') ? arg.bestVersion : arg.settings.MCversion}"
    }
  ],
  "formatVersion": 1
}`);
        fs.copySync(app.getPath('userData') + '\\profiles\\'+arg.name, newFolder+'\\.minecraft');

        output.on('finish', function() {
          fs.removeSync(newFolder);
        });
        archive.directory(newFolder, false);
        archive.finalize();
        break;
      case 'launcher':
        break;
      case 'self':
        break;
    }
  });
}

function importModpack(target) {
  var importFrom = dialog.showOpenDialog({ properties: ['openFile'] });
}

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

var progressBar;
ipcMain.on('progressbar', (event, arg) => {
  if (!progressBar || progressBar.isCompleted()) {
    progressBar = new ProgressBar({
      text: 'Checking for updates...',
      detail: 'Wait...',
      indeterminate: false,
      maxValue: arg,
      browserWindow: {
        parent: win,
          webPreferences: {
            nodeIntegration: true
          }
      }
    });
  } else {
    progressBar.value += 1;
    progressBar.detail = `Processed ${progressBar.value} / ${progressBar.getOptions().maxValue}`;
  }
  event.returnValue = progressBar.getOptions();
});

app.on('ready', createWindow);
