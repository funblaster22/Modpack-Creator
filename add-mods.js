const request = nodeRequire('request');
const { shell } = nodeRequire('electron');
var loading;
//var webview;

function addMods() {
  detailDiv.innerHTML = '<input placeholder="Search Query or URL to downloads" /><span>?</span>'
  var searchBox = detailDiv.querySelector('input');
  searchBox.addEventListener('change', search);
  loading = $('<div><img src="infinity-loading.svg" /></div>')
    .appendTo(detailDiv)
    .hide();
  /*detailDiv.innerHTML += '<webview src="https://www.curseforge.com/minecraft/mc-mods/search" style="height:100%" />';
  webview = document.querySelector('webview');
  webview.addEventListener('dom-ready', edit);

  webview.addEventListener('console-message', (e) => {
    console.log('Guest page logged a message:', e.message)
  });*/// README:  leftover from embeded webview
}

function search(event) {
  let query = event.target.value;
  loading.show();
  $('.search').remove();
  request({
    uri: "https://www.curseforge.com/minecraft/mc-mods/search?search=" + query,
  }, parseSearch);
}

function parseSearch(error, response, body) { loading.hide();
  if (error) {
    alert('You are not connected to the internet!');
    closeTab();
  }

  var doc = new DOMParser().parseFromString(body, 'text/html');
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
      '.tags': 'tags' });
    detailDiv.appendChild(container);
  });
  $('<h4 class=search>No More Results</h1>').appendTo(detailDiv);
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

/*function edit() {  // remove header + footer
  webview.executeJavaScript("document.querySelector('.flex-none').remove();");
  webview.executeJavaScript("document.querySelector('footer').remove();");
  webview.executeJavaScript(`$('a:contains("Install")').remove();`);
  webview.executeJavaScript(`$('a').click(function(e) { e.preventDefault(); });`);
  webview.executeJavaScript(`$('a:contains("Download")').click(function(event) {
    $(this).text('Added!')
    console.log('DOWNLOADING ' + this.href.split('/')[5]);
  })
  .text('Add');`);
}*/// README:  leftover from embeded webview
