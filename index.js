var debug;
var selectedMod;
var dad;
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

fs.readFile('projects.json', function(err, data) {
  if (err) {
    fs.writeFileSync('projects.json', '{}');
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
      var data = fs.readFileSync('projects.json');
      var projects = JSON.parse(data);
      projects[result] = {
        "icon": "",
        "allVersions": [],
        "mods": [],
        "settings": {
          "memoryMin": 1000,
          "memoryMax": 6000,
          "MCversion": "Auto",
          "forgeVersion": "Recommended",
          "releaseType": "Release"
        }
      };
      fs.writeFileSync('projects.json', JSON.stringify(projects, null, 2));
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

function openTab(elem, name, callback) {  // elem = obj that was clicked
  $('input').attr("disabled", '');
  window.getSelection().removeAllRanges();
  if (detailDiv) {  //if already open
    if (detailDiv.className == name) closeTab();
    else {
      $('#detail *').remove();
      detailDiv.className = name;
      callback();
    }
    return;
  }

  dad = elem.parentElement;  // dad = main elem containing all info for single modpack
  while (dad.className != '') {  // b/c buttons are nested inside another div
    console.log('up');
    elem = dad
    dad = elem.parentElement;
  }
  selectedMod = dad.querySelector('input').value;
  detailDiv = document.createElement('div');
  detailDiv.id = 'detail';
  detailDiv.className = name;
  $(detailDiv).insertAfter(dad);

  let previous = $(dad).prevAll().length;  // number of previous siblings (for animation)

  $('.flex').animate({
    top: -previous * $(dad).outerHeight() // replace with height of cell
  }, 500, callback);
  $('html').css('overflow-y', 'hidden');
}

function closeTab() {
  $('#detail *').hide();
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
