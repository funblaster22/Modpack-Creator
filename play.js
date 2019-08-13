function findBestVersion(file) {
  var support = {};
  for (var mod of file.mods) {
    for (var version of mod.supportedMCversions) {
      if (support[version] == undefined)
        support[version] = 1;
      else
        support[version] += 1;
    }
  }
  console.log(support);
  return Object.keys(support).reduce((a, b) => support[a] > support[b] ? a : b);
}

async function download(name, bestVersion, path) { //TODO: convert to class
  let data = await newSearch("https://api.cfwidget.com/mc-mods/minecraft/" + name + '?version=' + bestVersion); // '/beta'
  /*for (var file of data.files) {
    // TODO: check release/beta/alpha + MC version
  }*/
  var file = await newSearch(data.download.url + '/file');
  fs.writeFile(path + '\\' + name + '.jar', file, "binary", (err) => {
    if (err)
      throw err;
    //incriment loading bar
  });
}

function play(target) {
  selectedMod = $(target).parent().prev('input').val();
  var file = editProjectsFile();
  var bestVersion = (file.settings.MCversion == 'Auto') ? findBestVersion(file) : file.settings.MCversion;
  console.log(bestVersion);

  let path = localStorage.MCpath + '\\profiles\\' + selectedMod + '\\mods';
  console.log(path);
  fs.mkdirSync(path, { recursive: true });
  for (var mod of file.mods) {
    if (fs.existsSync(path + '\\' + mod.name + '.jar')) continue; // TODO: exception if updateOnRun set
    download(mod.name, bestVersion, path);
  }

  //start MC
}
