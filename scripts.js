//const fs = nodeRequire('fs');
const electron = nodeRequire('electron');

var debug;
var selectedMod;
var dad;
var projects;
var detailDiv;

fs.readFile('projects.json', function(err, data) {
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
}

function newModpack() {
  const prompt = nodeRequire('electron-prompt');

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
    if($.trim(result).length === 0) {
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

function getName(elem, name, callback) {  // elem = obj that was clicked  // TODO: rename to openTab
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
  }, 1000, callback);
  $('html').css('overflow-y', 'hidden');
}

function closeTab() {
  $('#detail *').hide();
  detailDiv.style.animationName = 'detail-retract';
  $('.flex').animate({
    top: 0 // replace with height of cell
  }, 1000, function() {  // run when animation finishes
    $('html').css('overflow-y', 'auto');
    detailDiv.remove();
    detailDiv = undefined;
  });
}
