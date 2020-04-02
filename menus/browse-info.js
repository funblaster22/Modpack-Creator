function browseInfo() {
  loadInfo('Screenshots', 'screenshots', 'file');
  loadInfo('Worlds', 'saves', 'dir');
  loadInfo('Resource Packs', 'resourcepacks', 'dir'); // TODO: unzip & read resourcepacks

  function getContents(source, itemType) {
    return fs.readdirSync(source, { withFileTypes: true })
      .filter(dirent => (itemType=='dir' && dirent.isDirectory()) || (itemType=='file' && dirent.isFile()) || itemType=='all')
      .map(dirent => dirent.name);
  }

  /*** Generic function for showing screenshots, worlds, or resource packs
  @param {string} itemType - either 'dir', 'file', or 'all': represents the type of items in `folder`
  */
  function loadInfo(category, folder, itemType) {
    var template = document.getElementById('browse').content.cloneNode(true);
    folder = `${app.getPath('userData')}\\profiles\\${makeSafe(selectedModpack)}\\${folder}`;
    fillTemplate(template, {
      '.header': category,
      'button': {onclick: () => shell.showItemInFolder(folder+ ((fs.existsSync(folder)) ? "\\null" : "")) }
    });

    if (fs.existsSync(folder)) {
      for (var item of getContents(folder, itemType)) {
        var icon;
        if (itemType == 'file')
          icon = pathlib.resolve(folder, item);
        else if (itemType == 'dir') {
          icon = glob.sync(pathlib.resolve(folder, item)+'\\*.png')[0];
        }
        $(template).find('.preview').append(`<div><img src="${icon}" onerror="this.src = 'assets/missing.jpg';" />${item}</div>`);
      }
    }
    detailDiv.appendChild(template);
  }

}
