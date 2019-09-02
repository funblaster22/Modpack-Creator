function play(target) {
  selectedMod = $(target).parent().prev('input').val();
  var file = editProjectsFile();
  var bestVersion = (file.settings.MCversion == 'Auto') ? findBestVersion(file) : file.settings.MCversion;
  console.log(bestVersion);

  let path = app.getPath('userData') + '\\profiles\\' + selectedMod + '\\mods';
  console.log(path);
  fs.mkdirSync(path, { recursive: true });
  for (var mod of file.mods) {
    var filePath = path + '\\' + mod.name + '.jar';
    if (fs.existsSync(filePath)) continue; // TODO: exception if updateOnRun set
    download(mod.name, filePath);
  }

  //start MC launcher
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
  child_process.execFile(localStorage.launcher, ['--workDir', app.getPath('userData')]);


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
    return Object.keys(support).reduce((a, b) => support[a] > support[b] ? a : b);
  }

  async function download(modName, filePath) {
    /* check for compatible mod versions then download */
    let data = await newSearch("https://api.cfwidget.com/mc-mods/minecraft/" + modName + '?version=' + bestVersion); // '/beta'
    /*for (var file of data.files) {
      // TODO: check release/beta/alpha + MC version
    }*/
    var file = await newSearch(data.download.url + '/file');
    fs.writeFile(filePath, file, "binary", (err) => {
      if (err)
        throw err;
      //TODO: incriment loading bar
    });
  }

}