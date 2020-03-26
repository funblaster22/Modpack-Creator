function editProjectsFile(editFunc) {  // TODO: rename to projectsFile
  let data = JSON.parse(fs.readFileSync(PROJECTS_JSON));
  let modInfo = data[selectedModpack];
  if (!editFunc) {
    return modInfo;
  }
  data[selectedModpack] = editFunc(modInfo);
  console.log(data);
  if (data[selectedModpack] != null)
    fs.writeFileSync(PROJECTS_JSON, JSON.stringify(data, null, 2))
}

function addMods() {
  detailDiv.innerHTML = `<input placeholder="Search Query or URL to downloads" autofocus />
    <span class=help title="Enter mod name to search Curseforge, enter URL of other (non-Curse) download page"></span>`;
  var searchBox = detailDiv.querySelector('input');
  searchBox.addEventListener('change', parseSearch);
  initTooltips();
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
    data.urlName = negativeArrayIndex(data.link.split('/'));
    data.tags = Array.from(item.querySelectorAll('figure')).map(item => item.getAttribute('title'));
    console.log(data);

    var container = document.getElementById('search-card').content.cloneNode(true);
    fillTemplate(container, {
      '.title': data.title,
      '.author': data.author,
      '.description': data.description,
      '.tags': data.tags.join('; '),
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
    if (!searchCard.data.more)
      searchCard.data.more = await newSearchRaw('https://api.cfwidget.com/minecraft/mc-mods/' + searchCard.data.urlName, searchCard.querySelector('.detail'));

    $('<div><button>X</button></div>').insertBefore(searchCard)
      .click(function() {
        if (searchCard.getBoundingClientRect().top < -30)
          detailDiv.scrollBy(0, searchCard.getBoundingClientRect().top-151);
        target.click();
      });

    searchCard.querySelector('.detail').innerHTML = searchCard.data.more.description;
    /*var iframe = document.createElement('iframe'); TODO: sanitise imput
    searchCard.querySelector('.detail').appendChild(iframe);
    iframe.setAttribute('sandbox', '');
    var doc = iframe.contentWindow.document;
    doc.open()
    doc.write(searchCard.data.more.description);
    doc.close();*/
    $('.detail a').on('click', function(event) {
      event.preventDefault();
      shell.openExternal(urllib.resolve("https://www.curseforge.com/minecraft/mc-mods/", event.target.getAttribute('href')) );
    });
    $('.detail img').css('maxWidth', '100%');
  }
  else { // toggle hide detail
    $(searchCard).prev().remove();
    dropdown.className = dropdown.className.replace('fa-caret-up', 'fa-caret-down');
    $(searchCard.querySelector('.detail')).empty();
  }
}

async function findDependencies(modName) {
  let dependencies = [];
  var doc = await newSearch('https://www.curseforge.com/minecraft/mc-mods/' + modName + '/relations/dependencies?filter-related-dependencies=3')
  doc.querySelectorAll('.project-listing-row').forEach(function(item, index) {
    item = item.querySelector('h3');
    item = item.parentElement.href.split('/');
    dependencies.push(item[item.length-1]);
  })
  return dependencies;
}

function calcAllVersions(startValues) {
  let mods = editProjectsFile().mods;
  let allVersions = [...startValues] || [];
  for (var mod of mods) { for (var MCversion of mod.supportedMCversions) {
    if (!allVersions.includes(MCversion)) {
      allVersions.push(MCversion);
    }
  }}
  return removeDuplicateVersions(allVersions);
}

function improvedCompareVersions(a, b) {
  // Sort allVersions and deal with special cases like "-Snapshot"
  if (!compareVersions.validate(a))
    a = a.replace(/-\w+/, ".0$&");
  if (!compareVersions.validate(b))
    b = b.replace(/-\w+/, ".0$&");
  return compareVersions(a, b);
}

function removeDuplicateVersions(allVersions) {
  //allVersions = editProjectsFile().allVersions;
  allVersions.sort(improvedCompareVersions);
  var versionsToDelete = [];
  for (var i=allVersions.length-1; i>0; i--) {
    if (getBaseVersion(allVersions[i]) == getBaseVersion(allVersions[i-1]) ) {
      versionsToDelete.push( ...allVersions.splice(i-1, 1) );
    }
  }
  console.log(allVersions, versionsToDelete);
  return allVersions;
}

function getBaseVersion(ver) {
  return ver.split('.').slice(0, 2).join('.')
}

async function scanMod(self) {
  var searchCard = $(self).closest('.search')[0];
  if (self.innerText == 'Add') {
    self.innerText = 'Remove';
    if (!searchCard.data.more)
      searchCard.data.more = await newSearchRaw('https://api.cfwidget.com/minecraft/mc-mods/' + searchCard.data.urlName, self);
    var data = searchCard.data.more;
    console.log(data);
    var versions = [];
    for (let version of Object.values(data.versions)) {
      // remove non-versions like "Forge" and ensure all versions reported
      versions.push(...version[0].versions.
        filter(e => {return compareVersions.validate(e) || e.includes('Snapshot')})
        );
    }
    let dependencies = await findDependencies(searchCard.data.urlName);
    editProjectsFile(function(file) {
      file.allVersions = calcAllVersions(versions);
      file.mods.push({
        name: searchCard.data.urlName,
        dependencies: dependencies,
        supportedMCversions: removeDuplicateVersions(versions)
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
