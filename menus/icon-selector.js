function choosePic(event) {
  fs.readdirSync(__dirname + '\\assets\\icons').forEach(file => {
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
  editProjectsFile(function(data) {
    data.icon = icon.getAttribute("src");
    modpackContainer.querySelector('img').src = icon.getAttribute("src");
    return data;
  });
  closeTab();
}

function uploadImg() {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'gif'] }
    ]
  }, function (files) {
      if (files !== undefined)
        changeIcon($(`<img src=${files[0]} />`)[0]);
  });
}

function base64_encode(file) {
    // read binary data
    if (!fs.existsSync(file)) file = "assets\\creeper.jpg";
    var bitmap = fs.readFileSync(file);
    var ext = pathlib.extname(file).replace('.', '');
    // convert binary data to base64 encoded string
    return `data:image/${ext};base64,` + bitmap.toString('base64');
}
