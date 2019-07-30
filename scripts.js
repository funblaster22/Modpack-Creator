const fs = nodeRequire('fs');
const electron = nodeRequire('electron');
var projects;

fs.readFile('projects.json', function(err, data) {
  projects = JSON.parse(data);
  $().ready(load);
});

var debug;
var selectedMod;

function load() {
  const flexbox = document.querySelector('.flex');
  
  for (var modpackName in projects) {
    var modpackDetails = projects[modpackName];
    /*var cell = document.createElement('div');
    var img = document.createElement('img');
    img.src = modpackDetails.icon;
    img.width = 50;
    img.height = 50;
    img.onclick = choosePic;
    cell.appendChild(img);
    //cell.innerHTML += modpackName;
    cell.appendChild(document.createTextNode(modpackName));
    flexbox.appendChild(cell);
  }*/
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

function choosePic(event) {
  getName(event.target);
  var iconSelector = window.open("icon-selector.html", "Icon Selector");
}

function openSettings(event) {
  getName(event.target);
  var settingsModal = window.open("settings.html", "Settings");
}

window.addEventListener("message", receiveMessage, false);

function receiveMessage(event) { console.log(event);
  if (event.origin !== "file://")
    return;  // TODO: change if hosting online

  event.source.postMessage(selectedMod, "file://");
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

function getName(elem) {
  selectedMod = elem.parentElement.innerText.trim();
}