'use strict'

require('harmony-reflect')

/*
 * obj:      object, a Simple Object
 * callback: function(obj), function will be invoked when obj is modified
 * asyncCbk: whether callback should be called asynchronously, default false
 *
 * returns:  a Proxy, wrapped object
 *
 * by default, return obj if obj can not be wrapped
 */
function objectWrap(obj, callback, asyncCbk) {
    // check type
    if (typeof obj!=='object') return obj
    if (obj instanceof Array)  return obj
    if (obj instanceof String) return obj
    // TODO: add check for complex Object, eg: inherited, Array, ...

    let invokeCallback = asyncCbk ? ()=>process.nextTick(()=>callback(obj))
                                  : ()=>callback(obj)

    return createObjectProxy(obj, invokeCallback)
}

function createObjectProxy(obj, invokeCbk) {
    return new Proxy(obj, {
        defineProperty: (t, p, d)=>{
            Object.defineProperty(t, p, d)
            invokeCbk()
            return true
        },
        deleteProperty: (t, p)=>{
            delete t[p]
            invokeCbk()
            return true
        },
        get: (t, p, r)=>{
            if (typeof p === 'object')
                return createProxy(t[p], invokeCbk)
            else
                return t[p]
        },
        set: (t, p, v, r)=>{
            t[p]=v
            invokeCbk()
            return true
        }
    })
}

module.exports = objectWrap
module.exports.__test = function(){

    let called   = 0
    let callback = () => ++called
    let check = require('../testHelper').check

    let obj  = {a: 1}
    let wrap = objectWrap(obj, callback)

    wrap.a = 2
    check('assignment', ()=> called===1 && obj.a===2 )

    wrap.b = 'new prop'
    check('new prop',   ()=> called===2 && obj.b==='new prop' )

    Object.defineProperty(wrap, 'c', {
        configurable: false,
        writable:     true,
        enumerable:   true,
        value:        3
    })
    check('defineProperty', ()=> called===3 && obj.c===3 )

    delete wrap.b
    check('delete prop',  ()=> called===4 && obj.b===undefined )

    wrap.nest = { d: 1 }
    wrap.nest.d = 2
    check('nested assignment', ()=> called===5 && obj.nest.d===2 )

}

// module.exports.__test()
