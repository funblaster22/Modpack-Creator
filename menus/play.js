async function play(target) {
  check();

  selectedModpack = $(target).parent().prev('input').val();
  var file = editProjectsFile();  //TODO: rename to modpack
  var bestVersion = (file.settings.MCversion == 'Auto') ? findBestVersion() : file.settings.MCversion;
  console.log('Using MC version ' + bestVersion);

  let path = app.getPath('userData') + '\\profiles\\' + makeSafe(selectedModpack) + '\\mods';
  console.log(path);
  fs.mkdirSync(path, { recursive: true });

  var downloadedMods = [];
  ipcRenderer.send('progressbar', file.mods.length);

  ipcRenderer.removeAllListeners('progressbar-done');
  ipcRenderer.once('progressbar-done', async (event, timeout) => {
    if (timeout === true) {
      alert("Request timed out. Check your internet connection and try again");
      throw new Error("Request timed out");
    }
    if (needsForgeUpdate())
      await installForge();
    child_process.execFile(localStorage.launcher);
    console.log('Starting Launcher...');
  });

  for (var modIndex=0; modIndex<file.mods.length; modIndex++) {
    let mod = file.mods[modIndex];
    mod.index = modIndex;
    var filePath = path + '\\' + mod.name + '.jar';
    if (mod.url == undefined)
      await downloadMod(mod, filePath);
    else
      await downloadUnknownMod(mod, filePath);
    ipcRenderer.send('progressbar');
  }
  deleteUnusedMods();

  function needsForgeUpdate() {
    let versionsFolderPath = pathlib.dirname(localStorage.profiles) + '\\versions\\';
    let data = editProjectsFile();
    for (let forgeFolder of fs.readdirSync(versionsFolderPath)) {  // check if allready installed
      if (!isEmpty(data.forgeVersion) && forgeFolder.includes(data.forgeVersion.split(/-(.+)/)[1])
          && forgeFolder.includes(bestVersion) ) {
        // eg forgeVersion = 1.14.4-28.2.3
        editProjectsFile(function(data) {
          data.forgeVersion = forgeFolder;
          return data;
        });
        exportMClauncher();
        return false;
      }
    }
    return true;
  }

  function deleteUnusedMods() {
    console.log(downloadedMods, path);
    for (var modFile of fs.readdirSync(path)) { // delete old mod
      if (!downloadedMods.includes(negativeArrayIndex(modFile.split('.'), 2)) )
        fs.removeSync(path +"\\"+ modFile);
    }
  }

  async function downloadMod(modInfo, filePath) {
    if (downloadedMods.includes(modInfo.name)) return; // prevent duplicate mods

    /* check for compatible mod versions then download */
    let data = await newSearchRaw("https://api.cfwidget.com/minecraft/mc-mods/" + modInfo.name + '?version=' + bestVersion); // +'/beta'

    if (modInfo.index)
      editProjectsFile(file => { // update cached compatibility info
        var versions = [];
        for (let version of Object.values(data.versions)) {
          // ensure all versions reported
          versions.push(...version[0].versions);
        }
        file.mods[modInfo.index].supportedMCversions = removeDuplicateVersions(versions);
        file.allVersions = calcAllVersions(versions);
        return file;
      });
    if (!data.download.versions.includes(bestVersion) && !modInfo.required) return;
    /*for (var file of data.files) {
      // TODO: check release/beta/alpha + MC version
    }*/

    for (var dependancy of modInfo.dependencies)
      await downloadMod({name: dependancy, dependencies: await findDependencies(dependancy), required: true}, filePath.replace('.jar', `.${ dependancy }.jar`));

    var filename = pathlib.dirname(filePath) + `\\${data.download.id}.` +pathlib.basename(filePath);
    downloadedMods.push(modInfo.name);
    if (fs.existsSync(filename)) return; // detect mod update

    for (var modFile of fs.readdirSync(pathlib.dirname(filePath)) ) { // delete old mod
      if (negativeArrayIndex(modFile.split('.'), 2) == modInfo.name)
        fs.unlinkSync(pathlib.dirname(filePath) +"\\"+ modFile);
    }

    newSearch(data.download.url.replace('files', 'download') + '/file', null, filename);
    // OLD https://www.curseforge.com/minecraft/mc-mods/quark/files/2746011/file
    // NEW https://www.curseforge.com/minecraft/mc-mods/quark/download/2746011/file
  }

  async function downloadUnknownMod(mod, savePath) {
    let url = mod.url;
    let res = await newSearchRaw(url);
    const baseUrl = new URL(url).hostname;
    console.log("Current site: " + url);
    if (res instanceof Document) {
      for (var link of res.querySelectorAll('a[href]')) {
        let label = link.innerText;
        let href = urllib.resolve(url, $(link).attr('href'));
        console.log(href);
        if ((href.includes(bestVersion) || label.includes(bestVersion)) && new URL(href).hostname == baseUrl) { // TODO: determine if beta/alpha
          if (mod.name) downloadedMods.push(mod.name);
          return downloadUnknownMod({url: href}, savePath); // TODO: store compatible MC version in filename
        }
      }
      alert('Unable to find download link, must finish manually!');
      shell.openExternal(url);
    } else {
      newSearch(url, null, savePath); // TODO: make more efficent only one request
    }
  }

  async function installForge() { console.log('Installing Forge...');
    let html = await newSearch(`https://files.minecraftforge.net/maven/net/minecraftforge/forge/index_${ bestVersion }.html`);
    let installer = html.querySelector('.download a[title=Installer]');  // TODO: change reccomended/latest depending on preferences
    // alt:  .info-link.tooltipstered[href]
    if (installer == null) {
      alert(`Forge does not work with MC ${bestVersion}, choose a differnet version`);
      throw new Error("Incompatible");
    }
    installer.href = negativeArrayIndex(installer.href.split('='));
    let forgeName = negativeArrayIndex(installer.href.split('/'));
    forgeName = forgeName.replace("forge-", "");
    forgeName = forgeName.replace("-installer.jar", "");
    //let file = await newSearchRaw(installer.href);
    console.log(forgeName);

    editProjectsFile(function(data) {
      data.forgeVersion = forgeName;
      return data;
    });
    if (!needsForgeUpdate()) return;

    await newSearchRaw(installer.href, null, app.getPath("temp") + '\\forge-installer.jar');

    alert("Installing MC Forge. When prompted, press ok and do not change any settings. "+
          "Afterwards, press play again (you may need to change the profile once in the launcher)");
    var child = child_process.exec('java -jar ' + app.getPath("temp") + '\\forge-installer.jar');
    return new Promise((res, rej) => {
      child.on('close', async (code) => {
        if (needsForgeUpdate()) {
          if (dialog.showMessageBox(electron.remote.getCurrentWindow(), {type:"warning", buttons:['retry', 'cancel'], message: "You didn't install forge!"}) == 0)
            await installForge();
          else
            rej('user cancelled');
        }
        res(`child process exited with code ${code}`);
      });
    });
  }

  function check() {
    if (localStorage.profiles[0] == '!' || localStorage.launcher[0] == '!'
      || isEmpty(localStorage.profiles) || isEmpty(localStorage.launcher)) {
        alert("You must specify profile & launcher location first!");
        location.reload();
    }
      //open('menus/locate.html');
  }

}

/**
determine MC version with the most supported mods
*/
function findBestVersion() {
  var file = editProjectsFile();
  var support = {}; // stores each MC version and how many mods support it
  for (let item of file.allVersions)
    support[item] = 0;
  for (var mod of file.mods) {  // iterate through each mod in modpack
    for (var version of mod.supportedMCversions) {
      if (support[version] != undefined)
        support[version] += 1;
    }
  }
  console.log(support);
  // TODO: convert to function
  try {
    return Object.keys(support).reduce((a, b) => support[a] > support[b] ? a : b);  // return item in object with heighest value
  } catch (e) {
    alert('Add some mods before playing!');
    location.reload();
  }
}
