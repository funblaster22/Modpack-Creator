function play(target) {
  selectedMod = $(target).parent().prev('input').val();  //TODO: rename to selectedModpack
  var file = editProjectsFile();  //TODO: rename to modpack
  var bestVersion = (file.settings.MCversion == 'Auto') ? findBestVersion(file) : file.settings.MCversion;
  console.log('Using MC version ' + bestVersion);

  let path = app.getPath('userData') + '\\profiles\\' + selectedMod + '\\mods';
  console.log(path);
  fs.mkdirSync(path, { recursive: true });
  for (var mod of file.mods) {
    var filePath = path + '\\' + mod.name + '.jar';
    if (fs.existsSync(filePath)) continue; // TODO: exception if updateOnRun set
    downloadMod(mod, filePath);
  }

  /* start MC launcher  TODO: auto-install forge
  let profiles = JSON.parse(fs.readFileSync(localStorage.profiles)); // TODO: put in function
  let newProfile = {
    authenticationDatabase: profiles.authenticationDatabase,
    clientToken: profiles.clientToken,
    profiles : {
      selectedMod : {
        "gameDir" : app.getPath('userData') + "\\profiles\\" + selectedMod,
        "icon" : "Furnace",
        "lastVersionId" : "1.7.10-Forge10.13.4.1558-1.7.10",
        "name" : selectedMod,
        "type" : "custom"
      }
    }
  };
  console.log(newProfile);
  newProfile = JSON.stringify(newProfile, null, 2);
  fs.writeFile(app.getPath('userData') + '\\launcher_profiles.json', newProfile, (err) => {
    if (err)
      throw err;
  });
  child_process.execFile(localStorage.launcher, ['--workDir', app.getPath('userData')]);*/
  exportMClauncher();
  let versionsFolderPath = pathlib.dirname(localStorage.profiles) + '\\versions\\';
  let data = editProjectsFile()
  if (!fs.existsSync(versionsFolderPath + data.forgeVersion)) {  // check if allready installed
    installForge();
    return;
  }
  child_process.execFile(localStorage.launcher);
  console.log('Starting Launcher...');


  function findBestVersion(file) {
    /* determine MC version with the most supported mods
    param file: Object from projects.json for selected mod */
    var support = {}; // stores each MC version and how many mods support it
    for (var mod of file.mods) {  // iterate through each mod in modpack
      for (var version of mod.supportedMCversions) {  //
        if (support[version] == undefined) // if
          support[version] = 1;
        else
          support[version] += 1;
      }
    }
    console.log(support);
    // TODO: convert to function
    return Object.keys(support).reduce((a, b) => support[a] > support[b] ? a : b);  // return item in object with heighest value
  }

  async function downloadMod(modInfo, filePath) {
    /* check for compatible mod versions then download */
    let data = await newSearch("https://api.cfwidget.com/minecraft/mc-mods/" + modInfo.name + '?version=' + bestVersion); // +'/beta'
    /*for (var file of data.files) {
      // TODO: check release/beta/alpha + MC version
    }*/

    for (var dependancy of modInfo.dependencies)
      downloadMod({name: dependancy, dependencies: []}, filePath.replace('.jar', `.${ dependancy }.jar`));
    newSearch(data.download.url + '/file', null, filePath);
  }

  async function installForge() { console.log('Installing Forge...');
    let html = await newSearch(`https://files.minecraftforge.net/maven/net/minecraftforge/forge/index_${ bestVersion }.html`);
    let installer = html.querySelector('.download a[title=Installer]');  // TODO: change reccomended/latest depending on preferences
    installer.href = 'http://files.minecraftforge.net' + $(installer).attr('href');
    let forgeName = negativeArrayIndex(installer.href.split('/'));
    forgeName = forgeName.replace("forge-", "");
    forgeName = forgeName.replace("-installer.jar", "");
    let file = await newSearch(installer.href);
    console.log(forgeName);

    await newSearch(installer.href, null, app.getPath("temp") + '\\forge-installer.jar');

    editProjectsFile(function(data) {
      data.forgeVersion = bestVersion + '-forge' + forgeName;
      return data;
    });
    child_process.exec('java -jar ' + app.getPath("temp") + '\\forge-installer.jar');
  }

}
