var core = require('json-schema-core')
  , uritemplate = require('uritemplate')
  , Node = core.Node
  , inherit = require('inherit')
  , each = require('each')
  , type = require('type')
  , select = require('select')
  , find   = require('find')
  , has  = Object.hasOwnProperty

// Schema plugin, use like `Schema.use(require('json-schema-hyper'))`

module.exports = function(target){

  target.addType('links', Links);
  target.addType('media', Media);

  target.addBinding('links', linksBinding);
  target.addBinding('rel', relBinding);
  target.addBinding('mediaType', mediaTypeBinding);
  target.addBinding('alternate', alternateBinding);

  target.prototype.resolveLinks = function(instance){
    var links = this.get('links');
    if (!links) return;
    return links.resolve(instance);
  }

}

///// methods to be bound to Correlation objects

function linksBinding(){
  return this.schema.resolveLinks(this.instance);
}

function relBinding(rel,filter){
  var links = this.links();
  return links.rel(rel,filter);
}

function mediaTypeBinding(mediaType,filter){
  var links = this.links();
  return links.mediaType(mediaType,filter);
}

function alternateBinding(mediaType){
  var links = this.links();
  return links.alternate(mediaType);
}


///// Links

function Links(doc,path){
  Node.call(this,doc,path);
  this.nodeType = 'Links';
  this.rootPath = '#';
  this._links = [];
}
inherit(Links,Node);

Links.prototype.parse = function(obj){
  this.dereference(obj);
  for (var i=0;i<obj.length;++i){
    var link = obj[i]
    if (this.isReference(link)) continue;
    if ("root" == link.rel.toLowerCase()){
      this.rootPath = link.href;
      continue;
    }
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
  each(this._links,fn);
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
  var path = [this.path,this._links.length].join('/')
    , link = new Link(this.document,path).parse(obj);
  this.set(link);
}

Links.prototype.resolve = function(instance){
  var rootPath = this.rootPath
    , root = getPath(instance,rootPath || '#') || instance
    , ret
  if ('array' == type(root)){
    ret = []
    var self = this;
    each(root, function(record){
      ret.push( resolvedLinksFor.call(self,record) );
    })
  } else {
    ret = resolvedLinksFor.call(this,root);
  }
  return ret;
}

// private

function resolvedLinksFor(instance){
  var ret = new Links();
  this.each(function(link){
    var resolved = link.resolve(instance);
    if (resolved) ret.set(resolved);
  })
  return ret;
}

///// Link

function Link(doc,path){
  Node.call(this,doc,path);
  this.nodeType = 'Link';
  this._attributes = {};
}
inherit(Link,Node);

Link.prototype.parse = function(obj){
  this.dereference(obj);
  this.set('method','GET');  // default
  for (var key in obj) {
    if (this.isReference(obj[key])) continue;
    this.set(key,obj[key]);
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

Link.prototype.parseSchema = function(key,obj){
  var path = [this.path,key].join('/')
    , schema = new Schema(this.document,path).parse(obj)
  return schema;
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


//////// Media

function Media(doc,path){
  Node.call(this,doc,path);
  this.nodeType = "Media";
  this._attributes = {};
}
inherit(Media,Node);

Media.prototype.parse = function(obj){
  this.dereference(obj);
  for (var key in obj){
    var attr = obj[key];
    if (this.isReference(attr)) continue;
    this.set(key,attr);
  }
  return this;
}

Media.prototype.each = function(fn){
  each(this._attributes, fn);
}

Media.prototype.get = function(key){
  return this._attributes[key];
}

Media.prototype.set = function(key,val){
  this._attributes[key] = val;
}

Media.prototype.has = function(key){
  return (has.call(this._attributes,key));
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


