'use strict'

let objectWrap = require('./objectWrap')
let fs = require('fs')

/* backend interface
 * similar to Map(), but without clear(), entries(), keys(), values()
 * load() : load from underlying storage
 * save() : save to underlying storage
 * error(cbk) : set error callback(err)
 *              if called multiple times, the last callback is used
 */
class memoryStorage {
    constructor(syncMs) {
        syncMs = syncMs || 30000

        this.name = 'memory'
        this.map  = new Map()
        this.onError = (e)=>console.error('Error: backed-'+this.name+': '+e.message)

        this.dirty = false
        this.wrap  = (obj)=>objectWrap(obj, ()=>this.dirty=true)

        this.itvl  = setInterval( ()=>{
            if (this.dirty) this.save()
        }, syncMs )

        process.on('exit', ()=>{
            clearTimeout(this.itvl)
            this.save(true)
        })
    }
    get(key) {
        return this.wrap(this.map.get(key))
    }
    set(key, val) {
        if (typeof key!=='string')
            throw new TypeError('key must be string')
        this.dirty = true
        this.map.set(key, val)
        return this.get(key)
    }
    delete(key) {
        this.map.delete(key)
        this.dirty = true
    }
    forEach(cbk) {
        this.map.forEach( (v,k)=>cbk(this.wrap(v), k) )
        return this
    }
    forEachPlain(cbk) {
        this.map.forEach(cbk)
        return this
    }
    load() {
        this.map.clear()
        return this
    }
    save(sync) {
        console.error('memory storage: save, sync='+(sync?'true':'false'))
        this.dirty = false
        return this
    }
    close(sync) {
        clearTimeout(this.itvl)
        this.save(sync)
        this.save = ()=>undefined
    }
    error(onError) {
        this.onError = onError
        return this
    }
}

/*
 * possible errors:
 * 1. err.code === 'ENOENT' && err.syscall = 'access :
 *    backend is not accessible
 * 2. err instanceof SyntaxError
 *    backend json is corrupt
 * 3. err.syscall = 'write'
 *    fail to write to backend
 */
class fileStorage extends memoryStorage{
    constructor(path, syncMs) {
        super(syncMs)
        this.name  = 'file: '+path
        this.path  = path
    }
    load() {
        try {
            fs.accessSync(this.path, fs.R_OK)
        }catch(e){
            this.onError(e)
            this.map.clear()
            return this
        }
        let content = fs.readFileSync(this.path, {encoding: 'utf-8'})
        let json
        try {
            json=JSON.parse(content)
        }catch(e){
            this.onError(e)
        }
        for (let key in json)
            this.map.set(key, json[key])
        return this
    }
    save(sync) {
        let json = {}
        this.map.forEach( (v, k) => json[k]=v )
        let content = JSON.stringify(json, null, '  ')
        if (sync) {
            try{
                fs.writeFileSync(this.path, content)
                this.dirty = false
                // console.error('file storage: sync to disk')
            }catch(e){
                this.onError(e)
            }
        }else{
            fs.writeFile(this.path, content, (e)=>{
                if (e) return this.onError(e)
                // console.error('file storage: write to disk, error: '+(e?e.message:'OK'))
                this.dirty = false
            })
        }
        return this
    }
}

module.exports = {
    memory: ()    => new memoryStorage,
    file:   (path, ms)=> path ? new fileStorage(path, ms) : new memoryStorage(ms)
}


module.exports.__test = function() {
    let check = require('../testHelper').check
    let readJSON = (path)=>JSON.parse(fs.readFileSync(TESTF).toString())

    let TESTF = 'test.json'
    let sto = module.exports.file(TESTF, 100)

    sto.load()

    check('sync interval initialized', sto.itvl._idleTimeout===100)

    let o1 = sto.set('1', {id: 1})
    check('set', o1.id===1)

    o1.assign = 'assign'
    check('assignment is passed to backend', sto.map.get('1').assign==='assign')
    check('dirty flag', sto.dirty===true)

    // first save, spare 100ms in case async write is too slow
    setTimeout(()=>{
        let j = readJSON(TESTF)
        check('write to disk', j['1'].id===1 && j['1'].assign==='assign' )
    }, 250)

    // after close, nothing is written to disk
    setTimeout(()=>{
        sto.close(true)
        o1.assign='write-after-close'
        sto.save(true)
        let j = readJSON(TESTF)
        check('no write after close', j['1'].assign==='assign' )
    }, 300)


    // a file we can't get RW access, don't crash, errors emitted
    let TESTF2 = '/usr/test.json'
    try {
        fs.accessSync(TESTF2, fs.W_OK)
        check("file with not Write Access, skipped", true)
    }catch(e){
        let sto2 = module.exports.file(TESTF2)
        let errs = []
        sto2.error((e)=>errs.push(e))
        sto2.load()
        sto2.set('1', {a:1})
        sto2.save(true)
        sto2.close()
        check('file with no Write Access, proper errors thrown',
            !!(errs.find( (e)=>e.syscall==='access'&&e.code==='ENOENT' )
            && errs.find( (e)=>e.code==='EPERM' )
            && errs.length===2 )
        )
    }

    // fallback to memoryStorage if path is non-truthy
    let sto3 = module.exports.file()
    check('fallback to memoryStorage', sto3 instanceof memoryStorage)
    // throw on non string key
    let thrown = false
    try{
        sto3.set(1, {id: 1})
    }catch(e){
        thrown = e
    }
    check('throw on non-string key', thrown instanceof TypeError)
    check('non-string key-value is not added', sto3.map.get(1)===undefined)
    sto3.set('a', {id: 'a'})
    sto3.forEach( (v, k) => {
        check('forEach callback has correct signature', k==='a' && v.id==='a')
        v.inForEach = 1
    })
    check('inside forEach, assignment passed to backend',
        !!(sto3.dirty === true
        && sto3.map.get('a').inForEach===1 )
    )
    sto3.close()

    process.on('exit', ()=>fs.unlinkSync(TESTF) )
}

// module.exports.__test()
