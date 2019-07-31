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
  cell.querySelector('span').innerText = modpackName;
  var img = cell.querySelector('img');
  img.src = modpackDetails.icon;
  img.addEventListener("click", choosePic, false);
  flexbox.appendChild(cell);
  }
  $(`<div style="border:none;"><button class=rounded-button onclick=newModpack()>New</button></div>`).appendTo('.flex');
}

function openSettings(event) {
  getName(event.target);
  //var settingsModal = window.open("settings.html", "Settings");
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
  .then((r) => {
    if($.trim(r).length === 0) {
      console.log('user cancelled');
    } else {
      console.log('result: ', r);
      var data = fs.readFileSync('projects.json');
      var projects = JSON.parse(data);
      projects[r] = {icon:''};
      fs.writeFileSync('projects.json', JSON.stringify(projects, null, 2));
      location.reload();
    }
  })
  .catch(console.error);
}

function getName(elem) {  // elem = obj that was clicked
  dad = elem.parentElement;  // dad = main elem containing all info for single modpack
  while (dad.className != '') {  // b/c buttons are nested inside another div
    console.log('up');
    elem = dad
    dad = elem.parentElement;
  }
  selectedMod = dad.innerText.trim();
  detailDiv = document.createElement('div');
  detailDiv.id = 'detail';
  $(detailDiv).insertAfter(dad);

  let previous = $(dad).prevAll().length;  // number of previous siblings (for animation)

  $('.flex').animate({
    top: -previous * $(dad).outerHeight() // replace with height of cell
  }, 1000);
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
