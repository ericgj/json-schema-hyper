
# json-schema-hyper

**Please note this library is not ready for production use.**

JSON Hyper-Schema, as specified in the [IETF Draft spec][spec].

This component extends the behavior of JSON Schema, as implemented in 
[json-schema-core][core], providing 

- parser classes for links (`Links`, `Link`). 
- a method for resolving link templates against an instance (`resolveLinks`)
- link finder methods for typical cases (`links.rel`, `links.mediaType`,
`links.alternate`), as well as generic `links.find(fn)` and `links.select(fn)`
- addressability from the schema (e.g. `schema.$('#/links/0')`)
- dereferencing JSON references used in either "links" itself or in 
individual links or link attributes, or in "media" subtrees.

Note that this component does not deal with aspects of the spec related to
HTTP request/response, e.g. schema and targetSchema pre- and post- 
validation, setting Accept headers, instance correlation via HTTP response 
headers, etc. For this, see [json-schema-agent][agent].

Note also this component does not depend on JSON Schema *validation*, which
is implemented as a separate [core][core] plugin (json-schema-valid, 
forthcoming).


## Installation

component:

    $ component install ericgj/json-schema-hyper

npm:

    $ npm install json-schema-hyper-component


## Example

  ```javascript
  
  var core = require('json-schema-core')
    , hyper = require('json-schema-hyper')
    , Schema = core.Schema

  Schema.use(hyper);

  var schema = new Schema().parse( schemaObject );
  
  // resolve links in root path of instance, returns a Links object
  // or an array of Links objects if the root path of the instance is an array
  var links = schema.resolveLinks( instanceObject );

  // find the first link with rel == 'search'
  var searchLink = links.rel('search');

  // find the first link with mediaType == 'application/xml'
  var altLink = links.mediaType('application/xml');

  // find the first link rel == 'alternate' and mediaType == 'application/xml',
  // with method == 'GET'
  var rssLink = links.alternate('application/atom+xml', {method: 'GET'});

  // GET the searchLink href, with the given params, setting the Accept header, 
  // validating schema and targetSchema, if given and validation is used, etc.
  searchLink.fetch({name: 'Kermit'}, callback);
 
 
  ```

## API
   

## License

  MIT

[spec]: http://tools.ietf.org/html/draft-luff-json-hyper-schema-00
[core]: https://github.com/ericgj/json-schema-core
[agent]: https://github.com/ericgj/json-schema-agent


