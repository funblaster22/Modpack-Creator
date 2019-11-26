var file, projectJSON;

function openSettings(event) {
  //let html = fs.readFileSync('settings.html');
  file = JSON.parse(fs.readFileSync('projects.json'));
  projectJSON = file[selectedModpack];
  console.log(projectJSON);
  var settings = document.getElementById('settings').content.cloneNode(true);
  detailDiv.appendChild(settings);
  multirange(document.querySelector('input[multiple]'));
  $('input[disabled]').removeAttr("disabled");
  initTooltips();

  for (var version of projectJSON.allVersions) {  // populate MC versions
    let option = document.createElement('option');
    option.innerText = version;
    $('.allVersions').append(option);
  }
  document.querySelectorAll('select').forEach(function(item) {
    var selected = projectJSON.settings[item.id];
    $(`option:contains("${ selected }")`).attr('selected', '');
    item.addEventListener('change', changeSetting);
  });

  // display installed mods
  for (var mod of projectJSON.mods) {
    let card = document.createElement('li');
    card.innerText = mod.name + '\t';
    card.className = 'search';
    card.data = {urlName: mod.name}  // for compatibility with scanMod()
    document.getElementById('installed-mods').appendChild(card);
    $('<button onclick="scanMod(this)">Remove</button>').appendTo(card);
  }
}

function changeSetting (event) {
  var target = event.target;
  var selected = target.querySelector('option:checked').innerText;
  projectJSON.settings[event.target.id] = selected;
  file[selectedModpack] = projectJSON;
  fs.writeFileSync('projects.json', JSON.stringify(file, null, 2));
}

function changeName(self) {  // TODO: retain order or add sort by (name, played, custom)
  file[self.value] = file[selectedModpack];
  delete file[selectedModpack];
  selectedModpack = self.value;
  fs.writeFileSync('projects.json', JSON.stringify(file, null, 2));
}

function confirmDelete() {
  var result = dialog.showMessageBox({
    type: 'warning',
    message: "Are you sure you want to delete " + selectedModpack + '?',
    title: "Confirm",
    buttons: ['yes', 'no'],  // returns 1=yes, 0=no
    defaultId: 1 //doesn't work
  });
  if (result == 0) {
    console.log('deleted');
    delete file[selectedModpack];
    fs.writeFileSync('projects.json', JSON.stringify(file, null, 2));
    closeTab();
    modpackContainer.remove();
  }
}
