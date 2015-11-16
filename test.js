'use strict'

let fs = require('fs')
let chalk = require('chalk')
let summary = require('./testHelper').summary

fs.readdirSync('./lib/').forEach( file => {
    let mod = require('./lib/'+file)
    try{
        if (mod.__test) mod.__test()
    }catch(e){
        console.error(chalk.red("oh no! something horrible happened in test!!"))
        console.error('failed: '+file+', error: '+e.stack)
    }
})

process.on('exit', summary)
