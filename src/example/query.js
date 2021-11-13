const API = require('../api')
const SQL = require('../sql')

const $model = require('../model')

function getModel({item: datas, date, dwm, type}) {
    let coords = [], results = []
    let current = new Date(date).getTime()
    
    datas.forEach((level1, index1) => {
        let { zd, d } = level1

        let now = new Date(d).getTime()
        if (now < current) return
        
        let params = {
            dwm,
            datas,
            start: index1,
            results
        }

        switch($model.YingYang(level1)) {
            case 1: 
                $model.isklyh(params)
                break;
            case 2:
                // let days = $model.isYjsd(params)
                if (zd <= 9.5) {} else {}
                break;
            case 3:
                break;
            default:
                break;
        }
        // $model.qs(datas, [''])
    })
    // let results = {
    //     coords,
    //     data: datas,
    //     dwm,
    //     type
    // }
    return results
}

/**
 * 
 * @param {Number} days 天数 表示从今天之前的第n天到今天
 * @param {date} date 日期，效果等同于days，筛选条件用
 * @param {String} dwm 周期：'天d、周w、月m'
 * @param {Number} size 每页数量
 * @param {Number} page 第几页
 */
let resultsAllCodes = {}
let resultsParams = {
    codes: [],
    waiting: false,
    status: ''
}
let stash = {
    useds = []
}

module.exports = function (app, connection) {
    app.get('/api/query', async (req, res) => {
        console.log(`-------------开始执行 /api/query---------------`);

        resultsParams.waiting = true
		/* 
			days：5（从5天前到今天的数据）
			// date: ()
			dwm: 年月日
			codes：[603,601...] 对应的603下所有的数据从数据库拿到，会很慢
		 */
        let { days, date, dwm = 'd', codes } = req.query
        let d = $model.someDay(days, '-')
        
        let usedres = stash.useds
        if (usedres.length === 0) {
            usedres = await SQL.getTables({
                connection,
                name: 'used',
                conditions: `dwm='${dwm}'`
            })
        }

        let usedTypes = [...new Set(usedres.map(v => v.type))]
        usedTypes = usedTypes.filter(v => codes.indexOf(v) > -1)
        usedTypes = usedTypes.filter(v => !resultsParams.codes.some(d => d[v]))

        let total = usedTypes.length
        
        let count = -1, num = 1
        let result = {
            code: 200,
            message: '',
            data: []
        }

        let fn = async function () {
            let type = usedTypes[++count]
            if (type) {

                // let conditions = `dwm='${dwm}' `
                let conditions = ``
                if (d) {
                    conditions += `d>='${d}'`
                }
                const query_res = await SQL.getTables({
                    connection,
                    name: type,
                    conditions
                })
                let code  = ''
                query_res.forEach(v => {
                    let { code } = v
                    if (resultsAllCodes[code]) {
                        resultsAllCodes[code].push(v)
                    } else {
                        resultsAllCodes[code] = [v]
                    }
                })

                resultsParams.codes.push(type)
                resultsParams.status = `${count+1} / ${usedTypes.length}`

                setTimeout(() => {
                    console.log(`------${count+1} / ${usedTypes.length}()------`);
                    fn()
                }, 200)
            } else {
                result.data = Object.keys(resultsAllCodes)
                res.send(result)
                resultsParams.waiting = false
                console.log(`-------------执行完成 /api/query---------------`);
            }
        }
        fn()
        
    })



    app.get('/api/querymodel', async (req, res) => {
        console.log(`-------------开始执行 /api/query---------------`);
        if (resultsParams.waiting) {
            res.send({
                code: 200,
                message: `请等待query接口完成（${resultsParams.status}）`,
                data: []
            })
        }
        if (Object.keys(resultsAllCodes).length === 0) {
            res.send({
                code: 200,
                message: `resultsAllCodes还没有数据`,
                data: []
            })
        }
        
        let { days, date, dwm = 'd', size = 10, page, index = 0 } = req.query
        let keys = Object.keys(resultsAllCodes)
        keys = keys.slice(index, keys.length)
        
        
        let count = -1, num = 0
        let result = {
            code: 200,
            message: '成功',
            index: index / 1,
            data: []
        }

        let fn = async function () {
            let item = resultsAllCodes[keys[++count]]
            if (item && result.data.length < size) {
            // if (item) {
                let { dwm, type, code } = item[0]

                const res = getModel({item, date, dwm, type})
                
                if (res.length > 0) {
                    num = count + 1
                    if (result.data[code]) {
                        result.data[code] = res
                    } else {
                        result.data.push({
                            [code]: res
                        })
                    }
                }
                setTimeout(() => {
                    console.log(`------${count+1}/${keys.length}(${result.data.length}/${size})------`);
                    fn()
                }, 50)
            } else {
                result.index += num
                res.send(result)
                console.log(`-------------执行完成 /api/query---------------`);
            }
        }
        fn()
        
    })
}