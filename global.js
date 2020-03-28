const PROJECTS_JSON = app.getPath('userData') + '\\projects.json';

function newSearchRaw(url, loadingLocation=undefined, downloadTo=null) {  // TODO: loading bar
   // TODO: aconvert to dedicated download function
  if (loadingLocation)
    var loading = $('<img src="assets/infinity-loading.svg" />').appendTo(loadingLocation);
  if (!isURL(url))
    url = 'https://www.curseforge.com/minecraft/mc-mods/' + url;
  console.log('FETCHING RAW ', url);

  // wrap a request in an promise
  return new Promise((resolve, reject) => {
    let req = request(url, (error, response, body) => {
      if (loadingLocation)
        loading.remove();
      if (error) { console.log(error.message);
        if (error.message.includes("getaddrinfo ENOTFOUND"))
          alert('You are not connected to the internet!');
        // TODO: cannot type in search input after alert
        reject(error); return;
      }
      if (response.statusCode != 200) {
        console.log(response); console.log(body);
        reject('Invalid status code <' + response.statusCode + '>'); return;
      }

      var fileType = response.headers["content-type"];
      console.log(fileType);
      var doc = body;
      if (fileType.includes('application/json'))
        doc = JSON.parse(body);
      else if (fileType.includes('text/html'))
        doc = new DOMParser().parseFromString(body, 'text/html');
      resolve(doc);
    });

    if (downloadTo) { console.log('DOWNLOADING TO ' + downloadTo);
      let fileStream = fs.createWriteStream(downloadTo);
      req.pipe(fileStream);
      fileStream.on('finish', function() {
        fileStream.close();  // close() is async, call cb after close completes.
      })
      .on('error', function(err) { // Handle errors
        fs.unlink(downloadTo); // Delete the file async. (But we don't check the result)
      });
    }

  });
}

function newSearch(url, loadingLocation=undefined, downloadTo=null) {
  // switched to webview to get rendered code + twitch was not working
  if (loadingLocation)
    var loading = $('<img src="assets/infinity-loading.svg" />').appendTo(loadingLocation);
  if (!isURL(url))
    url = 'https://www.curseforge.com/minecraft/mc-mods/' + url;
  console.log('FETCHING ', url);

  if (downloadTo != null) {
    ipcRenderer.send('download-to', [url, downloadTo]);
  }

  // wrap a request in an promise
  return new Promise((resolve, reject) => {
    //var webview = document.querySelector("webview");
    var webview = document.body.appendChild(document.querySelector('webview').cloneNode());
    webview.src = url;
    webview.addEventListener("ipc-message", function (e) {
      if (loadingLocation) loading.remove();
      webview.remove();
      if (e.channel === "html-content") {
        var html_contents = e.args[0];
        resolve(new DOMParser().parseFromString(html_contents, 'text/html'));
      }
    });
  });
}

ipcRenderer.on('delete-webview', function (event, text) {
  $(`webview[src="${text}"]`).remove();
});
