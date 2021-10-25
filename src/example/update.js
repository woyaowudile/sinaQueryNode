const API = require('../api')
const SQL = require('../sql')
const { sendMail } = require('../utils/sendEmail')

function getContent({codes, start, end, query}) {
    let period = query.dwm || 'd'
    let days = (query.days / 1) || 0

    if (!start) {
        start = someDay(days, '')
    }
    if (!end) {
        end = someDay(days, '')
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

function update({ connection, item, dwm }) {
    
    let day = someDay(100, '-')
    let { code, type, data } = item
    
    return new Promise(async (rl, rj) => {

        await SQL.getTables({
            connection,
            name: type,
            conditions: `code='${code}' and dwm='${dwm}' and d>='${day}'`
        }).then(async res => {
            let { d } = data[0]
            let flag = res.find(v => v.d === d)
            let result = updateOldData(res, item)
            if (flag) {
                await SQL.update({ connection, item: result, dwm })
            } else {
                await SQL.save({connection, item: result, dwm})
            }
            rl()
        })
    })
}

function updateOldData(datas, item) {
    let { code, type, data } = item
    let arrs = datas.concat(data)
    let ma10 = getMA(arrs.slice(-10), 9, 10)
    let ma20 = getMA(arrs.slice(-20), 19, 20)
    let ma60 = getMA(arrs.slice(-60), 59, 60)
    let [pre,last] = arrs.slice(-2)
    let zf = ((last.h - last.l) / pre.c / 1 * 100).toFixed(2)
    return {
        code, type,
        data: [{
            ...data[0],
            ma10, ma20, ma60, zf
        }]
    }
}
function getMA(datas, start, n) {
    // 例： n = 10, start从0 - 9才能开始计算逻辑, 即 start - n >= -1
    if (start < (n - 1)) return 
    // 0 - 9 ； 2 - 11
    // start: 9, n: 10 ; start: 11, n: 10
    let data = datas.slice(start - (n - 1), (start + 1))
    if (data.length === n) {
        let count = data.reduce((x, y) => {
            let x1 = x.c ? (x.c / 1) : x
            let y1 = y.c ? (y.c / 1): y
            return x1 + y1
        }, 0)
        return (count / n).toFixed(2) / 1
    } else {
        return
    }
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


/**
 * 
 * @param {String} dwm 周期：'天d、周w、月m'
 * @param {String} dwm 周期：'天d、周w、月m'
 */

module.exports = function (app, connection) {
    app.get('/api/update', async (req, res) => {
        console.log(`-------------开始执行 /api/update---------------`);

        let { query } = req
        let dwm = query.dwm || 'd'
        // 获取到today还没被update的code
        let used = await SQL.getTables({
            connection,
            name: 'used',
            conditions: `dwm='${dwm}'`
        })
        let tds = await SQL.getTables({
            connection,
            name: 'today',
            conditions: `dwm='${dwm}'`
        })
        tds = tds.map(v => v.code)
        let unused = used.filter(v => !tds.includes(v.code))

        let count = 0, num = 6
        let fn = async function () {
            let item = unused.slice(count, count += num)
            if (item.length) {
                let codes = item.map(v => v.code)
                
                let ret = await getContent({ codes, query })
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
                            dwm
                        })
                    } else {
                        // await update({connection, item: level1, dwm})
                        await SQL.save({connection, item: level1, dwm})
                        await SQL.setTables({
                            connection, code, type,
                            name: 'today',
                            dwm
                        })
                    }
                    res.splice(-1)
                }
                setTimeout(() => {
                    console.log(`------${count}/${unused.length}------`);
                    fn()
                }, 200)
            } else {
                sendMail(`update： ${dwm} 成功！`)
                console.log(`-------------执行完成 /api/update---------------`);
            }
        }
        fn()
    })
}