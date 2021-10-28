const API = require('../api')
const SQL = require('../sql')
const { sendMail } = require('../utils/sendEmail')

function getContent({codes, start, end, query}) {
    
    let period = query.dwm || 'd'
    /**
     * 例如国庆节，这时候end应该是放假前的一天，
     * 这个code比如，最后的时间是2018-12-31.
     * 这时候无法去判断，这个code还有没有存入used表的价值
     * 具体，参考 api/index/的get()
     */
    let days = (query.days / 1) || 0

    if (!start) {
        start = 19920601 || someDay(days, '')
    }
    if (!end) {
        end = someDay(days, '')
    }
    let others = {
        days: someDay(days, '-')
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
            period,
            ...others
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


/**
 * 
 * @param {Number} days 天数 表示从今天之前的第n天到今天
 * @param {String} dwm 周期：'天d、周w、月m'
 */

module.exports = function (app, connection) {
    app.get('/api/init', async (req, res) => {
        console.log(`-------------开始执行 /api/init---------------`);
        let { query } = req
        let dwm = query.dwm || 'd'
        
        // 获取到today还没被init的code
        let usedres = await SQL.getTables({
            connection,
            name: 'used',
            conditions: `dwm='${dwm}'`
        })
        let failres = await SQL.getTables({
            connection,
            name: 'fail',
            conditions: `dwm='${dwm}'`
        })

        const lists = await SQL.getList({ connection })
        let arrs = lists.slice(0, lists.length)

        let used = usedres.concat(failres).map(v => v.code)

        let unused = arrs.filter(v => !used.includes(v.code))

        let count = 0, num = 1
        let fn = async function () {
            let item = unused.slice(count, count += num)
            if (item.length) {
                let codes = item.map(v => v.code)
                let ret = await getContent({ codes, query })
                let res = ret.data
                
                /**
                 * init一定要 一个一个调，所以 num = 1 不能改
                 * 因为如果这个code调不到，之后update就不要调这个了
                 */
                let code = codes[0]
                let type = code.slice(0,3)
                if (ret.err) {
                    console.log(`>>> 这个${code}有问题： ${ret.err}`);
                    await SQL.setTables({
                        connection, code, type,
                        name: 'fail',
                        dwm
                    })
                }
                /* *************************E_N_D************************* */

                while(res && res.length) {
                    let [level1] = res.slice(-1)
                    
                    // let { code, type } = level1
                    // if (ret.err) {
                    //     console.log(`>>> 这个${code}有问题： ${ret.err}`);
                    //     await SQL.setTables({
                    //         connection, code, type,
                    //         name: 'fail',
                    //         dwm: 'day'
                    //     })
                    // } else {
                        await SQL.save({connection, item: level1, dwm})
                        await SQL.setTables({
                            connection, code, type,
                            name: 'used',
                            dwm
                        })
                    // }
                    res.splice(-1)
                }

                setTimeout(() => {
                    console.log(`------${count}/${unused.length}------`);
                    fn()
                }, 200)
            } else {
                sendMail(`sina init： ${dwm} 成功！`)
                console.log(`-------------执行完成 /api/init---------------`);
            }
        }
        fn()
        
        // const ret = await API.get({
        //     // 通用属性
        //     type: 'sina',
        //     // sina属性
        //     page: 1,
        //     num: 100,
        //     // sohu属性
        //     codes: ['601999'],
        //     start: '20210825',
        //     end: '20210925'
        // })
    })
}