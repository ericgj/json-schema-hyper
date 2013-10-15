'use strict';

var isBrowser = require('is-browser')
  , core = isBrowser ? require('json-schema-core') : require('json-schema-core-component')
  , uritemplate = require('uritemplate')
  , Node = core.Node
  , Schema = core.Schema
  , inherit = isBrowser ? require('inherit') : require('inherit-component')
  , each = isBrowser ? require('each') : require('each-component')
  , type = isBrowser ? require('type') : require('component-type')
  , select = isBrowser ? require('select') : require('select-component')
  , find   = require('find')
  , has  = Object.hasOwnProperty

// Schema plugin, use like `Schema.use(require('json-schema-hyper'))`

module.exports = function(target){

  target.addType('links', Links);

  target.addBinding('links', linksBinding);
  target.addBinding('rel', relBinding);
  target.addBinding('mediaType', mediaTypeBinding);
  target.addBinding('alternate', alternateBinding);
  target.addBinding('getRoot', getRootBinding);

  target.prototype.resolveLinks = function(instance){
    var links = this.get('links');
    if (!links) return;
    return links.resolve(instance);
  }

}

///// methods to be bound to Correlation objects

function linksBinding(){
  return this.resolveLinks ? this.resolveLinks()
                           : this.schema.resolveLinks(this.instance);
}

function relBinding(rel,filter){
  var links = this.links();
  if ('array' == type(links)){
    var ret = []
    for (var i=0;i<links.length;++i){
      ret.push(links[i].rel(rel,filter));
    }
    return ret;
  } else {
    return links.rel(rel,filter);
  }
}

function mediaTypeBinding(mediaType,filter){
  var links = this.links();
  if ('array' == type(links)){
    var ret = []
    for (var i=0;i<links.length;++i){
      ret.push(links[i].mediaType(mediaType,filter));
    }
    return ret;
  } else {
    return links.mediaType(mediaType,filter);
  }
}

function alternateBinding(mediaType){
  var links = this.links();
  if ('array' == type(links)){
    var ret = []
    for (var i=0;i<links.length;++i){
      ret.push(links[i].alternate(mediaType));
    }
    return ret;
  } else {
    return links.alternate(mediaType);
  }
}

// this is assuming the schema describes the whole instance, not already
// the root instance.

function getRootBinding(){
  if (!(this.schema && this.instance)) return;
  var root = this.rel('root')
  if (!root) return this;
  return this.getPath(root.get('href')); 
}

  

///// Links

function Links(parent){
  Node.call(this,parent);
  this.nodeType = 'Links';
  this._links = [];
}
inherit(Links,Node);

Links.prototype.parse = function(obj){
  for (var i=0;i<obj.length;++i){
    var link = obj[i]
      , ref = refOf(link)
    if (ref) { this.addRef(ref,i); continue; }
    this.addLink(link);
  }
  return this;
}

// custom finders for typical cases

Links.prototype.rel = function(rel,obj){
  return this.find( function(link){
    rel = rel.toLowerCase();
    var found = rel == link.get('rel')
    if (found && obj){
      for (var key in obj){
        if (obj[key] !== link.get(key)){
          found = false; break;
        }
      }
    }
    return found;
  })
}

Links.prototype.mediaType = function(mediaType,obj){
  return this.find( function(link){
    var found = mediaType == link.get('mediaType')
    if (found && obj){
      for (var key in obj){
        if (obj[key] !== link.get(key)){
          found = false; break;
        }
      }
    }
    return found;
  })
}

Links.prototype.alternate = function(mediaType){
  return this.mediaType(mediaType, {rel: 'alternate'});
}

Links.prototype.find = function(fn){
  return find(this._links,fn);
}

Links.prototype.select = function(fn){
  return select(this._links,fn);
}

Links.prototype.each = function(fn){
  each(this._links, function(link,i){ fn(i,link); });
}

Links.prototype.get = function(i){
  return this._links[i];
}

Links.prototype.set = function(link){
  this._links.push(link);
}

Links.prototype.has = function(i){
  return !!this.get(i);
}

Links.prototype.addLink = function(obj){
  var link = new Link(this).parse(obj);
  this.set(link);
}

Links.prototype.toObject = function(){
  var obj = []
  this.each( function(i,link){
    obj.push(link.toObject());
  })
  return obj;
}

Links.prototype.resolve = function(instance){
  var ret
  if ('array' == type(instance)){
    ret = []
    var self = this;
    each(instance, function(record){
      ret.push( resolvedLinksFor.call(self,record) );
    })
  } else {
    ret = resolvedLinksFor.call(this,instance);
  }
  return ret;
}

// private

function resolvedLinksFor(instance){
  var ret = new Links();
  this.each(function(i,link){
    var resolved = link.resolve(instance);
    if (resolved) ret.set(resolved);
  })
  return ret;
}

///// Link

function Link(parent){
  Node.call(this,parent);
  this.nodeType = 'Link';
  this._attributes = {};
}
inherit(Link,Node);

Link.prototype.parse = function(obj){
  this.set('method','GET');  // default
  for (var key in obj) {
    var attr = obj[key]
      , ref = refOf(attr)
    if (ref) { this.addRef(ref,key); continue; }
    this.set(key,attr);
  }
  return this;
}

Link.prototype.each = function(fn){
  each(this._attributes,fn);
}

Link.prototype.attribute = 
Link.prototype.get = function(key){
  return this._attributes[key];
}

Link.prototype.set = function(key,val){
  switch(key){
    case "schema" || "targetSchema":
      this._attributes[key] = this.parseSchema(key,val);
      break;
    case "rel":
      this._attributes[key] = val.toLowerCase();
      break;
    default:
      this._attributes[key] = val;
  }
}

Link.prototype.has = function(key){
  return (has.call(this._attributes,key));
}

Link.prototype.attributes = function(){
  return this._attributes;
}

Link.prototype.parseSchema = function(key,obj){
  var schema = new Schema(this).parse(obj)
  return schema;
}

Link.prototype.toObject = function(){
  var obj = {}
  this.each( function(key,val){
    switch(key){
      case "schema" || "targetSchema":
        obj[key] = val.toObject();
        break;
      default:
        obj[key] = val;
        break;
    }
  })
  return obj;
}

Link.prototype.resolve = function(instance){
  var obj = {}
    , href = this.get('href')
  if (!linkTemplateExpandable(href,instance)) return;
  this.each(function(key,prop){
    if ("href" == key){
      obj[key] = uritemplate.parse(prop).expand(instance);
    } else {
      obj[key] = prop;
    }
  })
  return new Link().parse(obj);
}

function linkTemplateExpandable(tmpl,instance){
  var pattern = /\{([^}]+)\}/g
    , tokenpatt = /[+#.\/;?&]{0,1}([^*:]+)/i
    , match
  while (match = pattern.exec(tmpl)){ 
    var submatch = tokenpatt.exec(match[1])
    if (submatch){
      var tokens = submatch[1].split(',');
      for (var i=0;i<tokens.length;++i){
        if (!has.call(instance,tokens[i])) return false;
      }
    }
  }
  return true;
}


// utils

function refOf(obj){
  return ("object"==type(obj) && obj['$ref']);
}
