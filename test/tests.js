var assert = require('timoxley-assert') 
  , core  = require('json-schema-core')
  , links = require('json-schema-hyper')
  , Schema = core.Schema
  , Document = core.Document
  , type = require('type')

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

    it('links should parse each link', function(){
      assert(this.subject.get('links').get(0).get('rel'));
      assert(this.subject.get('links').get(1).get('rel'));
      assert(this.subject.get('links').get(2).get('rel'));
    })

    it('should have links addressable from the schema by index', function(){
      assert("list" == this.subject.$('#/links/0').get('rel'));
      assert("http://example.com/thing/{id}" == this.subject.$('#/links/1').get('href'));
      assert("application/vnd-color+json" == this.subject.$('#/links/2').get('mediaType'));
    })

    it('links should default method to GET', function(){
      assert('GET' == this.subject.get('links').get(0).get('method'));
      assert('GET' == this.subject.get('links').get(1).get('method'));
      assert('GET' == this.subject.get('links').get(2).get('method'));
    })

  })

  describe('parse root link', function(){

    beforeEach( function(){
      this.subject = new Schema().parse(fixtures.parse.rootlink);
    })

    it('should parse', function(){ 
      console.log("subject: %o", this.subject);
    })

    it('should parse root link as a normal link', function(){
      var links = this.subject.get('links')
      assert(links.rel('root'));
    })

  })

  describe('resolve links, simple instance', function(){

    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.simple);
      this.instance = fixtures.instance.simple;
    })

    it('should return a links collection object', function(){
      var act = this.subject.resolveLinks(this.instance);
      console.log("resolved links: %o", act);
      assert(act.rel('self'));
    })

    it('should resolve each link', function(){
      var act = this.subject.resolveLinks(this.instance);
      assert(act.$('0/href') == "http://example.com/thing");
      assert(act.$('1/href') == "http://example.com/thing/123");
      assert(act.$('2/href') == "http://example.com/thing/123/color/mauve");
    })

  })

  describe('resolve links, simple instance, unknown variables in templates', function(){

    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.unknowns);
      this.instance = fixtures.instance.simple;
    })

    it('should not resolve links with unknown variable', function(){
      var act = this.subject.resolveLinks(this.instance);
      console.log("resolved links: %o", act);
      act.each( function(i,link){
        assert(link.get('rel') !== 'one');
        assert(link.get('rel') !== 'two');
        assert(link.get('rel') !== 'three');
      })
    })

    it('should resolve links with known variables in comma-delimited list', function(){
      var act = this.subject.resolveLinks(this.instance);
      assert(act.get(0).get('rel') == 'ok');
    })

  })

  describe('resolve links, array instance', function(){

    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.simple);
      this.instance = fixtures.instance.multi;
    })

    it('should have array of the same length as the number of instance records', function(){
      var act = this.subject.resolveLinks(this.instance);
      console.log("resolved links: %o", act);
      assert(3==act.length);
    })

    it('should resolve links for each instance record', function(){
      var act = this.subject.resolveLinks(this.instance);
      assert(act[0].get(0).get('href') == "http://example.com/thing");
      assert(act[0].get(1).get('href') == "http://example.com/thing/345");
      assert(act[0].get(2).get('href') == "http://example.com/thing/345/color/peach");
      assert(act[1].get(0).get('href') == "http://example.com/thing");
      assert(act[1].get(1).get('href') == "http://example.com/thing/678");
      assert(act[1].get(2).get('href') == "http://example.com/thing/678/color/cream");
      assert(act[2].get(0).get('href') == "http://example.com/thing");
      assert(act[2].get(1).get('href') == "http://example.com/thing/901");
      assert(act[2].get(2).get('href') == "http://example.com/thing/901/color/cyan");
    })

  })

  describe('find link by rel', function(){

    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.alternates);
    })
   
    it('should find link by rel when rel unique', function(){
      var links = this.subject.get('links')
        , act = links.rel('self')
      assert(links.get(0) === act);
      assert("http://example.com/thing/{id}" == act.get('href'));
    })

    it('should find first link by rel when rel not unique', function(){
      var links = this.subject.get('links')
        , act = links.rel('alternate')
      assert(links.get(1) === act);
      assert("http://example.com/thing/{id}" == act.get('href'));
      assert("application/xml" == act.get('mediaType'));
    })

    it('should find link by rel and other criteria if specified', function(){
      var links = this.subject.get('links')
        , act = links.rel('alternate', {href: 'http://example.com/thing/{id};xml'})
      assert(links.get(2) === act);
      assert("http://example.com/thing/{id};xml" == act.get('href'));
      assert("application/xml" == act.get('mediaType'));
    })
    
    it('should return undefined if rel not found', function(){
      var links = this.subject.get('links')
        , act = links.rel('alternate', {mediaType: 'application/atom+xml'})
      assert(act === undefined);
    })


  })

  describe('find link by mediaType', function(){
    beforeEach(function(){
      this.subject = new Schema().parse(fixtures.parse.alternates);
    })
   
    it('should find link by mediaType when mediaType unique', function(){
      var links = this.subject.get('links')
        , act = links.mediaType('text/html')
      assert(links.get(3) === act);
    })

    it('should find first link by mediaType when mediaType not unique', function(){
      var links = this.subject.get('links')
        , act = links.mediaType('application/xml')
      assert(links.get(1) === act);
    })

    it('should find link by mediaType and other criteria if specified', function(){
      var links = this.subject.get('links')
        , act = links.mediaType('application/xml', {href: 'http://example.com/thing/{id};xml'})
      assert(links.get(2) === act);
    })

  })

  describe('rel case-insensitivity', function(){

    it('should find link by rel case-insensitively', function(){
      this.subject = new Schema().parse(fixtures.parse.simple);
      var links = this.subject.get('links')
        , act = links.rel('SELF')
      assert(links.get(1) === act);
      assert("http://example.com/thing/{id}" == act.get('href'));
    })

    it('should get link rels as lower-cased', function(){
      this.subject = new Schema().parse(fixtures.parse.caseInsensitive);
      var links = this.subject.get('links')
      assert(links.get(0).get('rel') == 'list');
      assert(links.get(1).get('rel') == 'self');
      assert(links.get(2).get('rel') == 'color');
    })

  })

  describe('link schema and targetSchema parsing', function(){
    it('should have tests');
  })
  
  describe('correlations', function(){
    beforeEach(function(){
      var schema = new Schema().parse(fixtures.parse.simple);
      this.subject = schema.bind(fixtures.instance.simple);
    })

    it('correlation should resolve each link', function(){
      var act = this.subject.links();
      assert(act.$('0/href') == "http://example.com/thing");
      assert(act.$('1/href') == "http://example.com/thing/123");
      assert(act.$('2/href') == "http://example.com/thing/123/color/mauve");
    })

    it('correlation should find link by rel', function(){
      var act = this.subject.rel('color')
      assert(act.get('href') == "http://example.com/thing/123/color/mauve");
    })

    it('correlation should find link by mediaType', function(){
      var act = this.subject.mediaType('application/vnd-color+json')
      assert(act.get('href') == "http://example.com/thing/123/color/mauve");
    })

  })

  describe('correlations, array instance', function(){
    beforeEach(function(){
      var schema = new Schema().parse(fixtures.parse.simple);
      this.subject = schema.bind(fixtures.instance.multi);
    })

    it('links should return array of resolved links for each element of array', function(){
      var act = this.subject.links();
      assert('array' == type(act));
      assert(act[2].$('0/href') == "http://example.com/thing");
      assert(act[2].$('1/href') == "http://example.com/thing/901");
      assert(act[2].$('2/href') == "http://example.com/thing/901/color/cyan");
    })

    it('correlation should return array of found link by rel', function(){
      var act = this.subject.rel('color')
      assert('array' == type(act));
      assert(act[1].get('href') == "http://example.com/thing/678/color/cream");
    })

    it('correlation should return array of found link by mediaType', function(){
      var act = this.subject.mediaType('application/vnd-color+json')
      assert('array' == type(act));
      assert(act[0].get('href') == "http://example.com/thing/345/color/peach");
    })

  })

  describe('correlations, root link specified', function(){
    beforeEach(function(){
      var schema = new Schema().parse(fixtures.parse.rootlink);
      this.subject = schema.bind(fixtures.instance.rootlink);
    })

    it('correlation should get root', function(){
      var act = this.subject.getRoot();
      console.log('correlation: %o', act);
      assert(act);
      assert('#/properties/items/properties/root' == act.schema.path);
      assert.deepEqual(act.instance, fixtures.instance.simple);
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
    { rel: "list",  href: "http://example.com/thing" },
    { rel: "self",  href: "http://example.com/thing/{id}" },
    { rel: "color", href: "http://example.com/thing/{id}/color/{color}", mediaType: "application/vnd-color+json" },
    { rel: "root",  href: "#/items/root" } 
  ],
  properties: {
    items: {
      type: "object",
      properties: {
        root: {}
      }
    }
  }
}

fixtures.parse.unknowns = {
  links: [
    { rel: "one", href: "http://example.com/{one}"    },
    { rel: "two", href: "http://example.com/{/two:3}" },
    { rel: "three", href: "http://example.com{?id,color,three}" },
    { rel: "ok",  href: "http://example.com{?id,color}" }
  ]
}

fixtures.parse.alternates = {
  links: [
    { rel: "self",        href: "http://example.com/thing/{id}" },
    { rel: "alternate",   href: "http://example.com/thing/{id}", mediaType: "application/xml" },
    { rel: "alternate",   href: "http://example.com/thing/{id};xml", mediaType: "application/xml" },
    { rel: "alternate",   href: "http://example.com/thing/{id}", mediaType: "text/html" }
  ]
}

fixtures.parse.caseInsensitive = {
  links: [
    { rel: "LIST",  href: "http://example.com/thing" },
    { rel: "Self",  href: "http://example.com/thing/{id}" },
    { rel: "coLOR", href: "http://example.com/thing/{id}/color/{color}", mediaType: "application/vnd-color+json" },
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
  id: 234,
  color: "guava",
  items: {
    root: fixtures.instance.simple
  }
}


