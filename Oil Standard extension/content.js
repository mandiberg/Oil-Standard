//
// UPDATE ON 07/26/18 by Danara Sarioglu:
// ======================================
// With the latest update Oil Standard is turned into standalone chrome extention.
// It uses chrome storage to store state and local storage to store oil barrel price.
// Also I have created a new getEachNews() function that fetches rss feed and stores in local storage.
// The price data is fetched from http://www.cmegroup.com/CmeWS/mvc/Quotes/Future/424/G?
//
// If you want to add this extention to chrome as an unpacked extention use the following instructions:
// - Download the extention folder (Oil Standard extention folder)
// - Visit chrome://extensions (via omnibox or menu -> Tools -> Extensions).
// - Enable Developer mode by ticking the checkbox in the upper-right corner.
// - Click on the "LOAD UNPACKED" tab.
// - Select the directory containing your unpacked extension.

// --------------------------------------------------------------------
//
// ==UserScript==
// @name			Oil Standard
// @namespace		http://www.turbulence.org/Works/oilstandard
// @description		Converts all USD currency information into barrels of crude oil
// @version        	0.2.2
// @date           	2007-10-18
// @creator        	Michael Mandiberg (Michael [at] Mandiberg [dot] com)
// @include			*
// @exclude			http://mail.google.com/*
// @grant GM_getValue
// @grant GM_setValue
// @grant GM_xmlhttpRequest
// ==/UserScript==
//
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// To install, you need Greasemonkey: http://greasemonkey.mozdev.org/
// Then restart Firefox and revisit this script.
// Under Tools, there will be a new menu item to "Install User Script".
// Accept the default configuration and install.
//
// To uninstall, go to Tools/Manage User Scripts,
// select "Oil Standard", and click Uninstall.
// --------------------------------------------------------------------


/*

#################
Oil Standard v0.2
#################

XPI GUID {5a4f2051-20a2-42ad-a8bf-d2a23abe24e8}

This is a Greasemonkey script that changes all prices on a web page
into the equivalent value in barrels of crude oil.

A Play on words: Gold Standard... Standard Oil...

Written by Michael Mandiberg (Michael [at] Mandiberg [dot] com)

Lives at http://www.turbulence.org/Works/oilstandard

Oil Standard is a 2006 commission of New Radio and Performing Arts, Inc.,
(aka Ether-Ore) for its Turbulence web site. It was made possible with
funding from the Jerome Foundation and New York City Department of Cultural
Affairs.

###################
BARRELS AND GALLONS
###################

1 Barrel = 42 Gallons

############
INSTRUCTIONS
############

0. Read the entire instructions before installing

1. If you do not have the Firefox browser, you will need to download and
install it from: http://www.mozilla.com/firefox/

2. If you do not have the Greasemonkey extension installed, you will need
to download and install it from here: http://greasemonkey.mozdev.org/

What is Greasemonkey? Greasemonkey is an official extension for Mozilla
Firefox that allows the user to change the look, content, or function of
a webpage, by writing client side DHTML into a page. The Greasemonkey
extension makes Oil Standard possible. You can find out more here

2.5 Restart Firefox (Quit the application and open it again)

3. Click on the link below to go to the Oil Standard script. You should
see an "Install" button on the upper right of your browser window. Click
install.

Oil Standard Script: http://turbulence.org/Works/oilstandard/oilstandard.user.js

3.5 Browsing pages other than Oil Standard: Pages with prices on them!
For Mac OS X, you may need to refresh the pages you are browsing
(sometimes you need to do this twice) For Win XP, and Linux you may also
need to restart Firefox (again!)

4. The first page you browse after installing the script will ask you
whether you want to see prices in Dollars-and-Oil, or Oil-Only. Click
"cancel" for Oil-Only, otherwise, click "OK" or hit enter for Dollars-and-Oil.

Reset Preferences:

Too reset the Dollars-and-Oil, or Oil-Only preference, please visit the
Reset Preferences page, where you will be prompted again to choose.

Disable the script temporarily:

Disable the script via the Greasemonkey menu in the bottom right corner
of your browser. See the little Greasemonkey: clicking on the monkey once
will disable Greasemonkey (clicking again, will re-enable it.)

De-Installation Instructions:

Remove the script by right-clicking (mac or pc)/control-clicking (mac) on
the little monkey, and selecting "Manage User Scripts." From here you can
remove the script.

###########
Change Log:
###########

v0.2	Oil price data source went offline; switched to different source
		Added new month calculation to make sure the script is using the
			60-90 futures price

#############
Known Issues:
#############

When there are mulitple Million/Billion prices in succession, it ignores
every other million suffix.


####################
Future Improvements:
####################

Set up the data retreivals to pull every hour, rather than every page load

Add other currencies in addition to USD



Find Sara's Jan 2012 comments with "//////	"



*/

(function() {
  var onlyOil;


  /// Here are the functions for converting GM functions to regular javascript for standalone chrome extention
  var keyPrefix = "oil_standard."; // I also use a '.' for seperation
  var lastPrice;
  var totalrate;
  GM_getValue = function(key, defValue) {
    var retval = window.localStorage.getItem(keyPrefix + key);
    if (!retval) {
      return defValue;
    }
    return retval;
  }

  GM_setValue = function(key, value) {
    try {
      window.localStorage.setItem(keyPrefix + key, value);
    } catch (e) {
      GM_log("error setting value: " + e);
    }
  }

  GM_deleteValue = function(key) {
    try {
      window.localStorage.removeItem(keyPrefix + key);
    } catch (e) {
      GM_log("error removing value: " + e);
    }
  }

  GM_listValues = function() {
    var list = [];
    var reKey = new RegExp("^" + keyPrefix);
    for (var i = 0, il = window.localStorage.length; i < il; i++) {
      // only use the script's own keys
      var key = window.localStorage.key(i);
      if (key.match(reKey)) {
        list.push(key.replace(keyPrefix, ''));
      }
    }
    return list;
  }
  /// end of GM converting functions
  chrome.storage.sync.get('onlyOil', function(result) {
    onlyOil = result.onlyOil;
    GM_setValue('onlyOil', onlyOil)


    var oilEntriesArray = new Array()
    var oilLinksArray = new Array()

    // set the styles
    addGlobalStyle('.oillink { color: #996633 ! important; }');
    addGlobalStyle('.updown1 { color: #009900 ! important; }');
    addGlobalStyle('.updown0 { color: #CC3300 ! important; }');


    addGlobalStyle('body div#toolTip { position:absolute;z-index:1000;width:220px;background:#000;border:2px double #fff;text-align:left;padding:5px;min-height:1em;-moz-border-radius:5px; }');
    addGlobalStyle('body div#toolTip p { margin:0;padding:0;color:#fff;font:11px/12px verdana,arial,sans-serif; }');
    addGlobalStyle('body div#toolTip p em { display:block;margin-top:3px;color:#f60;font-style:normal;font-weight:bold; }');
    addGlobalStyle('body div#toolTip p em span { font-weight:bold;color:#fff; }');

    getOnlyOil()
    getOilPrices();
    // console.log(totalrate)
    //alert("Completed the Get Oil Prices function");
    //alert("The Oil Price has been set to:" + GM_getValue("barrelprice"));

    //////	from the two alerts above, I know that csv values are coming in and
    //////	being parsed out into variables.

    //getEachNews(0,3,'http://rss.news.yahoo.com/rss/energy');
    getEachNews('https://www.rigzone.com/news/rss/rigzone_latest.aspx');
    //getEachNews(2,3,'http://app.feeddigest.com/digest3/NGHRPHO7FS.rss');

    //////	Alerts are being generated to confirm that each of these three functions is running
    //////	I think maybe only one or two are working, but it's not a problem for now


    const HundredsRegex = /\$\d\d?d?\,\d\d\d\.?\d?\d?\b/ig;
    const CurrencyRegex = /\$\d+\,?\d*\.?\d* ?.?.?i?l?l?i?o?n?\b/ig;
    const MillionsRegex = /million/ig;
    const BillionsRegex = /\$\d\d?d?\.?\d?\d? billion\b/ig;
    const TrillionsRegex = /trillion/ig;



    // tags to scan for currency values
    var allowedParents = [
      "abbr", "a", "acronym", "address", "applet", "aside", "b", "bdo", "big", "blockquote", "body",
      "caption", "center", "cite", "code", "dd", "del", "div", "dfn", "dt", "em",
      "fieldset", "font", "form", "header", "h1", "h2", "h3", "h4", "h5", "h6", "i", "iframe",
      "ins", "kdb", "li", "main", "object", "pre", "p", "q", "samp", "small", "span", "strike",
      "s", "strong", "sub", "section", "sup", "table", "tr", "tbody", "td", "th", "tt", "u", "var"
    ];

    var xpath = "//text()[(parent::" + allowedParents.join(" or parent::") + ")" +
      //" and contains(translate(., 'HTTP', 'http'), 'http')" +
      "]";
    //alert(xpath)
    var candidates = document.evaluate(xpath, document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    var loopcounter = 0;
    for (var cand = null, i = 0;
      (cand = candidates.snapshotItem(i)); i++) {
      //alert( "lol "+candidates.snapshotLength);
      //////	it seems like the document.evaluate method is working but
      //////	that something's up with the way we're accesing the XPath result object?
      // Find and replace all instances of currency
      if (CurrencyRegex.test(cand.nodeValue)) {
        var span = document.createElement("span");
        var source = cand.nodeValue;
        cand.parentNode.replaceChild(span, cand);

        CurrencyRegex.lastIndex = 0;
        for (var match = null, lastLastIndex = 0;
          (match = CurrencyRegex.exec(source));) {
          //    alert(match);
          if (MillionsRegex.test(match)) {
            var type = 1;
            findAndReplace(type, match);

          } else if (BillionsRegex.test(match)) {
            var type = 2;
            findAndReplace(type, match);
          } else if (TrillionsRegex.test(match)) {
            var type = 3;
            findAndReplace(type, match);
          }
					else if (HundredsRegex.test(match)) {
            var type = 0;
            findAndReplace(type, match);

          } else {
            var type = 0;
            findAndReplace(type, match);

          }
        }
        span.appendChild(document.createTextNode(source.substring(lastLastIndex)));
        span.normalize();
        loopcounter++;
      }
    }
    // get oil news RSS feed
    function getEachNews(newsLink) {
      fetch(newsLink).then((res) => {
        res.text().then((xmlTxt) => {
          var domParser = new DOMParser();
          let doc = domParser.parseFromString(xmlTxt, 'text/xml');
          // alert(doc);
          // var news = [];
          var x = 0;
          doc.querySelectorAll('item').forEach((item) => {
            GM_setValue("news" + x.toString(), item.querySelector('title').textContent);
            x++;
          })
          // alert(news);
        })
      })
    }
    //end getEachNews
    function findAndReplace(type, match) { //1
      // Find and replace all instances of currency
      span.appendChild(document.createTextNode(source.substring(lastLastIndex, match.index)));

      //assign gallon units e.g. millions billions
      var units = new Array(" Barrels Oil", " Million Barrels Oil", " Billion Barrels Oil", " Trillion Barrels Oil");
      var updownarray = new Array("data:image/gif,GIF89a%0A%00%0E%00%91%03%00%CC%88r%99%00%00%CC3%00%FF%FF%FF!%F9%04%01%00%00%03%00%2C%00%00%00%00%0A%00%0E%00%00%02%1A%9C%8F%A9%CB%0B%01%15%10%22Hj%D3%AC%97%9BM%85%1C%18f%03i~%98%93%16%00%3B", "data:image/gif,GIF89a%0A%00%0E%00%A2%00%00%00%99%00%00f%003%993%CC%FF%CC%C0%C0%C0%00%00%00%00%00%00%00%00%00!%F9%04%01%00%00%04%00%2C%00%00%00%00%0A%00%0E%00%40%03%1FH%BA%BC%03%204%F2%84l%23%E8%C9)%FC%16%F3D%5D%99M%23%10z%1Fx%B1%AF%03%C5e%02%00%3B");
      //var units = ' Gallons Crude Oil)';

      totalrate = GM_getValue("barrelprice");

      var rate = totalrate;
      var totalchange = GM_getValue("changebarrel");
      totalchange = totalchange.replace("+", "");
      totalchange = totalchange.replace("-", "");

      totalchange = parseFloat(totalchange);

      var ratechange = totalchange;
      var updown = GM_getValue("increase");
      var amt = match[0].replace("$", "");
      amt = amt.replace(",", "");
      var converted = parseInt(parseFloat(amt) / rate * 100) / 100; //approximation to have 2 digits after the .
      var change = parseInt(ratechange * converted * 100) / 100; //approximation to have 2 digits after the .
      if (type == 3) {
        if (converted < 1){
          type = 2;
          converted = converted*1000
        }
      }

      change += "";
      var txtchange = change.replace("0.", ".");
      var updownstyle = "updown" + updown;
      var url = GM_getValue("linkkey" + loopcounter);
      var title = GM_getValue("news" + loopcounter.toString());
      var origtext = match[0] + ' ';
      var linktext = converted + units[type];
      var orig = document.createElement("span");

      // console.log("ok here after promise --> " + onlyOil);
      if (onlyOil == "no") {
        // console.log("hmmmmm")
        orig.appendChild(document.createTextNode(origtext));
        span.appendChild(orig);

        var a = document.createElement("a");
        a.setAttribute("class", "oillink");
        a.setAttribute("href", url);
        a.setAttribute("title", title);
        a.appendChild(document.createTextNode('('));
        span.appendChild(a);
      }

      var drop = document.createElement("img");
      drop.setAttribute("src", "data:image/gif,GIF89a%06%00%0D%00%C4%1F%00%9Bu%25%C2%AAz%B4%97%5C%8Fd%0B%C6%B0%83%B7%9Cc%C0%A9w%BF%A7u%9Cv(%E1%D6%BE%F4%F0%E7%F8%F6%F0%90f%0E%F0%EA%DF%D7%C8%A9%9As%22%E8%DF%CD%C8%B2%86%A1%7D3%BA%9Fh%B8%9De%97o%1D%CF%BC%95%98q%1F%BA%A0i%EF%E9%DC%FE%FD%FC%BB%A1l%C5%AF%81%8C%60%05%FF%FF%FF%FF%FF%FF!%F9%04%01%00%00%1F%00%2C%00%00%00%00%06%00%0D%00%00%055%E0%F7%25%99(Z%8E%F9%15%81%FAH%26%D4u%E5%87!%1D%F6-%14%D7%0D%8AHc33%14%3C%C4%CE%C5%E0%F1u%18%13%8Fc%86%20%08%003%8B%E6P%B9p4!%00%3B");
      drop.setAttribute("border", 0);
      span.appendChild(drop);

      var a = document.createElement("a");
      a.setAttribute("class", "oillink");
      a.setAttribute("href", url);
      a.setAttribute("title", title);
      a.appendChild(document.createTextNode(linktext));
      span.appendChild(a);

      if (onlyOil == "no") {
        var a = document.createElement("a");
        a.setAttribute("class", "oillink");
        a.setAttribute("href", url);
        a.setAttribute("title", title);
        a.appendChild(document.createTextNode(') '));
        span.appendChild(a);
      }
      lastLastIndex = CurrencyRegex.lastIndex;
    }
    addTooltip()
  });

})();
//alert("end main function");
//////	As far as I know, the add-on is not making it through to this alert

//end main function

// turn the links into an oil color

function addGlobalStyle(css) {
  var head, style;
  head = document.getElementsByTagName('head')[0];
  if (!head) {
    return;
  }
  style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = css;
  head.appendChild(style);
}

function getOilPrices() {
  // get oil price from rss feed of yahoo finance prices
  // removed july 28 06, as xanadb.com went offline.
  GM_xmlhttpRequest({
    method: 'GET',
    url: 'https://www.cmegroup.com/CmeWS/mvc/Quotes/Future/424/G?',

    onload: function(responseDetails) {
      var obj = JSON.parse(responseDetails.responseText);
      lastPrice = obj.quotes[0].last;
      GM_setValue("barrelprice", parseFloat(lastPrice));
      GM_setValue("changebarrel", obj.quotes[0].change);
      GM_setValue("increase", 3);
      chrome.storage.sync.set({
        'barrelprice': parseFloat(lastPrice)
      }, function() {});
    }
  });
}

function getOnlyOil() {

  var reset = window.location.host;
  // alert(reset)
  reset = reset.replace("www.", "");
  reset = reset.replace(" ", "");
  reset = reset.replace("/", "");
  var resetPage = 'oilstandard.therealcosts.com';
  var onlyOil;
  var onlyPrompt = 'Do you want to see only prices in Oil? \n \nThe default setting is to display the original price, followed by the price in Oil. \n \nIf you want to see ONLY prices in oil, please type "yes." \n\n Leave this empty to default to Dollars and Barrels of Oil.\n \n After clicking, please refresh!';
  chrome.storage.sync.get('onlyOil', function(result) {
    onlyOil = result.onlyOil;
    if (!(onlyOil) || reset == resetPage) {
      respConfirm();
    }
  });

}

function respConfirm() {
  var response = confirm('Do you want to see only prices in Oil? \n \nThe default setting is to display the original price, followed by the price in Oil. \n \nIf you want to see ONLY prices in oil, please click "Cancel" \n\n Click "OK" or hit Return for Dollars and Barrels of Oil.\n \n After clicking, please refresh! \n\n To reset this preference, click "Reset Preferences" from the Oil Standard homepage');

  if (response) {
    var onlyOilValue = "no";
    chrome.storage.sync.set({
      'onlyOil': onlyOilValue
    }, function() {});
  } else {
    var onlyOilValue = "yes";

    chrome.storage.sync.set({
      'onlyOil': onlyOilValue
    }, function() {});
  }
}

function addTooltip() {

  /*
  Sweet Titles (c) Creative Commons 2005
  http://creativecommons.org/licenses/by-sa/2.5/
  Author: Dustin Diaz | http://www.dustindiaz.com
  */

  var newevent = "Array.prototype.inArray = function (value) {var i;for (i=0; i < this.length; i++) {if (this[i] === value) {return true;} }; return false;}; function addEvent( obj, type, fn ) { if (obj.addEventListener) {  obj.addEventListener( type, fn, false );  EventCache.add(obj, type, fn);} else if (obj.attachEvent) {  obj['e'+type+fn] = fn;  obj[type+fn] = function() { obj['e'+type+fn]( window.event ); };  obj.attachEvent( 'on'+type, obj[type+fn] ); EventCache.add(obj, type, fn);} else { obj['on'+type] = obj['e'+type+fn];}} var EventCache = function(){  var listEvents = [];  return {   listEvents : listEvents,   add : function(node, EventName, fHandler){    listEvents.push(arguments);   },   flush : function(){    var i, item;    for(i = listEvents.length - 1; i >= 0; i = i - 1){     item = listEvents[i];     if(item[0].removeEventListener){ item[0].removeEventListener(item[1], item[2], item[3]); }; if(item[1].substring(0, 2) != 'on'){ item[1] = 'on' + item[1];  };  if(item[0].detachEvent){      item[0].detachEvent(item[1], item[2]);     }; item[0][item[1]] = null; }; } }; }(); addEvent(window,'unload',EventCache.flush);";
  var sweettitles = "var sweetTitles = { xCord : 0,yCord : 0,tipElements : ['a'],obj : Object,tip : Object,active : 0,init : function() {if ( !document.getElementById ||!document.createElement ||!document.getElementsByTagName ) {return;}var i,j;this.tip = document.createElement('div');this.tip.id = 'toolTip';document.getElementsByTagName('body')[0].appendChild(this.tip);this.tip.style.top = '0';this.tip.style.visibility = 'hidden';var tipLen = this.tipElements.length;for ( i=0; i<tipLen; i++ ) {var current = document.getElementsByTagName(this.tipElements[i]);var curLen = current.length;for ( j=0; j<curLen; j++ ) {addEvent(current[j],'mouseover',this.tipOver);addEvent(current[j],'mouseout',this.tipOut);current[j].setAttribute('tip',current[j].title);current[j].removeAttribute('title');}}},updateXY : function(e) {if ( document.captureEvents ) {sweetTitles.xCord = e.pageX;sweetTitles.yCord = e.pageY;} else if ( window.event.clientX ) {sweetTitles.xCord = window.event.clientX+document.documentElement.scrollLeft;sweetTitles.yCord = window.event.clientY+document.documentElement.scrollTop;}},tipOut: function() {if ( window.tID ) {clearTimeout(tID);}if ( window.opacityID ) {clearTimeout(opacityID);}sweetTitles.tip.style.visibility = 'hidden';},checkNode : function() {var trueObj = this.obj;if ( this.tipElements.inArray(trueObj.nodeName.toLowerCase()) ) {return trueObj;} else {return trueObj.parentNode;}},tipOver : function(e) {sweetTitles.obj = this;tID = window.setTimeout('sweetTitles.tipShow()',001);sweetTitles.updateXY(e);},tipShow : function() {var scrX = Number(this.xCord);var scrY = Number(this.yCord);var tp = parseInt(scrY+15);var lt = parseInt(scrX+10);var anch = this.checkNode();var addy = '';var access = '';var tipTest = anch.getAttribute('class'); if (tipTest == 'oillink'){this.tip.innerHTML = '<p>'+anch.getAttribute('tip')+'<em>'+access+addy+'</em></p>';if ( parseInt(document.documentElement.clientWidth+document.documentElement.scrollLeft) < parseInt(this.tip.offsetWidth+lt) ) {this.tip.style.left = parseInt(lt-(this.tip.offsetWidth+10))+'px';} else {this.tip.style.left = lt+'px';}if ( parseInt(document.documentElement.clientHeight+document.documentElement.scrollTop) < parseInt(this.tip.offsetHeight+tp) ) {this.tip.style.top = parseInt(tp-(this.tip.offsetHeight+10))+'px';} else {this.tip.style.top = tp+'px';}this.tip.style.visibility = 'visible';this.tip.style.opacity = '.1';this.tipFade(10);}},tipFade: function(opac) {var passed = parseInt(opac);var newOpac = parseInt(passed+10);if ( newOpac < 80 )  { this.tip.style.opacity = '.80';this.tip.style.filter = 'alpha(opacity:80)';}}};function pageLoader() {sweetTitles.init();}addEvent(window,'load',pageLoader);";

  addScript(newevent);
  addScript(sweettitles);
}

// adds a script to the head of the document
function addScript(scriptText) {
  var head = document.getElementsByTagName('head')[0];
  if (!head) {
    return;
  }
  var addScript = document.createElement("script");
  addScript.innerHTML = scriptText;
  head.appendChild(addScript);
}
// console.log(lastPrice);
