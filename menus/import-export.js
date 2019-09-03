function exportMClauncher() {
  let profile = JSON.parse(fs.readFileSync(localStorage.profiles));
  let forgeVersion = editProjectsFile().forgeVersion;
  profile.profiles[selectedMod] = {
    // don't use editProjectsFile b/c we need to create new entry
    // and it only works for this app's profiles, not Minecraft Launcher's
    "gameDir" : app.getPath('userData') + "\\profiles\\" + selectedMod,
    "icon" : "Furnace",
    "lastVersionId" : forgeVersion,
    "name" : selectedMod,
    "type" : "custom"
  }

  console.log(profile);
  let newProfile = JSON.stringify(profile, null, 2);
  fs.writeFile(localStorage.profiles, newProfile, (err) => {
    if (err)
      throw err;
  });
}
