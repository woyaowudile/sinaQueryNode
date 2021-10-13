
const nodeExcel = require('node-xlsx');
const fs = require('fs');

const create = require('./create')
const init = require('./init')
const update = require('./update')
const query = require('./query')
const download = require('./download')

const apps = [
    create,
    init,
    update,
    query,
    download
]

function runApi(app, connection) {
    apps.forEach(item => {
        if (typeof item === 'function') {
            item(app, connection)
        }
    })
}

module.exports = {
    runApi
}