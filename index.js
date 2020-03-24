var debug;
var selectedModpack;
var modpackContainer;
var projects;
var detailDiv;

// check if Minecraft location is defined
if (localStorage.user == null) {  // To ensure that someone doesn't distribute their exe and break program with invalid MCpath
  localStorage.user = os.homedir();
  window.open('menus/locate.html');
}
if (localStorage.user != os.homedir()) {
  localStorage.user = os.homedir();
  localStorage.removeItem("MCpath");
  window.open('menus/locate.html');
}

fs.readFile(PROJECTS_JSON, function(err, data) {
  if (err) {
    fs.writeFileSync(PROJECTS_JSON, '{}');
    data = '{}';
  }
  projects = JSON.parse(data);
  $().ready(load);
});

function load() {
  const flexbox = document.querySelector('.flex');

  for (var modpackName in projects) {
    var modpackDetails = projects[modpackName];
    var cell = document.getElementById("cell").content;
    cell = cell.cloneNode(true);
    cell.querySelector('input').value = modpackName;
    var img = cell.querySelector('img');
    img.src = modpackDetails.icon;
    flexbox.appendChild(cell);
  }
  $(`<div style="border:none;"><button class=rounded-button onclick=newModpack()>New</button></div>`).appendTo('.flex');

  if (localStorage.theme == 'dark') document.getElementById('theme').rel = 'stylesheet';
}

ipcRenderer.on('toggle-theme', function (event, text) {
  console.log('RECIEVED toggle-theme');
  if (localStorage.theme == "dark") {
    document.getElementById('theme').rel = 'disabled';
    localStorage.theme = "light";
  } else {
    document.getElementById('theme').rel = 'stylesheet';
    localStorage.theme = "dark";
  }
});

ipcRenderer.on('modpack-info', function(event, msg) {
  console.log(event, msg);
  projectJSON = editProjectsFile();
  if (msg == 'export' && projectJSON == undefined)
    alert("Select a mod to export first");
  else
    ipcRenderer.send('modpack-info', {...projectJSON, name: selectedModpack, bestVersion: findBestVersion()});
});

ipcRenderer.on('new-modpack', newModpack);

function newModpack() {
  prompt({
    title: 'New Modpack',
    label: 'Name:',
    icon: 'profile.png',
    height: 150,
    inputAttrs: {
        type: 'text', required: true
    }
  })
  .then((result) => {
    if (isEmpty(result)) {
      console.log('user cancelled');
    } else {
      console.log('result: ', result);
      var data = fs.readFileSync(PROJECTS_JSON);
      var projects = JSON.parse(data);
      projects[result] = {
        "icon": "",
        "allVersions": [],
        "mods": [],
        "settings": {
          "memoryMin": 1000,
          "memoryMax": 4000,
          "JVMArgs": "",
          "MCversion": "Auto",
          "forgeVersion": "Recommended",
          "releaseType": "Release"
        }
      };
      fs.writeFileSync(PROJECTS_JSON, JSON.stringify(projects, null, 2));
      location.reload();
    }
  })
  .catch(console.error);
}

function initTooltips() {
  $('.help').addClass('fas fa-question-circle');
  $('.help').powerTip({  //TODO: call whenever opening new tab
  	placement: 'ne',
    smartPlacement: true
  });
}

/**
@param {HTMLElement} elem = obj that was clicked
@param {string} name = name of tab (eg settings, add-mods, icon, etc)
@param {function} callback = function to call when animation complete
*/
function openTab(elem, name, callback) {
  $('input').attr("disabled", '');
  window.getSelection().removeAllRanges();
  if (detailDiv) {  //if already open
    if (detailDiv.isAnimating) return;
    if (detailDiv.className == name) closeTab();
    else {
      $('#detail *').remove();
      detailDiv.className = name;
      callback();
    }
    return;
  }

  modpackContainer = $(elem).closest('div:not(.button-container)')[0];
  // b/c buttons are nested inside another div
  selectedModpack = $(modpackContainer).find('input').val();
  detailDiv = document.createElement('div');
  detailDiv.id = 'detail';
  detailDiv.isAnimating = true;
  detailDiv.className = name;
  $(detailDiv).insertAfter(modpackContainer);

  let previous = $(modpackContainer).prevAll().length;  // number of previous siblings (for animation)

  $('.flex').animate({
    top: -previous * $(modpackContainer).outerHeight() // replace with height of cell
  }, 500, function() { detailDiv.isAnimating=false; callback(); });
  $('html').css('overflow-y', 'hidden');
}

function closeTab() {
  $('#detail *').hide();
  $('input').attr("disabled", '');
  detailDiv.isAnimating = true;
  detailDiv.style.animationName = 'detail-retract';
  $('.flex').animate({
    top: 0 // replace with height of cell
  }, 500, function() {  // run when animation finishes
    $('html').css('overflow-y', 'auto');
    detailDiv.remove();
    detailDiv = undefined;
  });
}

function negativeArrayIndex(array, negativeIndex=1) {
  return array[array.length-Math.abs(negativeIndex)];
}

function isURL(url) {
  return /^https?:\/\//.test(url);
}

function isEmpty(str) {
  return $.trim(str).length === 0;
};

function makeSafe(str) {
  return str.replace(/[^\w\d\s]/gi, '').trim();
  // Mathches everything except letters (\w), numbers (\d), or whitespace (\s)
}
