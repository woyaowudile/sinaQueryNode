
const request = require('request')

const $Methods = require('./methods')

const { sohu, sina, ig502 } = require('./url')

const LICENCE = '3E68261B-3A3D-88E6-E903-B0C327D49AA4'

const URL = {
    sohu: ({codes, start, end, stat = 1, order = 'A', period='d'}) => {
        /**
         * codes：[600999, 600998...]
         * stat: 1 表示，统计start到end时间的统计内容, 统计的内容：[累计，日期，xx,涨跌幅，l,h,v,成交额，换手率]
         * order: 降序(D)，升序(A)
         * period: d\w\m
         */
        let arrs = codes.map(v => "cn_" + v).join(',')
        let url = `${sohu}?code=${arrs}&stat=${stat}&order=${order}&period=${period}`
        if (start) {
            url += `&start=${start}`
        }
        if (end) {
            url += `&end=${end}`
        }
        return url
    },
    sina: ({page, num}) => {
        /**
         * page: 20,
         * num: 100,
         */
        return `${sina}?page=${page}&num=${num}&node=sh_a`
    }
}

let TYPE = ''

function handleResult({ error, name, callback }) {
    // error 是接口调用失败的错误说明，
    // err是手动定义的，如果接口报这些错，不要中断程序
    let result = {
        code: 'rl',
        message: `${name} resolve`,
        data: null,
        err: ''
    }
    if (error) {
        result = {
            code: 'rj',
            message: `${name}: ${error.message}`,
            data: null
        }
    } else {
        return callback ? callback(result) : result
    }
    return result
}

function callback(url, params) {
    let endTime = params.days && new Date(`${params.days}`).getTime()
    return new Promise((rl, rj) => {
        request({
            url,
            method:'GET',
            headers:{
                'Content-Type':'text/json'
            }
        }, (error,response,body) => {
            let conditions = [
                'body is null',
                'non-existent',
                'An error occurred.',
                'connect ETIMEDOUT 162.14.132.226:443'
            ]
            let index = -1
            if (body) {
               index = conditions.findIndex(v => body.indexOf(v) > -1)
            } else {
                index = 0
            }
            let  flag = index > -1, datas

            let res = handleResult({error, name: TYPE, callback: (result) => {
                
                datas = !flag && JSON.parse(body)
                
                if (!(datas instanceof Array)) {}
                else if (TYPE === 'sohu') {

                    let arrs = []

                    datas.forEach(data => {

                        let { code, hq, msg, status, stat } = data

                        if (status === 0) {
                            let preClose = 0
                            let [last] = hq.slice(-1)
                            let lastTime = new Date(last[0]).getTime()

                            if (endTime ? (lastTime >= endTime) : true) {
                                let codeName = code.split('_')[1]
                                arrs.push({
                                    code: codeName,
                                    type: codeName.slice(0, 3),
                                    data: hq.map((level1, index1) => {
                                        let [ d, o, c, zde, zd, l, h, v, e, hs ] = level1
                                        let zf = ((h - l) / preClose / 1 * 100).toFixed(2)
                                        let ma10 = $Methods.MA(hq, index1, 10)
                                        let ma20 = $Methods.MA(hq, index1, 20)
                                        let ma60 = $Methods.MA(hq, index1, 60)
                                        preClose = c
                                        return {
                                            code: codeName,
                                            hs: hs.slice(0, -1),
                                            zd: zd.slice(0, -1),
                                            d, o, c, zde, l, h, v, e,
                                            zf, ma10, ma20, ma60
                                        }
                                    })
                                })
                            } else {
                                result.err = `好像下市了：${last[0]}`
                            }
                        } else {
                            result.error = msg
                        }
                    })
                    result.data = arrs
                } else if (TYPE === 'sina') {
                    debugger
                    result.data = data.map(level1 => {
                        /**
                         * buy：收盘价
                         * mktcap: 总市值
                         * nmc: 流通值
                         * turnoverratio: 换手率
                         * amount：成交额
                         * pb：市净率
                         * changepercent：涨跌幅
                         */
                        let { open, buy, high, low, volumn, name, code, mktcap, nmc } = level1
    
                    })
                }
                
                result.url = url
                return result
            }})
            if (flag) {
                res.code = 'rl'
                res.err = conditions[index]
            }
            eval(res.code)(res)
        })
    })
}

module.exports = {
    getRealIG502: ({code}) => {
        request({
            url: `${ig502}/time/real/${code}?licence=${LICENCE}`,
            method:'GET',
            headers:{
                'Content-Type':'text/json'
            }
        }, (error,response,body) => {
            debugger
        })
    },
    getIG502: ({code, history=true, dmw='Day_qfq'}) => {
        return new Promise((rl, rj) => {
            let base = history ? '/time/history/trade' : '/time/real/time'
            request({
                url: `${ig502}${base}/${code}/${dmw}?licence=${LICENCE}`,
                method:'GET',
                headers:{
                    'Content-Type':'text/json'
                }
            }, (error,response,body) => {
                let res = handleResult({error, name: `${base} ${dmw}`, callback: (result) => {
                    let data = JSON.parse(body)
                    result.data = [
                        {
                            code,
                            type: code.split('_')[1],
                            data
                        }
                    ]
                    return result
                }})
                eval(res.code)(res)
            })
        })
    },
    getList: (base = '/base/gplist') => {
        return new Promise((rl, rj) => {
            request({
                url: `${ig502}${base}?licence=${LICENCE}`,
                method:'GET',
                headers:{
                    'Content-Type':'text/json'
                }
            }, (error,response,body) => {
                let res = handleResult({ error, name: 'ig502_list', callback: (result) => {
                    let data = JSON.parse(body).map(v => {
                        let { dm, jys, mc } = v
                        return `('${dm}', '${dm.slice(0,3)}', '${mc}', '${jys}')`
                    })
                    result.data = data.join(',')
                    return result
                } })
                eval(res.code)(res)
            })
        })
    },
    get: (params) => {
        TYPE = params.type || 'sohu'
        return callback(URL[TYPE](params), params)
    }
}

/**
 * 搜狐接口： https://q.stock.sohu.com/hisHq?code=cn_600999,600998&start=20210925&end20210925
 * 
 *  0：      日期       d                      
 *  1：      开盘价     o        open
 *  2：      收盘价     c        trade
 *  3：      上涨金额   zde      pricechange    
 *  4：      涨幅       zd       changeprecent
 *  5：      最低价     l        low
 *  6：      最高价     h        high
 *  7：      换手量     v        volumne
 *  8：      换手额     e        amount
 *  9：      换手率     hs       turnoverratio
 *           振幅      zf        （high-low）/settlement
 *           总市值              mktcap
 *           流通值              nmc
 *           市净率              pb
 *           卖一                sell
 *           买一                buy
 *           昨收                settlement
 * 
 */