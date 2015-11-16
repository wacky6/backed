'use strict'

let chalk = require('chalk')
let passed = []
let failed = []
let tested = 0

let pass = (name)=>{
    console.log(chalk.green('pass')+': '+name)
    passed.push(name)
}
let fail = (name)=>{
    console.log(chalk.red('fail')  +': '+name)
    failed.push(name)
}

let check = (name, cbk) => {
    ++tested
    if (cbk instanceof Function)
        return cbk() ? pass(name) : fail(name)
    if (cbk===true)
        return pass(name)
    if (cbk===false)
        return fail(name)
    throw new Error('bad predicate passed to check(), expect function or boolean')
}

let summary = () => {
    console.log('='.repeat(50))
    if (tested===0)
        return console.log(chalk.blue('seems no test is executed.'))
    if (failed.length===0 && passed.length===tested)
        return console.log(chalk.green('good job! all tests passed'))

    console.log(chalk.red('some tests failed:'))
    for (let name of failed)
        console.log('  '+name)
}

module.exports = {
    check:   check,
    summary: summary
}
