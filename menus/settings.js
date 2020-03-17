var file, projectJSON;

function openSettings(event) {
  //let html = fs.readFileSync('settings.html');
  file = JSON.parse(fs.readFileSync(PROJECTS_JSON));
  projectJSON = file[selectedModpack];
  console.log(projectJSON);
  var settings = document.getElementById('settings').content.cloneNode(true);
  detailDiv.appendChild(settings);
  multirange(document.querySelector('input[multiple]'));
  $('input[disabled]').removeAttr("disabled");

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

  var bestVersion = findBestVersion();
  for (var version of projectJSON.allVersions) {
    let temp = $('<th>'+ version +'</th>').appendTo('#installed-mods tr');
    if (version == bestVersion) {
      $('<span class=help title="Most compatible MC version (used when set to auto)"></span>')
        .prependTo(temp);
      temp.attr('id', "best-version");
    }
  }

  // display installed mods
  for (var mod of projectJSON.mods) {
    let row = document.createElement('tr');
    let card = document.createElement('td');
    card.innerText = mod.name + '    ';
    card.className = 'search';
    card.data = {urlName: mod.name}  // TODO for compatibility with scanMod()
    $('<button onclick="scanMod(this)">Remove</button>').appendTo(card);

    row.appendChild(card);
    document.getElementById('installed-mods').appendChild(row);

    for (var version of projectJSON.allVersions) {
      let cell = document.createElement('td');
      if (mod.supportedMCversions.includes(version))
        cell.innerText = 'X';
      row.appendChild(cell);
    }
  }

  changeTextareaSetting($('[name=JVMArgs]')[0], false)
  prepMemSlider()
  initTooltips();
}

function prepMemSlider() {
  const totalRAM = Math.floor(os.totalmem() / 1e9); // in gb
  //memUpdateHandler(document.querySelector('.multirange'));
  $('.settings #memory input:not(.multirange)').attr('max', totalRAM * 1000);
  var i = 0;
  for (var range of document.querySelectorAll('#memory > div > span')) {
    var gb = i + totalRAM * Number.parseInt(range.style.width) / 100;
    range.innerText = `${i}-${gb} GB`;
    i = gb;
  }

  editProjectsFile(function(data) {
    $('#mem-min').val(data.settings.memoryMin);
    $('#mem-max').val(data.settings.memoryMax);
    memUpdateHandler(document.getElementById("mem-max"));
  });
}

/**
@param {HTMLInputElement} self
*/
function memUpdateHandler(self) {
  const totalRAM = Math.floor(os.totalmem() / 1e9) * 1000; // in mb
  if (self.classList.contains('multirange')) {
    $('#mem-min').val(totalRAM * self.valueLow / 100);
    $('#mem-max').val(totalRAM * self.valueHigh / 100);
  } else {
    var maxVal = Number.parseInt(self.max);
    // ensure memory within range
    self.value = (self.value < 0) ? 0 : (self.value > maxVal) ? maxVal : self.value;
    document.querySelector(".multirange").value = $('#mem-min').val() / totalRAM * 100
      + "," + $('#mem-max').val() / totalRAM * 100;
  }

  // save to file
  editProjectsFile(function(data) {
    data.settings.memoryMin = Math.min(document.getElementById('mem-min').valueAsNumber, document.getElementById('mem-max').valueAsNumber);
    data.settings.memoryMax = Math.max(document.getElementById('mem-min').valueAsNumber, document.getElementById('mem-max').valueAsNumber);
    return data;
  });
}

/**
Store/retrieve settings data for any input text element
@param {HTMLInputElement} elem
@param {Boolean} save - wheather to write new value to projects file or load
*/
function changeTextareaSetting (elem, save=false) {
  editProjectsFile(function(data) {
    if (save) {
      data.settings[elem.name] = elem.value;
      return data;
    }
    elem.value = data.settings[elem.name];
  });
}

function changeSetting (event) {
  var target = event.target;
  var selected = target.querySelector('option:checked').innerText;
  projectJSON.settings[event.target.id] = selected;
  file[selectedModpack] = projectJSON;
  fs.writeFileSync(PROJECTS_JSON, JSON.stringify(file, null, 2));
}

function changeName(self) {  // TODO: retain order or add sort by (name, played, custom)
  file[self.value] = file[selectedModpack];
  delete file[selectedModpack];
  var prefix = app.getPath('userData') + '\\profiles\\';
  fs.renameSync(prefix + makeSafe(selectedModpack), prefix + makeSafe(self.value));
  fs.writeFileSync(PROJECTS_JSON, JSON.stringify(file, null, 2));
  selectedModpack = self.value;
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
    fs.writeFileSync(PROJECTS_JSON, JSON.stringify(file, null, 2));
    closeTab();
    modpackContainer.remove();
  }
}
