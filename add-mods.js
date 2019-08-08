const request = nodeRequire('request');
const { shell } = nodeRequire('electron');

function addMods() {
  detailDiv.innerHTML = `<input placeholder="Search Query or URL to downloads" />
    <span class=help title="Enter mod name to search Curseforge, enter URL of other (non-Curse) download page"></span>`;
  var searchBox = detailDiv.querySelector('input');
  searchBox.addEventListener('change', parseSearch);
  initTooltips();
}

function newSearch(url, loadingLocation=undefined) {
  if (loadingLocation)
    var loading = $('<img src="infinity-loading.svg" />').appendTo(loadingLocation);
  if (!/^https?:\/\//.test(url))
    url = 'https://www.curseforge.com/minecraft/mc-mods/' + url;
  // wrap a request in an promise
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (loadingLocation)
        loading.remove();
      if (error) { reject(error); alert('You are not connected to the internet!'); }
      if (response.statusCode != 200)
        reject('Invalid status code <' + response.statusCode + '>');

      var fileType = response.headers["content-type"]
      console.log(fileType);
      var doc;
      if (fileType.includes('application/json'))
        doc = JSON.parse(body);
      else if (fileType.includes('text/html'))
        doc = new DOMParser().parseFromString(body, 'text/html');
      resolve(doc);
    });
  });
}

async function parseSearch(event) {
  let query = event.target.value;
  var doc = await newSearch("search?search=" + query, detailDiv);

  var items = doc.querySelectorAll('.project-listing-row');
  items.forEach(function (item, index) { console.log(item);
    let title = item.querySelector('h3').innerText.trim();
    let link = 'https://www.curseforge.com' + $(item.querySelector('h3').parentElement).attr('href');
    let description = item.querySelector('p').innerText.trim();
    let icon = item.querySelector('img').src;
    let author = item.children[0].children[1].children[2];
    console.log(title, link, description, icon, author);

    var container = document.getElementById('search-card').content.cloneNode(true);
    fillTemplate(container, {
      '.title': title,
      '.author': author,
      '.description': description,
      '.tags': 'tags',
      'img': {src: icon },
      '.search': {link: link}
    });
    detailDiv.appendChild(container);
  });
  $('<h4 class=search>No More Results</h1>').appendTo(detailDiv);
}

async function showDetails(target) {
  var searchCard = target.parentElement.parentElement;
  var dropdown = searchCard.querySelector('.fas');
  if (dropdown.classList.contains('fa-caret-down')) {  // toggle show detail
    dropdown.className = dropdown.className.replace('fa-caret-down', 'fa-caret-up');
    var doc = await newSearch(searchCard.link, searchCard.querySelector('.detail'));

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
