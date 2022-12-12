/** @format */
const fs = require("fs");
const request = require("request");
const nodeExcel = require("node-xlsx");
const { MA } = require("../api/methods");
const { sendMail } = require("../utils/sendEmail");
const { modelsCode } = require("../utils/code");
const SQL = require("../sql");

class Methods {
    constructor() {
        this.YingYang = (data) => {
            if (!data) return;
            // ying1， yang2，shizixing3
            let { o, c } = data;
            if (c < o) {
                return 1;
            } else if (c > o) {
                return 2;
            } else {
                return 3;
            }
        };
        this.abs = (data) => {
            if (!data) return;
            let { o, c } = data;
            return Math.abs(c - o);
        };
        this.max = (data) => {
            if (!data) return;
            let { o, c } = data;
            return Math.max(o, c);
        };
        this.entity = (data) => {
            // 实体 = (收-开)/开
            if (!data) return;
            // 大实体：, 中实体：>0.0179-0.0310 ， 小实体：
            return (this.abs(data) / this.max(data)).toFixed(4) / 1;
        };
        this.zdf = (datas) => {
            // 大于 2% 中阴阳线
            // 大于 > 5 % 大阴阳线
            // todo ... 处理一字涨停板
            let [pre, current] = datas;
            let result = ((current.c - pre.c) / pre.c) * 100;
            return result.toFixed(2) / 1;
        };
        this.lineLong = (data, type = "") => {
            const { h, l, c, o } = data;
            let top = h - Math.max(c, o);
            let bottom = Math.min(c, o) - l;
            let body = this.abs(data);
            return top * 2 < body && bottom * 2 < body;
        };
        this.trend = ({ datas, start, stretch = 60 }) => {
            const index = start - stretch + 1;
            const arrs = datas.slice(index, start + 1);
            let current = datas[start];
            if (!arrs.length) {
                return {};
            }
            let fn = function (lists = [], isContainK = 5) {
                let findObj = {},
                    tans = [];
                [...lists].reverse().some((v, i) => {
                    let reIndex = lists.length - 1 - i;
                    let max = Math.max(v.c, v.o);
                    let maxd = v.d;
                    let min = Math.min(v.c, v.o);
                    let mind = v.d;
                    // 表示current，前5根不参与. isContainK可以为number、false、undefined、null等
                    if (reIndex < isContainK) {
                        return true;
                    }
                    if (i === 0) {
                        findObj = {
                            max,
                            maxd,
                            min,
                            mind,
                            maxi: reIndex,
                            mini: reIndex,
                            glodLineArea: {},
                            tans: [],
                        };
                    } else {
                        if (max >= findObj.max) {
                            findObj.max = max;
                            findObj.maxd = v.d;
                            findObj.maxi = reIndex;
                        }
                        if (min <= findObj.min) {
                            findObj.min = min;
                            findObj.mind = v.d;
                            findObj.mini = reIndex;
                        }
                    }

                    tans.unshift(-Math.tan(Math.abs(current.c - v.c) / lists.length).toFixed(2));
                });
                findObj.status = findObj.mini > findObj.maxi ? 2 : 1;
                // 黄金分割，根据near来判断，near为top(1)则从最后一个bottom -> top
                const goldSplitLine = [0, 23.6, 38.2, 50, 61.8, 80.9, 100, 138.2, 161.8, 200, 238.2].map((v) => {
                    let sub = Math.abs(findObj.max - findObj.min),
                        number = 0;
                    if (findObj.status === 1) {
                        number = (sub / 100) * v + findObj.min;
                    } else {
                        number = findObj.max - (sub / 100) * v;
                    }

                    return number.toFixed(2);
                });
                let chatOption = chart(tans, goldSplitLine, lists);
                console.log(JSON.stringify(chatOption));

                return { findObj, tans };

                // 开始： 最高、最低
                // 当前： 最高、最低
                // 非高低点：开始、结束、最高、最低、没有
            };
            let chart = function (tans, goldSplitLine, lists) {
                return {
                    tooltip: {
                        trigger: "axis",
                    },
                    xAxis: {
                        type: "category",
                        data: lists.map((v, i) => i),
                    },
                    yAxis: [
                        {
                            type: "value",
                            name: "test1",
                        },
                        {
                            type: "value",
                            name: "test2",
                        },
                    ],
                    series: [
                        {
                            data: lists.map((v) => v.c),
                            type: "line",
                        },
                        {
                            data: tans,
                            type: "line",
                            yAxisIndex: 1,
                        },
                        // ...goldSplitLine.map((v) => {
                        //     return {
                        //         data: new Array(lists.length).fill(v),
                        //         type: "line",
                        //     };
                        // }),
                    ],
                };
            };
            let tanTrend = function (tans) {
                // 使用tan的集合来判断上涨、下跌、横盘
                let jh = {},
                    number = 0,
                    index = 0;
                tans.forEach((v, i) => {
                    if (jh[number] && jh[number].price === v) {
                        jh[number].count++;
                        jh[number].end++;
                    } else {
                        jh[++number] = { count: 1, price: v, start: i, end: i };
                    }
                });
                // price是负值
                // let prices = Object.values(jh).map((v) => v.price);
                // let price_max = Math.max(...prices);
                // let price_min = Math.min(...prices);
                // let price_first = jh[1].price;
                let count = 0;
                Object.keys(jh).forEach((v, i) => {
                    let current = jh[v];
                    // 1涨2跌3中间
                    let position = 1;
                    if (i === 0) {
                    } else {
                        let pre = jh[v - 1];
                        //    例如：-0.05 - (-0.04) < 0 表示下跌，否则上涨（如果是相减为0，就不加|减）
                        current.price - pre.price < 0 ? count-- : current.price - pre.price !== 0 && count++;
                    }
                });
                return count;
            };

            let { findObj, tans } = fn(arrs, false);
            let status = tanTrend(tans);

            let times = 0,
                gradientLine = [];

            // let splitIndex = -1;
            // if (findObj.status === 1) {
            //     // 上涨(1), 下跌(2)
            //     splitIndex = findObj.maxi;
            // } else {
            //     splitIndex = findObj.mini;
            // }
            // let before = arrs.slice(0, splitIndex);
            // let after = arrs.slice(splitIndex, arrs.length);

            // // 前一个的大、小值
            // let beforeFindobj = fn(before, false);

            // 1. 分母相同，比较分子的倍率，比如 回调0.5、0.618
            const maxWidth = arrs.length - findObj.maxi;
            const maxHeight = findObj.max;
            const minWidth = arrs.length - findObj.mini;
            const minHeight = findObj.min;
            // const denominator = maxWidth * minWidth;
            // const moleculeMax = maxHeight * minWidth;
            // const moleculeMin = minHeight * maxWidth;

            // const maxTan = Math.tan(maxHeight / maxWidth);
            // const minTan = Math.tan(minHeight / minWidth);

            // 以max 连接current 得到的一条线，和收盘价比较
            const gradientFn = (i) => findObj.max - (maxHeight / maxWidth) * i;
            // const gradientFn = (i) =>  (minHeight / minWidth) * i

            // 2. 根据斜率线获取到最高、最低的块集合
            let results = { tops: { list: [], indexs: {} }, bottoms: { list: [], indexs: {} }, not: {} };
            arrs.forEach((v, i) => {
                // // maxi是datas的索引，使用arrs的索引需要 减去
                // if (i < findObj.maxi - index) return;
                // let subIndex = i + 1;
                let subIndex = i;
                let pre = false;
                let listTop = "";
                let listBot = "";

                // 如果 max 在后面，则，前面所有的都算在bottom里面
                if (i <= findObj.maxi) {
                    listBot = v;
                } else {
                    // maxi应该是斜率的第一项 ， 即 findObj.maxi - subIndex
                    const point = gradientFn(subIndex - findObj.maxi);
                    listTop = Math.max(v.c, v.o) > point ? v : "";
                    listBot = Math.min(v.c, v.o) < point ? v : "";

                    // 存入斜率线
                    gradientLine.push(point.toFixed(2));
                }

                if (listTop && listBot) {
                    // 如果斜率穿过实体，则延续之前的状态，比如0-10是top，11被穿过，则0-11都是top
                    results.not[subIndex] = listTop;
                    return;
                } else if (listTop) {
                    results.tops.indexs[results.tops.index || 0] = subIndex;
                    results.bottoms.index = subIndex;
                } else if (listBot) {
                    results.bottoms.indexs[results.bottoms.index || 0] = subIndex;
                    results.tops.index = subIndex;
                }
                results.tops.list.push(listTop);
                results.bottoms.list.push(listBot);
            });
            // 刷选出在 上/下 的 所有， 连续的没有'' 的组成一个小块。上找max，下找min，用作前高压力位，支撑位
            let blocksMax = [],
                blocksMin = [],
                near = 0;
            Object.keys(results.tops.indexs).forEach((v) => {
                let topsIndex = v;
                if (v !== 0) {
                    // 除了0之外的左侧的索引都要加一，即 (左边，右边]
                    topsIndex++;
                }
                // 如果左右索引的差值小于5，就忽略
                if (results.tops.indexs[v] - v < 5) return;
                if (near <= results.tops.indexs[v]) {
                    near = results.tops.indexs[v];
                    results.near = 1;
                }

                let lists = arrs.slice(topsIndex, results.tops.indexs[v] + 1).map((v) => Math.max(v.c, v.o));
                blocksMax.push(Math.max(...lists));
            });
            Object.keys(results.bottoms.indexs).forEach((v) => {
                let topsIndex = v;
                if (v !== 0) {
                    // 除了0之外的左侧的索引都要加一，即 (左边，右边]
                    topsIndex++;
                }
                // 如果左右索引的差值小于5，就忽略
                if (results.bottoms.indexs[v] - v < 5) return;
                if (near <= results.bottoms.indexs[v]) {
                    near = results.bottoms.indexs[v];
                    results.near = 2;
                }

                let lists = arrs.slice(topsIndex, results.bottoms.indexs[v] + 1).map((v) => Math.min(v.c, v.o));
                blocksMin.push(Math.min(...lists));
            });

            // maxi 在 mini 的后面，表示上涨（1）。下跌表示为（2）
            if (findObj.maxi > findObj.mini) {
                // 上涨后，回调的深度
                times = 1 - Math.max(current.c, current.o) / maxHeight || 100;
            } else {
                // 下降后，反弹的深度
                times = Math.min(current.c, current.o) / maxHeight;
            }

            // 如果current既不是max，也不是min。且times回调了100，就表示是横盘
            // if (arrs.length - 1 === findObj.maxi || arrs.length - 1 === findObj.mini) {
            //     // 上涨后的横盘 11， 下跌后的横盘 12
            //     findObj.status += 10;
            // }
            /** 判断顶顶和底底  **/
            if (!blocksMax.length) {
                // 如果没有高点，则将区域内的最大值做为前高
                blocksMax = [findObj.max];
            }
            // 黄金分割，根据near来判断，near为top(1)则从最后一个bottom -> top
            const goldSplitLine = [0, 23.6, 38.2, 50, 61.8, 80.9, 100, 138.2, 161.8, 200, 238.2].map((v) => {
                let sub = Math.abs(findObj.max - findObj.min),
                    number = 0;
                if (findObj.maxi > findObj.mini) {
                    number = (sub / 100) * v + findObj.min;
                } else {
                    number = findObj.max - (sub / 100) * v;
                }

                return number.toFixed(2);
            });
            return {
                trend_find_obj: JSON.stringify(findObj),
                trend_near: results.near,
                // before_kdj: this.MALine(arrs),
                trend_glod_line: goldSplitLine,
                trend_gradient_line: gradientLine,
                trend_status: status,
                trend_pressure: blocksMax,
                trend_support: blocksMin,
                trend_times: times.toFixed(2),
                trend_tans: tans,
            };
        };
        // 成交量的5、10线相较，应用于神2
        this.MAVLine = (datas, ns = [5, 10]) => {
            return datas.map((v, i) => {
                const vs = {};
                ns.forEach((d) => {
                    vs[`v${d}`] = MA(datas, i, d, "v");
                });
                return {
                    ...v,
                    ...vs,
                };
            });
        };
        this.MALine = (datas, callback) => {
            const inParams = {};
            inParams.ma10 = datas.map((v) => v.ma10 || 0);
            inParams.ma20 = datas.map((v) => v.ma20 || 0);
            inParams.ma60 = datas.map((v) => v.ma60 || 0);
            inParams.ma60.some((v, i) => {
                if (!v) return;
                inParams.b10 = inParams.ma10[i - 2];
                inParams.a10 = inParams.ma10[i];
                inParams.b60 = inParams.ma60[i - 2];
                inParams.a60 = inParams.ma60[i];
                if (!inParams.b10) return;
                if (inParams.b10 > inParams.b60 && inParams.a10 < inParams.a60) {
                    // 60在10上，下穿到10下
                    inParams.out = "-" + i;
                } else if (inParams.b60 > inParams.b10 && inParams.a60 < inParams.a10) {
                    // 60在10下，上穿到10上
                    inParams.out = "+" + i;
                }
                if (callback) {
                    return callback({ ...inParams, data: datas[i], i });
                }
            });
            return inParams.out || "null";
        };
        this.buyDate = (date, number = 0) => {
            let dd = new Date(date);
            dd.setDate(dd.getDate() + number);
            let day = dd.getDay();
            // 周末跳过
            switch (day) {
                case 6:
                    dd = new Date(date);
                    dd.setDate(dd.getDate() + number + 2);
                    break;
                case 0:
                    dd = new Date(date);
                    dd.setDate(dd.getDate() + number + 1);
                    break;
            }
            let y = dd.getFullYear() + "";
            let m = dd.getMonth() + 1 + "";
            let d = dd.getDate() + "";

            return y.padStart(4, 0) + "-" + m.padStart(2, 0) + "-" + d.padStart(2, 0);
        };

        /**
         * 日期获取
         * @param {number} days 距离当天的天数，昨天为1，明天为-1。默认值当天(0)
         * @param {string} symbol 连接符，2022-10-01
         * @param {date} current 从哪天开始算，例如：days：1，current：2022-10-01，即得到2022-09-31
         * @returns Date
         */
        this.someDay = (days = 0, symbol = "-", current) => {
            let today = new Date();
            let currentTime = current ? new Date(current).getTime() : today;
            let interval = 24 * 60 * 60 * 1000 * days;
            let after = new Date(currentTime - interval);
            let year = after.getFullYear();
            let month = after.getMonth() + 1 + "";
            let date = after.getDate() + "";
            return `${year}${symbol}${month.padStart(2, 0)}${symbol}${date.padStart(2, 0)}`;
        };

        /**
         * 将对象转换成url的query
         * @param {Object} query  { a: 1, b: '234', c: undefined }
         * @returns 'a=1&b=234&c=undefined&'
         */
        this.queryByStr = (query) => {
            return Object.keys(query).reduce((x, y) => {
                return x + `${y}=${query[y]}&`;
            }, "");
        };

        this.compareTime = (dataA, dataB, equal) => {
            let atime = new Date(dataA).getTime();
            let btime = new Date(dataB).getTime();
            return equal === "=" ? btime === atime : btime >= atime;
        };
        this.isSuccess = (datas, date, inDays = 22) => {
            let newDatas = datas.filter((v) => this.compareTime(date, v.d)).slice(0, inDays + 1);
            let find = newDatas[0];

            let preD = find,
                max = {
                    max_c: "",
                    max_d: "",
                    max_days: "",
                    max_zdfs: "",
                    max_success: 0,
                };

            if (find) {
                newDatas.slice(1, newDatas.length).some((v, i) => {
                    // 没有跌破模型的
                    if (v.c < find.o) {
                        return true;
                    }
                    const zdf = this.zdf([preD, v]);
                    max.max_zdfs += zdf + ",";
                    if (v.c >= max.max_c) {
                        max.max_c = v.c;
                        max.max_days = i;
                        max.max_d = v.d;
                        max.max_success += zdf;
                    }
                    preD = v;
                });
                // todo... max_success调整为 zdf([find, preD])
                max.max_success = max.max_success.toFixed(4) / 1;
            }
            return max;
        };

        this.saveModel = async (datas) => {
            const _this = this;
            return new Promise((rl, rj) => {
                let index = -1,
                    category = {};
                const newDatas = datas
                    .map((v) => {
                        v.coords.forEach((d) => (d.code = v.code));
                        return [...v.coords];
                    })
                    .flat(Infinity);
                newDatas.forEach((v) => {
                    if (category[v.name]) {
                        category[v.name].push(v);
                    } else {
                        category[v.name] = [v];
                    }
                });
                const arrs = Object.keys(category);
                let fn = async function () {
                    const keysName = arrs[++index];
                    if (keysName) {
                        const item = category[keysName];
                        const values = item.map((v) => {
                            if (_this.someDay(0) === v.end) {
                                v.today = "Y";
                            }
                            return `(${Object.values(v).map((v) => `'${v}'`)})`;
                        });
                        const keys = Object.keys(item[0]).map((v) => v);
                        const name = `${SQL.base}_${keysName}(${keys})`;
                        console.log(`>>> ${item[0].type}：开始存入模型表 - start ：${keysName} - ${item.length}`);
                        // if (item[0].type === "600026") {
                        //     debugger;
                        // }
                        await SQL.insertSQL({
                            connection: global.customConnection,
                            name,
                            values,
                        });
                        console.log(`>>> ${item[0].type}：存入模型表成功 - end ：${keysName}`);
                        fn();
                    } else {
                        rl();
                    }
                };
                fn();
            });
        };
        /**
         * 将当日筛选出的模型，存入表中
         * @param {array} datas
         * @returns Promise
         */
        this.saveVersionList = (datas) => {
            return new Promise(async (rl, rj) => {
                let index = -1;
                let date = datas[0].d;

                // await SQL.deleteSQL({
                //     connection: global.customConnection,
                //     name: `${SQL.base}_email`,
                //     conditions: `d = '${date}'`,
                // });
                console.log(`>>> 开始存入${SQL.base}_email表: ${date} ...`);
                let fn = async function () {
                    const item = datas[++index];
                    if (item) {
                        console.log(`> email表存入中：${item.name} - ${item.code} ...`);
                        const keys = Object.keys(item);
                        const values = Object.values(item);

                        await SQL.insertSQL({
                            connection: global.customConnection,
                            name: `${SQL.base}_email(${keys})`,
                            values: `(${values.map((v) => `'${v}'`)})`,
                        });
                        fn();
                    } else {
                        console.log(`》》 - 存入 -- ${SQL.base}_email表 -- 完成 - 《《`);
                        rl();
                    }
                };
                fn();
            });
        };
        /**
         * 接口调用
         * @param {*} url
         * @param {*} callback
         * @param {*} param2
         * @returns promise
         */
        this.getRequest = (url, callback, { method = "GET", others } = {}) => {
            return new Promise((rl, rj) => {
                request(
                    {
                        url,
                        method,
                        headers: {
                            "Content-Type": "text/json",
                            ...others,
                        },
                    },
                    async (error, response, body) => {
                        if (!error) {
                            if (callback) {
                                await callback(body);
                            }
                            rl(body);
                        } else {
                            rj(error);
                        }
                    }
                );
            });
        };
        /**
         * 邮件模板
         * @param {Object} data 数据
         * @param {*} type
         * @param {*} dwm
         * @returns promise
         */
        this.getMailHtml = (data, type, dwm) => {
            let divbox = ``;
            for (let k in data) {
                divbox += `<div style="display:flex"><span style="flex: 1">${k}：</span><span style="flex: 1">${data[k]}</span></div>`;
            }
            let html = `<div style="text-align: center;"><h4>sina ${type}： ${dwm} 成功!</h4><div style="width:200px;display:inline-block">${divbox}</div></div>`;
            return html;
        };
    }

    /**
     * 1. 定时任务发送链接，打开页面后手动选择参考的日期
     *  1.1 进入页面后，首先校验链接是否有效
     *  1.2 有效，可选择天数(100)/日期(2022-11-02)。一般是一个趋势的成型
     *  1.3 确定后，开启update
     * 2. 筛选模型时，只判断模型是否成型。趋势由另一个条件判断
     *  2.1 趋势：由指定选择的天数的起始位置，到模型生成的买点结束：
     *      2.1.1 总结出该阶段内的ma60的浪型，即：sz/xd/hp，且中间反复横跳的阶段合并
     *      2.1.2 该阶段的最低/最高，到买点的斜率
     *      2.1.3 新增字段：该模型的走势，和大盘的走势结果是否相同
     *    最终结合
     */
}

module.exports = new Methods();
