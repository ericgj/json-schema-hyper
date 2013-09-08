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
  this.dereference(obj);
  for (var i=0;i<obj.length;++i){
    var link = obj[i]
    if (this.isReference(link)) continue;
    if ("root" == link.rel){
      this.rootPath = link.href;
      continue;
    }
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
  var rootPath = this.rootPath
    , root = getPath(instance,rootPath || '#') || instance
    , ret
  if ('array' == type(root)){
    ret = []
    var self = this;
    each(root, function(record){
      var links = {}
      self.each(function(rel,link){
        links[rel] = link.resolve(record);
      })
      ret.push(links);
    })
  } else {
    ret = {}
    this.each(function(rel,link){
      ret[rel] = link.resolve(root);
    })
  }
  return ret;
}


function Link(doc,path){
  Node.call(this,doc,path);
  this.nodeType = 'Link';
  this.setService(this.document.service);
}
inherit(Link,Node);

Link.prototype.parse = function(obj){
  this._attributes = {};
  this.dereference(obj);
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
      this._attributes[key] = this.parseSchema(val);
      break;
    default:
      this._attributes[key] = val;
  }
}

Link.prototype.has = function(key){
  return (has.call(this._attributes,key));
}

Link.prototype.parseSchema = function(obj){
  var path = [this.path,key].join('/')
    , schema = new Schema(this.document,path).parse(obj)
  return schema;
}

Link.prototype.resolve = function(instance){
  var obj = {}
    , href = this.get('href')
  this.each(function(key,prop){
    if ("href" == key){
      obj[key] = uritemplate.parse(prop).expand(instance);
    } else {
      obj[key] = prop;
    }
  })
  return new Link().parse(obj);
}

// transport-related methods

Link.prototype.setService = function(service){
  this.service = service;
}

Link.prototype.fetch =
Link.prototype.read = function(params,fn){
  this.service.get(this._attributes, params, fn);
}

Link.prototype.create = function(obj,fn){
  this.service.post(this._attributes, obj, fn);
}

Link.prototype.update = function(obj,fn){
  this.service.put(this._attributes, obj, fn);
}

Link.prototype.del = function(fn){
  this.service.del(this._attributes, fn);
}


/* Move logic to within service

  Link.prototype.fetch = function(params,fn){
    if (!this.service) return;
    if (this.has('schema')) schemaValidate.call(this.get('schema'),params);
    serviceConfigLink.call(this.service,this);
    var self = this;
    this.service.get(this.get('href'), params, function(err,res){
      // todo handle err
      if (self.has('targetSchema')) {
        schemaValidate.call(this.get('targetSchema'),res.body);
      }
      fn(res); // probably too low-level here
    }
  }

  // private

  function schemaValidate(params){
    if (!has.call(this,'validate')) return;
    var errs = this.validate(params);
    // todo throw error
  }

  function serviceConfigLink(link){
    var mediaType = link.get('mediaType')
    if (mediaType) this.header('Accept',mediaType);
  }

*/


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


