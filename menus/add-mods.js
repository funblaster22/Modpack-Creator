function editProjectsFile(editFunc) {  // TODO: rename to projectsFile
  let data = JSON.parse(fs.readFileSync('projects.json'));
  let modInfo = data[selectedMod];
  if (!editFunc) {
    return modInfo;
  }
  data[selectedMod] = editFunc(modInfo);
  console.log(data);
  if (data[selectedMod] != null)
    fs.writeFileSync('projects.json', JSON.stringify(data, null, 2))
}

function addMods() {
  detailDiv.innerHTML = `<input placeholder="Search Query or URL to downloads" autofocus />
    <span class=help title="Enter mod name to search Curseforge, enter URL of other (non-Curse) download page"></span>`;
  var searchBox = detailDiv.querySelector('input');
  searchBox.addEventListener('change', parseSearch);
  initTooltips();
}

function newSearch(url, loadingLocation=undefined, downloadTo=null) {  // TODO: loading bar
  if (loadingLocation)
    var loading = $('<img src="assets/infinity-loading.svg" />').appendTo(loadingLocation);
  if (!isURL(url))
    url = 'https://www.curseforge.com/minecraft/mc-mods/' + url;
  console.log('FETCHING ', url);

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

async function parseSearch(event) {
  let file = editProjectsFile();
  var mods = []; // change to installedMods
  for (var mod of file.mods) {
    mods.push(mod.name);
  }
  console.log(mods);

  let query = event.target.value;
  if (isURL(query)) {
    addUnknownMod(query);
    return;
  }

  $('.search').remove();
  var doc = await newSearch("search?search=" + query, detailDiv);

  var items = doc.querySelectorAll('.project-listing-row');
  items.forEach(function (item, index) { console.log(item);
    var data = {};
    data.title = item.querySelector('h3').innerText.trim();
    data.link = 'https://www.curseforge.com' + $(item.querySelector('h3').parentElement).attr('href');
    data.description = item.querySelector('p').innerText.trim();
    data.icon = item.querySelector('img').src;
    data.author = item.children[0].children[1].children[2];
    data.urlName = data.link.split('/');
    data.urlName = data.urlName[data.urlName.length-1];
    console.log(data);

    var container = document.getElementById('search-card').content.cloneNode(true);
    fillTemplate(container, {
      '.title': data.title,
      '.author': data.author,
      '.description': data.description,
      '.tags': 'tags',
      '.add': (mods.includes(data.urlName)) ? 'Remove' : 'Add',
      'img': {src: data.icon },
      '.search': {data: data}
    });
    detailDiv.appendChild(container);
  });
  $('<h4 class=search>No More Results</h1>').appendTo(detailDiv);
}

async function showDetails(target) {
  var searchCard = $(target).closest('.search')[0];
  var dropdown = searchCard.querySelector('.fas');
  if (dropdown.classList.contains('fa-caret-down')) {  // toggle show detail
    dropdown.className = dropdown.className.replace('fa-caret-down', 'fa-caret-up');
    var doc = await newSearch(searchCard.data.link, searchCard.querySelector('.detail'));

    searchCard.querySelector('.detail').innerHTML = doc.querySelector('.project-detail__content').innerHTML;
    $('.detail a').on('click', function(event) {
      event.preventDefault();
      shell.openExternal(event.target.href);
    });
    $('.detail img').css('maxWidth', '100%');
  }
  else { // toggle hide detail
    dropdown.className = dropdown.className.replace('fa-caret-up', 'fa-caret-down');
    $(searchCard.querySelector('.detail')).empty();
  }
}

async function findDependencies(searchCard) {
  let dependencies = [];
  var doc = await newSearch('https://www.curseforge.com/minecraft/mc-mods/' + searchCard.data.urlName + '/relations/dependencies')
  doc.querySelectorAll('.project-listing-row').forEach(function(item, index) {
    item = item.querySelector('h3');
    item = item.parentElement.href.split('/');
    dependencies.push(item[item.length-1]);
  })
  return dependencies;
}

function calcAllVersions(startValues) {
  let mods = editProjectsFile().mods;
  let allVersions = startValues || [];
  for (var mod of mods) { for (var MCversion of mod.supportedMCversions) {
    if (!allVersions.includes(MCversion)) {
      allVersions.push(MCversion);
    }
  }}
  return allVersions;
}

async function scanMod(self) {
  var searchCard = $(self).closest('.search')[0];
  if (self.innerText == 'Add') {
    self.innerText = 'Remove';
    var data = await newSearch('https://api.cfwidget.com/minecraft/mc-mods/' + searchCard.data.urlName, self)
    console.log(data);
    let versions = Object.keys(data.versions);
    let dependencies = await findDependencies(searchCard);
    editProjectsFile(function(file) {
      file.allVersions = calcAllVersions(versions);
      file.mods.push({
        name: searchCard.data.urlName,
        dependencies: dependencies,
        supportedMCversions: versions
      });
      return file;
    });
  }
  else if (self.innerText == 'Remove') {
    self.innerText = 'Add';
    editProjectsFile(function(file) {
      var index = 0;
      for (var mod of file.mods) { // find modName in list
        if (mod.name == searchCard.data.urlName)
          break;
        index += 1;
      }
      file.mods.splice(index, 1);
      return file;
    });
  }
}

async function addUnknownMod(modUrl) {
  try {  // ensure valid URL
    let website = await newSearch(modUrl);
    let websiteText = website.body.innerText;
    var versions = [];
    for (var match of websiteText.matchAll(/(Minecraft|MC) ([0-9]+\.[0-9]+)/gim)) {
      if (!versions.includes(match[2]))
        versions.push(match[2]);  // strip so only version number remains
    }
  } catch(err) {
    alert(err);
    return;
  }
  console.log(versions);

  const shortName = await prompt({
    title: 'New Mod',
    label: 'Mod Name:',
    icon: 'profile.png',
    height: 150,
    inputAttrs: {
      type: 'text', required: true
    }
  });
  if (isEmpty(shortName)) return;

  editProjectsFile(function(file) {
    file.allVersions = calcAllVersions(versions);
    file.mods.push({
	  name: shortName.toLowerCase(),
      url: modUrl,
      dependencies: [],
      supportedMCversions: versions
    });
    return file;
  });
}

function fillTemplate(template, dictionary) {
  for (var [selector, value] of Object.entries(dictionary)) { //console.log(selector, value)
    selector = template.querySelector(selector);
    if (typeof(value) == 'string') { // simply change innerText
      value = {'innerText': value}
    }
    if (value.tagName == undefined) { // allow programmer to specify specific attributes
      for (var [operation, text] of Object.entries(value)) {
        selector[operation] = text;
      }
    } else { // make template (param) element match specified attributes (in 'template' attr) of another node
      var copyAttr = $(selector).attr('template').split(' ');  // TODO: automaticly fix relative links
      for (var attr of copyAttr) {
        var attrVal = $(value).attr(attr);
        $(selector).attr(attr, attrVal);
      }
      selector.innerText = value.innerText;
    }
  }
}
