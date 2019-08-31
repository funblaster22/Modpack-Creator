function choosePic(event) {
  //getName(event.target);  TODO:  wait to show until animation done
  detailDiv.className = "icon-selector";

  fs.readdirSync(__dirname + '\\assets\\icons\\').forEach(file => {
    console.log(file);
    var img = document.createElement('img');
    img.src = 'assets/icons/' + file;
    img.onclick = function(event) { changeIcon(event.target) };
    detailDiv.appendChild(img);
  });
  var img = document.createElement('img');
  img.src = 'assets/upload-custom.gif';
  img.addEventListener('click', uploadImg);
  detailDiv.appendChild(img);
}

function changeIcon(icon) {
  var data = fs.readFileSync('projects.json');
  var projects = JSON.parse(data);
  projects[selectedMod].icon = icon.getAttribute("src");
  fs.writeFileSync('projects.json', JSON.stringify(projects, null, 2));
  dad.querySelector('img').src = icon.getAttribute("src");
  closeTab();
  //location.reload();   TODO:  smooth transition
}

function uploadImg() {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
    ]
  }, function (files) {
      if (files !== undefined) {
          // handle files
      }
  });
}
