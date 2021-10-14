const API = require('../api')
const SQL = require('../sql')


module.exports = function (app, connection) {
    app.get('/api/query', async (req, res) => {
        console.log(`-------------开始执行 /api/query---------------`);
        let dwm = req.query.type || 'd'

        let usedres = await SQL.getTables({
            connection,
            name: 'used',
            conditions: `dwm='${dwm}'`
        })

        let count = usedres.length, num = 1
        
        console.log(`-------------执行完成 /api/query---------------`);
    })
}