var core = require('json-schema-core')
  , uritemplate = require('uritemplate')
  , Node = core.Node
  , inherit = require('inherit')
  , each = require('each')
  , type = require('type')
  , has  = Object.hasOwnProperty

// Schema plugin, use like `Schema.use(require('json-schema-hyper'))`

module.exports = function(target){

  target.addType('links', Links);

  target.prototype.resolveLinks = function(instance){
    var links = this.get('links');
    if (!links) return;
    return links.resolve(instance);
  }
}

function Links(doc,path){
  Node.call(this,doc,path);
  this.nodeType = 'Links';
}
inherit(Links,Node);

Links.prototype.parse = function(obj){
  this.rootPath = '#';
  this._links = {};
  for (var i=0;i<obj.length;++i){
    if ("root" == obj[i].rel){
      this.rootPath = obj[i].href;
      continue;
    }
    var link = obj[i]
    this.addLink(link);
  }
  return this;
}

Links.prototype.each = function(fn){
  each(this._links,fn);
}

Links.prototype.get = function(rel){
  return this._links[rel];
}

Links.prototype.set = function(rel,link){
  this._links[rel] = link;
}

Links.prototype.has = function(rel){
  return (has.call(this._links,rel));
}

Links.prototype.addLink = function(obj){
  var path = [this.path,obj.rel].join('/')
    , link = new Link(this.document,path).parse(obj);
  this.set(obj.rel,link);
}

Links.prototype.resolve = function(instance){
  var ret = {}
    , rootPath = this.rootPath
  each( function(rel,link){
    ret[rel] = link.resolve(instance,rootPath);
  })
  return ret;
}


function Link(doc,path){
  Node.call(this,doc,path);
  this.nodeType = 'Link';
}
inherit(Link,Node);

Link.prototype.parse = function(obj){
  this._attributes = {};
  for (var key in obj) this.set(key,obj[key]);
  return this;
}

Link.prototype.each = function(fn){
  each(this._attributes,fn);
}

Link.prototype.get = function(key){
  return this._attributes[key];
}

Link.prototype.set = function(key,val){
  this._attributes[key] = val;
}

Link.prototype.has = function(key){
  return (has.call(this._attributes,key));
}

Link.prototype.resolve = function(instance,rootPath){
  var root = getPath(instance,rootPath || '#')
    , ret
  if ('array' == type(root)){
    ret = [];
    each(root, function(record,i){
      ret.push(resolveFor.call(this,record));
    })
  } else {
    ret = resolveFor.call(this,root);
  }
  return ret;
}

Link.prototype.resolveFor = function(instance){
  var ret = {};
  ret.href = uritemplate.parse(this.href).expand(obj);
  this.each(function(key,prop){
    if ("href" == key) return;
    ret[key] = prop;
  })
  return ret;
}


// utils

function getPath(obj,ref){
  var parts = ref.split('/');
  for (var i=0;i<parts.length;++i){
    if ('#' == parts[i]) continue;
    obj = obj[parts[i]];
    if (obj == undefined) break;
    if ("object" !== typeof obj) break;  // not object or array
  }
  return obj;
}


