backed
===
Storage Backed (Simple) Object Storage  (naive implementation)

## Install
```
npm install wacky6/backed harmony-reflect
```

## Usage
ES6 Proxy is required  
for node > 4.0:  
  1. use `harmony-reflect` package to complete Proxy feature.  
  2. add '--harmony_proxies' flag

For further information, see [harmony-reflect](https://github.com/tvcutsem/harmony-reflect)  

Require:
```JavaScript
let backed = require('backed')
require('harmony-reflect')
```

Use with Backend:
```JavaScript
let fsBacked = backed.file('conf.json')
let obj = fsBacked.set('id-1', {id: 1})
obj.b = 2

// obj is synced to `conf.json` after a period of time, or when process exits
```


## API
##### backed.file(path, [syncMs=30000])
  * path:   path of file
  * syncMs: number of milliseconds between each sync
  * [returns]: an instance of `fileStorage`, or `memoryStorage` if path is not truthy

##### fileStorage:
similar to Map(), but `key` must be a `string`
  * get(key)
  * set(key, val)
  * forEach( (val, key)=>{...} )
  * delete(key)
  * load()
  * save()
  * close()
  * error( (err)=>{...} )

## Note
#### Use with Array
make an assignment to flag that Array as dirty
```JavaScript
let obj = backed.set('a', {arr: []})
obj.arr.push(1)
obj.arr = obj.arr   // make an assignment
// obj.arr is properly synced to backend
```

## Support
|    Feature    |         |
|---------------|---------|
| Nested Object | Yes     |
| Array         | Partial |
| Symbol        | No      |
| obj.prototype | No      |

## License
MIT (C) wacky6
