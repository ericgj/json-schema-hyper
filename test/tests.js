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

})

fixtures.parse = {};
fixtures.parse.simple = {
  type: 'object',
  properties: { },
  links: [
    { rel: "list",   href: "http://example.com/thing" },
    { rel: "self",   href: "http://example.com/thing/{id}" },
    { rel: "color",  href: "http://example.com/thing/{id}/color/{color}", mediaType: "application/vnd-color+json" }
  ]
}

fixtures.parse.rootlink = {
  links: [
    { rel: "self",  href: "http://example.com/thing/{id}" },
    { rel: "color", href: "http://example.com/thing/{id}/color/{color}", mediaType: "application/vnd-color+json" },
    { rel: "root",  href: "#/items/root" } 
  ]
}
