var assert = require('timoxley-assert') 
  , core  = require('json-schema-core')
  , links = require('json-schema-hyper')
  , Schema = core.Schema

Schema.use(links);

var fixtures = {};


///////////////////////////////////

describe('json-schema-hyper', function(){
  describe('parse simple', function(){
    
    beforeEach( function(){
      this.subject = new Schema().parse(fixtures.parse.simple);
    })

    it('should parse', function(){ 
      console.log("subject: %o", this.subject);
    })

    it('should have links addressable by rel', function(){
      assert("list" == this.subject.$('#/links/list').get('rel'));
      assert("http://example.com/thing/{id}" == this.subject.$('#/links/self').get('href'));
      assert("application/vnd-color+json" == this.subject.$('#/links/color').get('mediaType'));
    })

    it('should have default root path (#)', function(){
      assert('#' == this.subject.get('links').rootPath);
    })

  })

  describe('parse root link', function(){

    beforeEach( function(){
      this.subject = new Schema().parse(fixtures.parse.rootlink);
    })

    it('should parse', function(){ 
      console.log("subject: %o", this.subject);
    })

    it('should parse root link as property of the links', function(){
      assert('#/items/root' == this.subject.get('links').rootPath);
    })

    it('should not create a link object in the tree for the root link', function(){
      var links = this.subject.get('links')
      assert(links);
      assert(!links.has('root'));
    })

  })

  describe('resolve links, simple instance', function(){

    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.simple);
      this.instance = fixtures.instance.simple;
    })

    it('should resolve each link', function(){
      var act = this.subject.resolveLinks(this.instance);
      console.log("resolved links: %o", act);
      assert(act.list.get('href') == "http://example.com/thing");
      assert(act.self.get('href') == "http://example.com/thing/123");
      assert(act.color.get('href') == "http://example.com/thing/123/color/mauve");
    })

    it('should not resolve link with unknown variable', function(){
      var act = this.subject.resolveLinks(this.instance);
      assert(!act.unknown);
    })

  })

  describe('resolve links, array instance', function(){

    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.simple);
      this.instance = fixtures.instance.multi;
    })

    it('each link rel should have items for each instance record', function(){
      var act = this.subject.resolveLinks(this.instance);
      console.log("resolved links: %o", act);
      assert(3==act.list.length);
      assert(3==act.self.length);
      assert(3==act.color.length);
    })

    it('should resolve links for each instance record', function(){
      var act = this.subject.resolveLinks(this.instance);
      assert(act.list[0].href == "http://example.com/thing");
      assert(act.self[0].href == "http://example.com/thing/345");
      assert(act.color[0].href == "http://example.com/thing/345/color/peach");
      assert(act.list[1].href == "http://example.com/thing");
      assert(act.self[1].href == "http://example.com/thing/678");
      assert(act.color[1].href == "http://example.com/thing/678/color/cream");
      assert(act.list[2].href == "http://example.com/thing");
      assert(act.self[2].href == "http://example.com/thing/901");
      assert(act.color[2].href == "http://example.com/thing/901/color/cyan");
    })

  })

  describe('resolve links, specified root', function(){

    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.rootlink);
      this.instance = fixtures.instance.rootlink;
    })

    it('should resolve each link', function(){
      var act = this.subject.resolveLinks(this.instance);
      console.log("resolved links: %o", act);
      assert(act.list.get('href') == "http://example.com/thing");
      assert(act.self.get('href') == "http://example.com/thing/123");
      assert(act.color.get('href') == "http://example.com/thing/123/color/mauve");
    })

  })

  describe('resolve links, specified root not in instance', function(){
    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.rootlink);
      this.instance = fixtures.instance.simple;
    })

    it('should resolve against entire instance', function(){
      var act = this.subject.resolveLinks(this.instance);
      assert(act.list.get('href') == "http://example.com/thing");
      assert(act.self.get('href') == "http://example.com/thing/123");
      assert(act.color.get('href') == "http://example.com/thing/123/color/mauve");
    })
 
  })

})

fixtures.parse = {};
fixtures.parse.simple = {
  type: 'object',
  properties: { },
  links: [
    { rel: "list",   href: "http://example.com/thing" },
    { rel: "self",   href: "http://example.com/thing/{id}" },
    { rel: "color",  href: "http://example.com/thing/{id}/color/{color}", mediaType: "application/vnd-color+json" },
    { rel: "unknown", href: "http://example.com/thing/{foo}" }
  ]
}

fixtures.parse.rootlink = {
  links: [
    { rel: "list",  href: "http://example.com/thing" },
    { rel: "self",  href: "http://example.com/thing/{id}" },
    { rel: "color", href: "http://example.com/thing/{id}/color/{color}", mediaType: "application/vnd-color+json" },
    { rel: "root",  href: "#/items/root" } 
  ]
}

fixtures.instance = {};
fixtures.instance.simple = {
  id: 123,
  color: "mauve"
}

fixtures.instance.multi = [
  {  id: 345, color: "peach" },
  {  id: 678, color: "cream" },
  {  id: 901, color: "cyan"  }
]

fixtures.instance.rootlink = {
  items: {
    root: fixtures.instance.simple
  }
}


