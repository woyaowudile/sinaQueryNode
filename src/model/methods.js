/** @format */
const request = require("request");
const { getHolidays } = require("../api");

const { MA } = require("../api/methods");
const SQL = require("../sql");

class Methods {
    modelClassStashObj = {};
    constructor() {
        this.YingYang = (data) => {
            if (!data) return;
            // ying1， yang2，shizixing3
            let { o, c } = data;
            if (c < o) {
                return 1;
            } else if (c >= o) {
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
            // 使用 Math.max性能没这个好
            return o > c ? o : c;
        };
        this.min = (data) => {
            if (!data) return;
            let { o, c } = data;
            return o < c ? o : c;
        };
        this.xiong = (datas, isLx = false) => {
            let count = 0,
                arrs = [];
            // 是否有连续3+阴线
            let someFlag = datas.some((v, i) => {
                let isYY = this.YingYang(v);
                if (isYY === 1) {
                    count++;
                    arrs.push(v);
                } else {
                    isLx && (count = 0);
                    arrs = [];
                }
                return count >= 3;
            });
            if (!someFlag) return;
            // 是否跳空
            let flag = arrs.some((v, i) => {
                if (i === 0) return;
                let pre = arrs[i - 1];
                return v.o < pre.c;
            });
            // 是否有大阴线
            flag = arrs.some((v) => this.entity(v) > 0.02);

            return flag;
        };
        this.upVolume = (datas) => {
            let [pre, current] = datas;
            if (!pre) return true;
            return current.v / 1 > pre.v / 1;
        };
        this.downVolume = (datas) => {
            let [pre, current] = datas;
            if (!pre) return true;
            return current.v / 1 < pre.v / 1;
        };
        this.entity = (data) => {
            // 实体 = (收-开)/开
            if (!data) return;
            // 大实体：, 中实体：>0.0179-0.0310 ， 小实体：0.005
            return (this.abs(data) / data.o).toFixed(4) / 1;
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
            let top = h - this.max(data);
            let bottom = this.min(data) - l;
            let body = this.abs(data);
            return top * 2 < body && bottom * 2 < body;
        };
        this.trend = ({ datas, start, stretch = 60 }) => {
            const _this = this;
            const index = start - stretch + 1;
            const arrs = datas.slice(index, start + 1);
            let current = datas[start];
            if (!arrs.length) {
                return {};
            }
            let fn = function (lists = [], isContainK = 5) {
                let findObj = {},
                    tans = new Array(lists.length);

                [...lists].reverse().some((v, i) => {
                    let reIndex = lists.length - 1 - i;
                    let max = _this.max(v);
                    let maxd = v.d;
                    let min = v.c < v.o ? v.c : v.o;
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
                    // v的c在current上为正，下为负
                    // tans.unshift(Math.tan((v.c - current.c) / lists.length).toFixed(2));
                    tans[reIndex] = Math.tan((v.c - current.c) / lists.length).toFixed(2);
                });
                let maxTan = Math.max(...tans.map((v) => Math.abs(v)));
                let times = new Array((Math.floor(maxTan / 0.01) + "").length - 1).fill(0).reduce((x, y) => x + y, "1");
                if (times >= 10) {
                    tans = tans.map((v) => (v / times).toFixed(2));
                }
                findObj.status = findObj.mini > findObj.maxi ? 2 : 1;

                // const goldSplitLine = [0, 23.6, 38.2, 50, 61.8, 80.9, 100, 138.2, 161.8, 200, 238.2].map((v) => {
                //     let sub = Math.abs(findObj.max - findObj.min),
                //         number = 0;
                //     if (findObj.status === 1) {
                //         number = (sub / 100) * v + findObj.min / 1;
                //     } else {
                //         number = findObj.max - (sub / 100) * v;
                //     }

                //     return number.toFixed(2);
                // });
                // let chatOption = chart(tans, goldSplitLine, lists);
                // console.log(JSON.stringify(chatOption));

                return { findObj, tans };
            };
            let chart = function (tans, goldSplitLine, lists) {
                return {
                    tooltip: {
                        trigger: "axis",
                    },
                    legend: {
                        data: lists[0].code,
                    },
                    xAxis: {
                        type: "category",
                        data: lists.map((v, i) => v.d),
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
                            name: lists[0].code,
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
                    // -0.00 和 0.00，todo: 可能-0.01和0.01比较吗？
                    let flag = jh[number] && Math.abs(jh[number].price) === Math.abs(v);
                    if (flag) {
                        jh[number].count++;
                        jh[number].end++;
                    } else {
                        jh[++number] = { count: 1, price: v, start: i, end: i };
                    }
                });

                // 如果没有，count为undefined
                let count;
                Object.keys(jh).forEach((v, i) => {
                    let current = jh[v];
                    if (i === 0) {
                        // 当splitIndex = 0, jh只有一条，这时候判断 给不给count赋值
                        jh[i + 1] && (count = 0);
                    } else {
                        let pre = jh[v - 1];
                        // 有的从0.01直接到0.03, 所以count应该加|减 2次。 0.03 - 0.02 !== 0.01,所以先除后减
                        let addNumber = Math.abs(current.price / 0.01 - pre.price / 0.01);
                        //    例如：0.04 - 0.05 < 0 表示下跌，否则上涨（如果是相减为0，就不加|减）
                        current.price - pre.price < 0 ? (count -= addNumber) : current.price - pre.price !== 0 && (count += addNumber);
                    }
                });
                return count.toFixed();
            };

            let { findObj, tans } = fn(arrs, false);
            // let status = tanTrend(tans);

            let splitIndex = -1;
            if (findObj.status === 1) {
                // 上涨(1), 下跌(2)
                splitIndex = findObj.maxi > 50 ? findObj.mini : findObj.maxi;
            } else {
                splitIndex = findObj.mini <= 10 ? findObj.maxi : findObj.mini;
            }
            let before = tans.slice(0, splitIndex + 1);
            let after = tans.slice(splitIndex, tans.length);
            let beforeStatus = tanTrend(before);
            let afterStatus = tanTrend(after);

            // 黄金分割，根据near来判断，near为top(1)则从最后一个bottom -> top
            const goldSplitLine = [0, 23.6, 38.2, 50, 61.8, 80.9, 100, 138.2, 161.8, 200, 238.2].map((v) => {
                let sub = Math.abs(findObj.max - findObj.min),
                    number = 0;
                if (findObj.maxi > findObj.mini) {
                    number = (sub / 100) * v + findObj.min / 1;
                } else {
                    number = findObj.max - (sub / 100) * v;
                }

                return number.toFixed(2);
            });
            return {
                trend_find_obj: JSON.stringify(findObj),
                trend_glod_line: goldSplitLine,
                // 如果转换成数字的话，后面判断还要排除 0 ，所以这里直接用 '0'
                trend_status: [beforeStatus, afterStatus, +beforeStatus + +afterStatus + ""],
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
            const _this = this;
            const inParams = { ma10: [], ma20: [], ma60: [] };

            datas.forEach((v, i) => {
                inParams.ma10[i] = v.ma10 || 0;
                inParams.ma20[i] = v.ma20 || 0;
                inParams.ma60[i] = v.ma60 || 0;
            });
            inParams.ma60.some((v, i) => {
                if (!v) return;
                inParams.b10 = inParams.ma10[i - 2];
                inParams.a10 = inParams.ma10[i];
                inParams.b60 = inParams.ma60[i - 2];
                inParams.a60 = inParams.ma60[i];
                if (!inParams.b10) return;
                if (inParams.b10 > inParams.b60 && inParams.a10 < inParams.a60) {
                    // 60在10上，下穿到10下
                    inParams.out = "-" + _this.someDay(0, "", datas[i].d);
                } else if (inParams.b60 > inParams.b10 && inParams.a60 < inParams.a10) {
                    // 60在10下，上穿到10上
                    inParams.out = "+" + _this.someDay(0, "", datas[i].d);
                }
                if (callback) {
                    return callback({ ...inParams, data: datas[i], i });
                }
            });
            return inParams.out || "null";
        };
        this.buyDate = (inDate, number = 0) => {
            // 为了节省时间，计算买点的时候就不调接口查询是否为节假日。仅判断当年的节假日
            const _this = this;
            const { lists } = _this.modelClassStashObj.holidays;
            // lists是当月的节假日
            let date;
            lists.some((v, i) => {
                const days = -(number + i);
                date = _this.someDay(days, "-", inDate);
                const newDay = new Date(date).getDay();
                let flag = ![0, 6].some((d) => d === newDay);
                if (flag) {
                    flag = !lists.some((d) => _this.someDay(0, "-", d.date) === date / 1);
                }
                return flag;
            });
            return date;
        };
        this.getIsHoliday = (date) => {
            const _this = this;
            return new Promise(async (rl, rj) => {
                const { lists, year, month, day, week, current } = (_this.modelClassStashObj.holidays = await getHolidays(date));
                const result = { isWorkDay: true, d: 0, w: 0, m: 0 };
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
                    let days = new Date(_this.someDay(result[dwm], "-", `${year}-${month}-${day}`)).getDay();
                    if (days === 0) {
                        result[dwm] += 2;
                    } else if (days === 6) {
                        result[dwm] += 1;
                    }
                };
                ["w", "m"].forEach((v) => fn(v));

                rl(result);
            });
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
        /**
         * 在指定时间内(22)，收益多少
         * @param {array} datas 每日数据集合
         * @param {date} start 模型开始日期
         * @param {date} end 模型结束日期
         * @param {number} inDays 多少日内的收益，默认22
         * @param {boolean} isLowSL 是否用最低价做为止损
         * @returns max对象
         */
        this.isSuccess = ({ datas, start, end, inDays = 22, isLowSL = false }) => {
            let startIndex = datas.findIndex((v) => v.d === start);
            let endIndex = datas.findIndex((v) => v.d === end);
            let models = datas.slice(startIndex, endIndex + 1);
            // let models = datas.filter((v) => v.d >= start && v.d <= end);
            let sl = Math.min(...models.map((v) => (isLowSL ? v.l : this.min(v))));
            let newDatas = datas.slice(endIndex, endIndex + inDays + 1);
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
                    if (v.c / 1 < sl / 1) {
                        return true;
                    }
                    const zdf = this.zdf([find, v]);
                    max.max_zdfs += zdf + ",";
                    if (v.c / 1 >= max.max_c / 1) {
                        max.max_c = v.c;
                        max.max_days = i;
                        max.max_d = v.d;
                        max.max_success = zdf;
                    }
                    preD = v;
                });
            }
            return max;
        };

        this.saveModel = async (datas) => {
            const _this = this;
            return new Promise((rl, rj) => {
                let index = -1,
                    category = {};
                let newDatas = datas
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
                let arrs = Object.keys(category);
                let todays = [];
                let fn = async function () {
                    const keysName = arrs[++index];
                    if (keysName) {
                        let splitFn = async function (splitObj) {
                            let page = splitObj.page * splitObj.size;
                            let size = ++splitObj.page * splitObj.size;
                            let total = Math.ceil(category[keysName].length);
                            let pages = Math.ceil(total / splitObj.size);
                            const item = category[keysName].slice(page, size);
                            if (item.length) {
                                const values = item.map((v) => {
                                    if (v.today) {
                                        todays[todays.length] = {
                                            name: v.name,
                                            code: v.code,
                                            d: v.buy,
                                            dwm: v.dwm,
                                        };
                                    }
                                    return `(${Object.values(v).map((v) => `'${v}'`)})`;
                                });
                                const keys = Object.keys(item[0]).map((v) => v);
                                const name = `${SQL.base}_${keysName}(${keys})`;
                                if (splitObj.page === 1) {
                                    // 此时的splitObj.page已经是1了
                                    console.log(`>>> ${item[0].type}：开始存入模型表 - start ：${keysName}`);
                                }
                                console.log(`>>> ${size}/${total}`);

                                await SQL.insertSQL({
                                    connection: global.customConnection,
                                    name,
                                    values,
                                });
                                size >= total && console.log(`>>> ${item[0].type}：存入模型表成功 - end ：${keysName}`);

                                splitFn(splitObj);
                            } else {
                                fn();
                            }
                        };
                        splitFn({ page: 0, size: 500 });
                    } else {
                        console.log(">>> - 没有了");
                        await _this.saveVersionList(todays);
                        category = null;
                        newDatas = null;
                        arrs = null;
                        todays = null;
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
        this.saveVersionList = (datas = []) => {
            return new Promise(async (rl, rj) => {
                if (!datas.length) {
                    console.log(`>> - 没有需要存入email表中的数据`);
                    rl();
                    return;
                }
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
                    if (!index) {
                        console.log(`> email表存入中：${item.name} - ${item.code} ...`);
                        const keys = Object.keys(item);
                        // const values = Object.values(item);
                        const values = datas.map((v) => `(${Object.values(v).map((d) => `'${d}'`)})`);

                        await SQL.insertSQL({
                            connection: global.customConnection,
                            name: `${SQL.base}_email(${keys})`,
                            values: `${values}`,
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
    buyDate;

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
