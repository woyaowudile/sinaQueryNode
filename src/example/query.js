const API = require('../api')
const SQL = require('../sql')


module.exports = function (app, connection) {
    app.get('/api/query', async (req, res) => {
        console.log(`-------------开始执行 /api/query---------------`);
        
        console.log(`-------------执行完成 /api/query---------------`);
    })
}