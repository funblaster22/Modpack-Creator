function play(target) {
  selectedModpack = $(target).parent().prev('input').val();
  var file = editProjectsFile();  //TODO: rename to modpack
  var bestVersion = (file.settings.MCversion == 'Auto') ? findBestVersion(file) : file.settings.MCversion;
  console.log('Using MC version ' + bestVersion);

  let path = app.getPath('userData') + '\\profiles\\' + makeSafe(selectedModpack) + '\\mods';
  console.log(path);
  fs.mkdirSync(path, { recursive: true });
  for (var mod of file.mods) {
    var filePath = path + '\\' + mod.name + '.jar';
    if (fs.existsSync(filePath)) continue; // TODO: exception if updateOnRun set
    if (mod.url == undefined)
      downloadMod(mod, filePath);
    else {
      downloadUnknownMod(mod.url, filePath);
    }
  }

  /* start MC launcher  TODO: auto-install forge
  let profiles = JSON.parse(fs.readFileSync(localStorage.profiles)); // TODO: put in function
  let newProfile = {
    authenticationDatabase: profiles.authenticationDatabase,
    clientToken: profiles.clientToken,
    profiles : {
      selectedModpack : {
        "gameDir" : app.getPath('userData') + "\\profiles\\" + makeSafe(selectedModpack),
        "icon" : "Furnace",
        "lastVersionId" : "1.7.10-Forge10.13.4.1558-1.7.10",
        "name" : selectedModpack,
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
    let data = await newSearchRaw("https://api.cfwidget.com/minecraft/mc-mods/" + modInfo.name + '?version=' + bestVersion); // +'/beta'
    /*for (var file of data.files) {
      // TODO: check release/beta/alpha + MC version
    }*/

    for (var dependancy of modInfo.dependencies)
      downloadMod({name: dependancy, dependencies: []}, filePath.replace('.jar', `.${ dependancy }.jar`));
    newSearch(data.download.url + '/file', null, filePath);
  }

  async function downloadUnknownMod(url, savePath) {
    let res = await newSearchRaw(url);
    const baseUrl = new URL(url).origin;
    console.log("Current site: " + url);
    if (res instanceof Document) {
      for (var link of res.querySelectorAll('a[href]')) {
        let label = link.innerText;
        let href = urllib.resolve(url, $(link).attr('href'));
        console.log(href);
        if ((href.includes(bestVersion) || label.includes(bestVersion)) && href.includes(baseUrl)) { // TODO: determine if beta/alpha
          return newSearch(href, null, savePath);
        }
      }
      alert('Unable to find download link, must finish manually!');
      shell.openExternal(url);
    } else {
      newSearch(url, null, savePath); // TODO: make more efficent only one request
    }
    /*print('Current site:', mod_url)

        if r.headers['Content-Type'] == 'application/java-archive' or r.headers['Content-Type'] == 'application/zip':
            print('Downloading {}...'.format(self.mod_name))
            with open(SAVE_DIR + self.mod_name + '.jar', 'wb') as fd:
                fd.write(r.content)
        else:
            d = pq(r.content)
            for link in d('a[href]'):
                label = d(link).text()
                link = urljoin(mod_url, d(link).attr('href'))
                if self.base_url in link and (MC_VERSION in link or MC_VERSION in label) and 'pre' not in link:
                    return self.download_unknown_website(link)

            print('Unable to find download link, must finish manually!', mod_url)
            webbrowser.open_new_tab(mod_url)  # no matches found
    */
  }

  async function installForge() { console.log('Installing Forge...');
    let html = await newSearch(`https://files.minecraftforge.net/maven/net/minecraftforge/forge/index_${ bestVersion }.html`);
    let installer = html.querySelector('.download a[title=Installer]');  // TODO: change reccomended/latest depending on preferences
    // alt:  .info-link.tooltipstered[href]
    installer.href = negativeArrayIndex(installer.href.split('='));
    let forgeName = negativeArrayIndex(installer.href.split('/'));
    forgeName = forgeName.replace("forge-", "");
    forgeName = forgeName.replace("-installer.jar", "");
    //let file = await newSearchRaw(installer.href);
    console.log(forgeName);

    await newSearchRaw(installer.href, null, app.getPath("temp") + '\\forge-installer.jar');

    editProjectsFile(function(data) {
      data.forgeVersion = bestVersion + '-forge' + forgeName;
      return data;
    });
    alert("Installing MC Forge. When prompted, press ok and do not change any settings. "+
          "Afterwards, press play again (you may need to change the profile once in the launcher)");
    child_process.exec('java -jar ' + app.getPath("temp") + '\\forge-installer.jar');
  }

}
