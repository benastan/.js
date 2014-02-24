(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require('./lib/craigslist.org.js');

},{"./lib/craigslist.org.js":2}],2:[function(require,module,exports){
var Scraper, ListingScraper, $frame, $modal, frameDocument;

Scraper = require('./scraper');

ListingScraper = require('./scraper/listing');

Scraper.register(ListingScraper);

$frame = $('<iframe>');

$frame
  .css({
    position: 'fixed',
    width: '100%',
    top: '0px',
    left: '0px',
    background: 'rgba(255, 255, 255, 0.7)',
    height: '400px',
    overflow: 'auto',
    height: '100%',
    margin: 'auto',
    display: 'none'
  })
  .appendTo(document.body);

frameDocument = $frame.contents();

$modal = $('<div>')
  .css({
    width: '600px',
    margin: '0 auto',
    background: 'white'
  });

$('body', frameDocument).append($modal);

$(document).on('mouseleave', 'a', function() {
  if (/craigslist\.org/.test(this.hostname)) {
    $(this).toggleClass('hover', false)
  }
});

$(document).on('mouseover', 'a', function() {
  var $target, data, html;

  $target = $(this);

  if (/craigslist\.org/.test(this.hostname)) {
    $target.toggleClass('hover', true);

    $.get(this.href).success(function(response) {
      html = response;

      data = Scraper.scrape(html);

      debugger
    });

    function wait() {
      var hovering;

      hovering = $target.hasClass('hover');

      if (! hovering) return;

      if (! html) setTimeout(wait, 100);

      else {
        // $frame.css('display', 'block')
        
        $content = $(html);

        $content.find('.bchead').remove();

        $modal.empty().append($content);
      }
    }

    setTimeout(wait, 1000);
  }
});

},{"./scraper":5,"./scraper/listing":6}],3:[function(require,module,exports){
function Node(tagName, html) {
  this.tagName = tagName;

  this.html = html;

  this.childNodes = [];
}

Node.hierarchy = 'DIV H1 H2 H3 H4 H5 H6 UL';

Node.shouldNest = function(childTagName, parentTagName) {
  var acceptsChildren, childIndex, flatten, hierarchy, parentIndex;

  hierarchy = Node.hierarchy;

  acceptsChildren = hierarchy.indexOf(parentTagName) !== -1;

  childIndex = hierarchy.indexOf(childTagName);

  parentIndex = hierarchy.indexOf(parentTagName);

  acceptChild = childIndex === -1 || parentIndex < childIndex;
  
  return acceptsChildren && acceptChild;
};

Node.prototype.shouldNest = function(childNode) {
  var childTagName, parentTagName, shouldNest;

  childTagName = childNode.tagName;

  parentTagName = this.tagName;

  shouldNest = Node.shouldNest(childTagName, parentTagName);

  return shouldNest;
};

Node.prototype.addNode = function(childNode) {
  var childNodes;

  childNodes = this.childNodes;
  
  childNodes.push(childNode);
};

module.exports = Node;
},{}],4:[function(require,module,exports){

var Node;

Node = require('./node');

function Tree($target) {
  this.target = $target.get(0);

  this.loadNodes();

  this.structureNodes();
}

Tree.prototype.loadNodes = function() {
  var children, i, ii, target, nodes;

  target = this.target;

  children = target.childNodes;

  nodes = [];

  for (i = 0, ii = children.length; i < ii; i ++) {
    var child, html, node, tagName;

    child = children[i];

    html = child.innerHTML || child.innerTEXT;

    tagName = child.tagName;

    if (! tagName) tagName = 'TEXT';

    if (html !== '') {
      node = {};

      node.html = html;

      node.tagName = tagName;

      nodes.push(node);
    }
  };

  this.nodes = nodes;

  return nodes;
}

Tree.prototype.structureNodes = function() {
  var currentNode, currentParsedNode, nextParsedNode, nodes, stack, tree;

  stack = [];

  nodes = this.nodes.slice();

  tree = new Node('DIV');

  stack.push(tree);

  while (currentNode = nodes.shift()) {
    nextParsedNode = new Node(currentNode.tagName, currentNode.html);

    currentParsedNode = stack.slice(-1)[0];
    
    while ((currentParsedNode = stack.slice(-1)[0]) && currentParsedNode.shouldNest(nextParsedNode) === false) {
      stack.pop();
    }

    currentParsedNode.addNode(nextParsedNode);
    
    stack.push(nextParsedNode);
  }

  this.tree = tree;
}

module.exports = Tree;
},{"./node":3}],5:[function(require,module,exports){
var Tree;

Tree = require('../parse/tree');

function Scraper(html) {
  this.html = html;
  this.$el = $(html);
}

Scraper.prototype.getText = function(selector) {
  var $el, $target, text;

  $el = this.$el;

  $target = $el.find(selector);

  text = $target.text().trim();

  return text;
}

Scraper.prototype.getHTML = function(selector) {
  var $el, $target, text;

  $el = this.$el;

  $target = $el.find(selector);

  text = $target.html();

  return text;
}

Scraper.prototype.parseChildren = function(selector) {
  var $children, $el, $target, tree;

  $el = this.$el;

  $target = $el.find(selector);

  tree = new Tree($target);

  return tree;
}

Scraper.register = function(scraper) {
  this.scrapers.push(scraper);
};

Scraper.scrape = function(html) {
  var data, i, ii, scraper, ScraperClass, scrapers;

  scrapers = this.scrapers;

  for (i = 0, ii = scrapers.length; i < ii; i ++) {
    ScraperClass = scrapers[i];

    scraper = new ScraperClass(html);

    data = scraper.scrape();

    if (data) break;
  }

  return data;
};

Scraper.scrapers = [];

module.exports = Scraper;
},{"../parse/tree":4}],6:[function(require,module,exports){
var Scraper;

Scraper = require('./index');

function Listing(html) {
  Scraper.call(this, html);
}

Listing.prototype = new Scraper('');

Listing.prototype.getMap = function() {
  var $el, $map;

  $el = this.$el;

  $map = $el.find('#map');

  return $map;
};

Listing.prototype.getLatitude = function() {
  var $map, latitude;

  $map = this.getMap();

  latitude = $map.data('latitude');

  return latitude;
};

Listing.prototype.getLongitude = function() {
  var $map, longitude;

  $map = this.getMap();

  latitude = $map.data('longitude');

  return latitude;
};

Listing.prototype.scrape = function() {
  var $el, data;

  if (! this.shouldScrape()) return false;

  $el = this.$el;

  data = {};

  data.type = 'listing'

  data.title = this.getText('.postingtitle');

  data.latitude = this.getLatitude();

  data.longitude = this.getLongitude();

  data.body = this.getHTML('#postingbody');

  data.parsedBody = this.parseChildren('#postingbody');

  return data;
};

Listing.prototype.shouldScrape = function() {
  var $el;

  $el = this.$el;

  return $el.find('.postingtitle').length > 0 && $el.find('#postingbody').length > 0
}

module.exports = Listing;
},{"./index":5}]},{},[1])