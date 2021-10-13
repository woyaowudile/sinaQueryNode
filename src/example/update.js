const API = require('../api')
const SQL = require('../sql')


function getContent({codes, start, end, period='d'}) {
    if (!start) {
        start = someDay(0, '')
    }
    if (!end) {
        end = someDay(0, '')
    }
    return new Promise(async (rl, rj) => {
        // await API.getIG502({code})
        // codes最多可以放6个
        await API.get({
            // 通用属性
            type: 'sohu',
            // // sina属性
            // page: 1,
            // num: 100,
            // sohu属性
            codes,
            start,
            end,
            period
        }).then(async d => {
            console.log(`>> ${d.url} -> ${d.message}`);
            rl(d)
        }).catch(err => {
            console.log(`>> getContent ${err.message}`);
            rj()
        })
    })
}


function someDay(days, symbol = '-') {
    let today = new Date()
    let interval = 24 * 60 * 60 * 1000 * days
    let after = new Date(today - interval)
    let year = after.getFullYear()
    let month = after.getMonth() + 1 + ''
    let date = after.getDate() + ''
    return `${year}${symbol}${month.padStart(2, 0)}${symbol}${date.padStart(2, 0)}`
}

module.exports = function (app, connection) {
    app.get('/api/update', async (req, res) => {
        console.log(`-------------开始执行 /api/update---------------`);

        let { query } = req
        // 获取到today还没被update的code
        let used = await SQL.$Methods.getTables({
            connection,
            name: 'used',
            conditions: `dwm=${query.type}`
        })
        let tds = await SQL.$Methods.getTables({
            connection,
            name: 'today',
            conditions: `dwm=${query.type}`
        })
        tds = tds.map(v => v.code)
        let unused = used.filter(v => !tds.includes(v.code))

        let count = 0, num = 6
        let fn = async function () {
            let item = unused.slice(count, count += num)
            if (item.length) {
                let codes = item.map(v => v.code)
                
                let ret = await getContent({ codes, period: query.type })
                // update是多个可以一起调，所以res有可能是多个,如果没有就是null
                let res = ret.data
                while(res && res.length) {
                    let [level1] = res.slice(-1)
                   
                    let { code, type } = level1
                    if (ret.err) {
                        console.log(`>>> 这个${code}有问题： ${ret.err}`);
                        await SQL.setTables({
                            connection, code, type,
                            name: 'fail',
                            dwm: 'day'
                        })
                    } else {
                        await SQL.save({connection, item: level1})
                        await SQL.setTables({
                            connection, code, type,
                            name: 'used',
                            dwm: 'day'
                        })
                    }
                    res.splice(-1)
                }
                setTimeout(() => {
                    fn()
                }, 200)
            } else {
                console.log(`-------------执行完成 /api/update---------------`);
            }
        }
        fn()
    })
}