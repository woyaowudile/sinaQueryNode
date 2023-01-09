/** @format */

const request = require("request");
const { someDay } = require("../model/methods");
const { MA } = require("./methods");

const { sohu, sina, ig502, holidays, dfcf } = require("./url");

const LICENCE = "3E68261B-3A3D-88E6-E903-B0C327D49AA4";

const URL = {
    sohu: ({ codes, start, end, stat = 1, order = "A", period = "d" }) => {
        /**
         * codes：[600999, 600998...]
         * stat: 1 表示，统计start到end时间的统计内容, 统计的内容：[累计，日期，xx,涨跌幅，l,h,v,成交额，换手率]
         * order: 降序(D)，升序(A)
         * period: d\w\m
         */
        let arrs = codes.map((v) => "cn_" + v).join(",");
        let url = `${sohu}?code=${arrs}&stat=${stat}&order=${order}&period=${period}`;
        if (start) {
            url += `&start=${start}`;
        }
        if (end) {
            url += `&end=${end}`;
        }
        return url;
    },
    dfcf: ({ start, end, period, codes }) => {
        let fields1 = "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13";
        let fields2 = "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61";
        let klt = "101";
        switch (period) {
            case "d": // 天
                klt = "101";
                break;
            case "w": // 周
                klt = "102";
                break;
            case "m": // 月
                klt = "103";
                break;
            case "q": // 季度
                klt = "104";
                break;
            case "hy": // 半年
                klt = "105";
                break;
            case "y": // 年
                klt = "106";
                break;
            default:
                break;
        }
        let code = (codes.jys === "sh" ? `1.` : "0.") + codes.code;

        return `${dfcf}?fields1=${fields1}&fields2=${fields2}&beg=${start}&end=${end}&rtntype=6&secid=${code}&klt=${klt}&fqt=1`;
    },
    sina: ({ page, num }) => {
        /**
         * page: 20,
         * num: 100,
         */
        return `${sina}?page=${page}&num=${num}&node=sh_a`;
    },
};

let TYPE = "";

function handleResult({ error, name, callback }) {
    // error 是接口调用失败的错误说明，
    // err是手动定义的，如果接口报这些错，不要中断程序
    let result = {
        code: "rl",
        message: `${name} resolve`,
        data: null,
        err: "",
    };
    if (error) {
        result = {
            code: "rj",
            message: `${name}: ${error.message}`,
            data: null,
        };
    } else {
        return callback ? callback(result) : result;
    }
    return result;
}

function callback(url, params) {
    let endTime = params.days && new Date(`${params.days}`).getTime();
    return new Promise((rl, rj) => {
        request(
            {
                url,
                method: "GET",
                headers: {
                    "Content-Type": "text/json",
                },
            },
            (error, response, body) => {
                // 其他是错误信息，‘{}\n’表示没值
                let conditions = ["body is null", "non-existent", "An error occurred.", "connect ETIMEDOUT 162.14.132.226:443", "{}\n"];
                let index = -1;
                if (body) {
                    index = conditions.findIndex((v) => body.indexOf(v) > -1);
                } else {
                    index = 0;
                }
                let flag = index > -1,
                    datas;

                let res = handleResult({
                    error,
                    name: TYPE,
                    callback: (result) => {
                        datas = !flag && JSON.parse(body);

                        if (TYPE === "dfcf") {
                            let arrs = [];

                            [datas].forEach((item) => {
                                const { data, rc } = item;
                                const { klines, code, name } = data || {};

                                if (rc === 0) {
                                    let hp = klines.map((v) => v.split(","));
                                    let preClose = 0;
                                    let [last] = hp.slice(-1);
                                    let lastTime = last ? new Date(last[0]).getTime() : 0;
                                    let sub = 1000 * 3600 * 24 * 10; // 如果相差10天以内就不是下市
                                    if (endTime ? lastTime + sub >= endTime : true) {
                                        arrs.push({
                                            code,
                                            type: code.slice(0, 3),
                                            data: hp.map((level1, index1) => {
                                                let [d, o, c, h, l, v, e, zf, zd, zde, hs] = level1;
                                                // let zf = (((h - l) / preClose / 1) * 100).toFixed(2);
                                                let ma10 = MA(hp, index1, 10, "2");
                                                let ma20 = MA(hp, index1, 20, "2");
                                                let ma60 = MA(hp, index1, 60, "2");
                                                preClose = c;
                                                return {
                                                    code,
                                                    hs,
                                                    e,
                                                    d,
                                                    o,
                                                    c,
                                                    zd,
                                                    zde,
                                                    l,
                                                    h,
                                                    v,
                                                    zf,
                                                    ma10,
                                                    ma20,
                                                    ma60,
                                                };
                                            }),
                                        });
                                    } else {
                                        result.err = last ? `好像下市了：${last[0]}` : `好像没有这个股票：${code}`;
                                    }
                                } else {
                                    result.error = { message: "data is null" };
                                }
                            });
                            result.data = arrs;
                        } else if (!(datas instanceof Array)) {
                        } else if (TYPE === "sohu") {
                            let arrs = [];

                            datas.forEach((data) => {
                                let { code, hq, msg, status, stat } = data;

                                if (status === 0) {
                                    let [last] = hq.slice(-1);
                                    let lastTime = new Date(last[0]).getTime();
                                    let sub = 1000 * 3600 * 24 * 10; // 如果相差10天以内就不是下市
                                    let hqs = params.method === "update" ? hq.slice(-1) : hq;
                                    // 倒数第二条做为前一天
                                    let preClose = params.method === "update" ? hq.slice(-2, -1)[0][2] || 0 : 0;

                                    if (endTime ? lastTime + sub >= endTime : true) {
                                        let codeName = code.split("_")[1];
                                        arrs.push({
                                            code: codeName,
                                            type: codeName.slice(0, 3),
                                            data: hqs.map((level1, index1) => {
                                                let index = params.method === "update" ? hq.length - 1 : index1;
                                                let [d, o, c, zde, zd, l, h, v, e, hs] = level1;
                                                let zf = (((h - l) / preClose / 1) * 100).toFixed(2);
                                                let ma10 = MA(hq, index, 10, 2);
                                                let ma20 = MA(hq, index, 20, 2);
                                                let ma60 = MA(hq, index, 60, 2);
                                                preClose = c;
                                                return {
                                                    code: codeName,
                                                    hs: hs.slice(0, -1),
                                                    zd: zd.slice(0, -1),
                                                    d,
                                                    o,
                                                    c,
                                                    zde,
                                                    l,
                                                    h,
                                                    v,
                                                    e,
                                                    zf,
                                                    ma10,
                                                    ma20,
                                                    ma60,
                                                };
                                            }),
                                        });
                                    } else {
                                        result.err = `好像下市了：${last[0]}`;
                                    }
                                } else {
                                    result.error = msg;
                                }
                            });
                            result.data = arrs;
                        } else if (TYPE === "sina") {
                            debugger;
                            result.data = data.map((level1) => {
                                /**
                                 * buy：收盘价
                                 * mktcap: 总市值
                                 * nmc: 流通值
                                 * turnoverratio: 换手率
                                 * amount：成交额
                                 * pb：市净率
                                 * changepercent：涨跌幅
                                 */
                                let { open, buy, high, low, volumn, name, code, mktcap, nmc } = level1;
                            });
                        }

                        result.url = url;
                        return result;
                    },
                });
                if (flag) {
                    res.code = "rl";
                    res.err = conditions[index];
                }
                eval(res.code)(res);
            }
        );
    });
}

module.exports = {
    getRealIG502: ({ code }) => {
        request(
            {
                url: `${ig502}/time/real/${code}?licence=${LICENCE}`,
                method: "GET",
                headers: {
                    "Content-Type": "text/json",
                },
            },
            (error, response, body) => {
                debugger;
            }
        );
    },
    getIG502: ({ code, history = true, dmw = "Day_qfq" }) => {
        return new Promise((rl, rj) => {
            let base = history ? "/time/history/trade" : "/time/real/time";
            request(
                {
                    url: `${ig502}${base}/${code}/${dmw}?licence=${LICENCE}`,
                    method: "GET",
                    headers: {
                        "Content-Type": "text/json",
                    },
                },
                (error, response, body) => {
                    let res = handleResult({
                        error,
                        name: `${base} ${dmw}`,
                        callback: (result) => {
                            let data = JSON.parse(body);
                            result.data = [
                                {
                                    code,
                                    type: code.split("_")[1],
                                    data,
                                },
                            ];
                            return result;
                        },
                    });
                    eval(res.code)(res);
                }
            );
        });
    },
    getList: (base = "/base/gplist") => {
        return new Promise((rl, rj) => {
            request(
                {
                    url: `${ig502}${base}?licence=${LICENCE}`,
                    method: "GET",
                    headers: {
                        "Content-Type": "text/json",
                    },
                },
                (error, response, body) => {
                    let res = handleResult({
                        error,
                        name: "ig502_list",
                        callback: (result) => {
                            let data = JSON.parse(body).map((v) => {
                                let { dm, jys, mc } = v;
                                return `('${dm}', '${dm.slice(0, 3)}', '${mc}', '${jys}')`;
                            });
                            result.data = data.join(",");
                            return result;
                        },
                    });
                    eval(res.code)(res);
                }
            );
        });
    },
    get: (params) => {
        TYPE = params.type || "sohu";
        return callback(URL[TYPE](params), params);
    },
    getHolidays: (inDay) => {
        const workday = 2; // 非工作日
        const date = new Date(inDay);
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, 0);
        const day = `${date.getDate()}`.padStart(2, 0);
        const week = date.getDay();
        return new Promise((rl, rj) => {
            request(
                {
                    url: `${holidays}&workday=${workday}&year=${year}&month=${year}${month}`,
                    method: "GET",
                    headers: {
                        "Content-Type": "text/json",
                    },
                },
                (error, response, body) => {
                    const current = (year + month + day) / 1;
                    // console.log("body", body);
                    const res = JSON.parse(body);
                    if (res.code === 0) {
                        const lists = res.data.list,
                            result = { isWorkDay: true, d: 0, w: 0, m: 0 };
                        let cur = current,
                            flag = false;

                        let endDate = new Date(year, month, 0).getDate();
                        result.isWorkDay = !lists.find((v) => v.date === current);

                        // 设置周
                        lists.some((v, i, arrs) => {
                            if (result.isWorkDay) {
                                if (current > v.date || i === arrs.length - 1) {
                                    let pre = arrs[i - 1];
                                    let sub = pre ? pre.date - current : 0;
                                    if (!pre) {
                                        // 最后一周没有周末的情况，2022-09
                                        result.w = endDate === day ? 0 : week;
                                    } else if (sub === 1 || sub < 0) {
                                        // 节假日前一天
                                        result.w = 0;
                                    } else {
                                        // 节假日前几天
                                        result.w = week === 0 ? 7 : week;
                                    }
                                    return true;
                                }
                            } else {
                                if (v.date === cur) {
                                    cur--;
                                    result.w++;
                                }
                            }
                        });
                        // 设置月
                        if (day === endDate) {
                            result.isWorkMonth = true;
                            result.m = 0;
                        } else {
                            result.m = day / 1;
                        }

                        // 判断值，是否是周六、周日
                        let fn = function (dwm) {
                            let days = new Date(someDay(result[dwm], "-", `${year}-${month}-${day}`)).getDay();
                            if (days === 0) {
                                result[dwm] += 2;
                            } else if (days === 6) {
                                result[dwm] += 1;
                            }
                        };
                        ["w", "m"].forEach((v) => fn(v));

                        rl(result);
                    }
                }
            );
        });
    },
};

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

/**
 * 东方财富：http://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&beg=20210825&end=20210825&secid=1.600999&klt=101&fqt=1
 * [d, o, c, h, l, v, e, zf, zd, zde, hs]
 */
