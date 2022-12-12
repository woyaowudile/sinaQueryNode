/** @format */

const _ = require("lodash");
const { MA } = require("../api/methods");
const SQL = require("../sql");
const {
    isSuccess,
    YingYang,
    entity,
    zdf,
    getMailHtml,
    someDay,
    getRequest,
    trend,
    buyDate,
    saveModel,
    lineLong,
    MAVLine,
    MALine,
} = require("./methods");
const { sendMail } = require("../utils/sendEmail");

let count = 0;

function exportResults(params) {
    const { results, datas, dwm, startDay, end, buy } = params;
    const { d, code } = startDay;
    let index = results.findIndex((v) => v.code === code);
    /* *************************************************************** */
    let maxRes = isSuccess(datas, end);
    let res = {
        type: code.slice(0, 3),
        ..._.omit(params, ["datas", "results", "startDay", "buy"]),
        start: d,
        today: "",
        ...maxRes,
    };
    // coords.push(res);
    // }
    /* *************************************************************** */
    if (index > -1) {
        results[index].coords.push(res);
    } else {
        results.push({
            code,
            buy,
            datas,
            dwm,
            coords: [res],
        });
    }
}

class AllsClass {
    constructor() {
        this.quertBefore = this.quertBefore.bind(this);
    }
    isKlyh({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let [d1, d2, d3] = datas.slice(start - 2, start + 1);
        if (!d1 || !d2 || !d3) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 2) return;
        if (!(d3.o < d2.c && d3.c > d2.c)) return;
        if (!(entity(d1) * 2 < entity(d2))) return;
        if (!(entity(d3) * 2 < entity(d2))) return;
        if (!(lineLong(d1) && lineLong(d2) && lineLong(d3))) return;
        // 以下的固定写法，一般只需改 buy、startDay、end即可
        const buy = buyDate(d3.d, 1);
        let trend1 = trend({ datas, start, name });
        if (!trend1.trend_status) return;
        if (trend1.trend_status !== 2) return;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: d1, end: d3.d });
    }

    isYjsd({ results, datas, start, dwm, name }) {
        /**
         * 1阳 ；2、3阴；4阳
         * 2、3不能跌破1的实体
         * 4要比前3个实体都高
         */
        if (dwm !== "d") return;
        const models = datas.slice(start - 3, start + 1);
        let [d0, d1, d2, d3] = models;
        if (YingYang(d0) !== 2) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 2) return;
        if (!(entity(d0) > entity(d3))) return;
        if (!(d1.c > d0.o && d2.c > d0.o && d3.o > d0.o)) return;
        // 加分
        if (!(d1.o > d0.c)) return;
        if (!(d2.o > d1.o)) return;
        if (!(d3.c > d2.o)) return;

        const buy = buyDate(d3.d, 1);
        let trend1 = trend({ datas, start, name });
        if (!trend1.trend_status) return;
        if (trend1.trend_status !== 1) return;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: d0, end: d3.d });
    }
    isQx1({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let [d1, d2, d3, d4, d5, d6, d7] = models;
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 1) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 2) return;
        if (YingYang(d6) !== 1) return;
        if (YingYang(d7) !== 2) return;
        // if (!slowDown(data, start)) return

        const buy = buyDate(d3.d, 1);
        let trend1 = trend({ datas, start, name });
        if (!trend1.trend_status) return;
        if (trend1.trend_status !== 2) return;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: d1, end: d3.d });
    }
    isQx2({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let [d1, d2, d3, d4, d5, d6, d7] = models;
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 1) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 1) return;
        if (YingYang(d6) !== 1) return;
        if (YingYang(d7) !== 2) return;

        // return [d1, d2, d3, d4, d5, d6, d7];
        let coords = ["isQx2", d1.d, d7.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: d7 });
    }
    isFkwz({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let [d1, d2, d3] = models;
        if (!d1) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 2) return;
        if (entity(d2) >= 0.02) return;
        if (!(d3.o > d2.c && d3.c > d2.o)) return;

        let coords = ["isFkwz", d2.d, d3.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d3 });
    }
    isYydl({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        // 因为d5后的某一天要是阳线，但不确定是哪一天
        let [d1, d2, d3, d4, d5] = models;
        if (!d1) return;
        if (YingYang(d1) !== 2) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 1) return;
        if (YingYang(d4) !== 1) return;
        if (YingYang(d5) !== 2) return;
        // 成交量依次降低
        if (d1.v < d2.v) return;
        if (d2.v < d3.v) return;
        if (d3.v < d4.v) return;
        // 最高价依次降低
        if (d1.h < d2.h) return;
        if (d2.h < d3.h) return;
        if (d3.h < d4.h) return;
        // 最低价依次降低
        if (d1.l < d2.l) return;
        if (d2.l < d3.l) return;
        if (d3.l < d4.l) return;

        let find = models.find((val, index) => {
            if (index >= 5) {
                return YingYang(val) === 2 && val.c > d5.c;
            }
        });
        if (!find) return;
        let coords = ["isYydl", d1.d, find.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: find });
    }
    isCsfr({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let [d1, d2] = models;
        if (!d1) return;
        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (!(d2.h > d1.h && d2.l > d1.l && d2.c > d1.o)) return;

        let coords = ["isCsfr", d1.d, d2.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: d2 });
    }
    isGsdn({ results, datas, start, dwm, name }) {
        // 1. 上升趋势中，
        // 2. 是阶段的顶点不可买，如果有缺口可以
        // 判断条件：慢速均线向上
        if (dwm !== "d") return;
        let [d1, d2, d3, d4, d5, d6] = models;
        if (!d1) return;
        if (YingYang(d3) !== 2) return;
        // 大于2%算是中阳线
        if (!(zdf([d2, d3]) > zdf([d1, d2]))) return;
        if (!(zdf([d2, d3]) > 2)) return;
        if (!(d4.c > d3.o && d5.c > d3.o && d6.c > d3.o)) return;
        if (!(d2.v < d3.v && d4.v < d3.v && d5.v < d3.v && d6.v < d3.v)) return;

        let coords = ["isGsdn", d3.d, d6.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d3, buyDate: d6 });
    }
    isDy({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        // 盈利： 17-20%
        let [d1, d2, d3, d4, d5, d6, d7] = models;
        if (!d1) return;

        if (YingYang(d1) !== 1) return;
        if (YingYang(d2) !== 2) return;
        if (YingYang(d3) !== 2) return;
        if (YingYang(d4) !== 2) return;
        if (YingYang(d5) !== 2) return;
        if (YingYang(d6) !== 1) return;
        if (YingYang(d7) !== 2) return;
        if (!(entity(d6) < 0.0236)) return;
        if (!(d7.c > d2.c && d7.c > d3.c && d7.c > d4.c && d7.c > d5.c && d7.c > d6.o)) return;

        let coords = ["isDy", d2.d, d7.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d7 });
    }
    isFhlz({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        // 盈利： 10%+
        let [d1, d2, d3, d4] = models;
        if (!d1) return;
        if (!(zdf([d1, d2]) > 9.7)) return;
        if (!(d1.v < d2.v && d3.v < d2.v)) return;
        if (!(d3.c < d2.c && d4.c > d2.c)) return;

        let coords = ["isFhlz", d2.d, d4.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isLzyy({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let [d1, d2, d3] = datas.slice(start - 2, start + 1);
        // if (d3.d === "2021-03-05" && d1.code === "000158") {
        if (d1.d === "2002-02-28" && d1.code === "000012") {
            debugger;

            // let trend1 = trend({ datas, start, name });
        }
        if (!d1) return;
        if (!(d1.zd > 9.7)) return;
        if (!(entity(d2) >= 0.03)) return;
        if (YingYang(d2) !== 1) return;
        if (YingYang(d3) !== 2) return;
        if (!(d3.c > d2.o)) return;

        const buy = buyDate(d3.d, 1);
        let trend1 = trend({ datas, start, name });
        if (!trend1.trend_status) return;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: d1, end: d3.d });
    }
    isCBZ({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let [d1, d2] = models;
        if (!d1) return;

        // 判断是否缺口
        let ho = d2.l > d1.h;
        if (!ho) return;
        let flag = models.slice(-5).every((level1) => {
            return level1.l >= d1.h;
        });
        if (!flag) return;
        let coords = ["isCBZ", d1.d, d2.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: d2 });
    }
    isFlzt({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let [d1, d2, d3, d4] = models;
        if (!d1) return;
        if (!(zdf([d1, d2]) > 9.7)) return;
        if (!(entity(d3) < 0.0179)) return;
        if (!(d3.l > d2.h && d3.v > d2.v)) return;
        if (YingYang(d4) !== 2) return;
        // if (!(d4.v/1 > d3.v/1)) return
        let max = Math.min(d3.c, d3.o);
        if (!(d4.c > max)) return;

        let coords = ["isFlzt", d2.d, d4.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isLahm({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        exportResults({ results, models, datas, dwm, coords, startDay: result, buyDate: val });
    }
    isSbg3({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let [d1, d2, d3, d4, d5] = datas.slice(start - 4, start + 1);
        if (!d1) return;
        let current = datas[start];
        if (!(YingYang(d1) === 2)) return;
        if (!(YingYang(d2) === 1)) return;
        if (!(YingYang(d3) === 1)) return;
        if (!(YingYang(d4) === 1)) return;
        if (!(YingYang(d5) === 2)) return;
        if (current.l < models[3].l) return;

        const buy = buyDate(d3.d, 1);
        let trend1 = trend({ datas, start, name });
        if (trend1.trend_status !== 1) return;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: d2, end: d3.d });
    }
    isSlbw0({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;

        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isSlbw1({ results, datas, start, dwm, name }) {
        // 20%
        if (dwm !== "d") return;
        const current = datas[start];
        const arrs = datas.slice(start, datas.length);

        // const flag = arrs.some((v, i)=> {
        //     if (v.c < current.o) return

        // })
        // if (!flag) return
        const {} = current;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: d1, end: d3.d });
    }
    isSlbw2({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        const current = datas[start];
        // if (current.d === "2008-02-05" && current.code === "002001") {
        // if (current.d === "2021-03-23" && current.code === "002174") {
        //     debugger;
        // }
        const arrs = datas.slice(start, datas.length);
        const out = {
            max: current,
        };
        arrs.some((v, i) => {
            if (i < 7) {
                out.max = Math.max(out.max.c, out.max.o) > Math.max(v.c, v.o) ? out.max : v;
                // 7天之内，不要回到current的实体之内
                // const min = Math.min(v.c, v.o)
                if (current.c > v.c) {
                    return true;
                }
            } else {
                // 突破 最大值
                if (Math.max(v.c, v.o) > Math.max(out.max.c, out.max.o)) {
                    out.index = i;
                    out.buy = v;
                    return true;
                }
            }
        });
        if (!out.buy) return;

        /* **********************5日均量下穿10日均量************************ */
        const mavs = MAVLine(datas.slice(start - 10, start + 20));
        const newMavs = mavs.filter((v) => v.d <= out.buy.d);

        const flag = newMavs.some((v, i) => {
            if (i < 1) return;
            const bv = newMavs[i - 1];
            const av = newMavs[i + 1];
            if (av && bv && bv.v5 > bv.v10 && av.v5 < av.v10) {
                return true;
            }
        });
        if (!flag) return;
        /* *************************************************************** */

        const buy = buyDate(out.buy.d, 1);

        let trend1 = trend({ datas, start, name });
        if (!trend1.trend_status) return;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: current, end: out.buy.d });
    }
    isSlbw3({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isSlbw4({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: find });
    }
    isSlqs({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        const [d1, d2, d3] = datas.slice(start - 2, start + 1);
        if (!d1) return;
        if (!(d2.v > d1.v)) return;
        if (!(d3.v < d2.v)) return;
        if (!(d2.zd > 9.7 && d3.zd > 9.7)) return;

        const buy = buyDate(d3.d, 1);
        let trend1 = trend({ datas, start, name });
        if (trend1.trend_status !== 1) return;
        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: d2, end: d3.d });
    }
    isXlzt({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let current = datas[start];
        if (!(YingYang(current) === 2)) return;
        let pre1 = datas[start - 1];
        let pre2 = datas[start - 2];
        if (!(YingYang(pre1) === 1)) return;
        if (!(current.c > pre1.o)) return;
        if (!(pre1.o > pre2.c)) return;
        debugger;
    }
    isPjtl({ results, datas, start, dwm, name }) {
        if (dwm !== "d") return;
        let current = datas[start];

        // let lists = datas.slice(start, datas.length)
        let index = datas.findIndex((v, i) => {
            if (i > start + 40) {
                return v.l < current.l;
            }
        });
        if (index > -1) {
            let lists = datas.slice(start + 1, index);
            let ok = lists.every((v) => v.l > current.l);
            if (!ok) return;
        }
        let end = datas[index];
        if (!end) return;

        let buy = datas[index + 1];
        if (!buy) return;
        let coords = ["isPjtl", current.d, end.d];
        exportResults({ results, models: [end], datas, dwm, coords, startDay: current, buyDate: buy });
    }
    isGsbf1({ results, datas, start, dwm, name }) {
        if (dwm !== "w") return;
        if (start < 61) return;
        // 10\60
        exportResults({ results, models, datas, dwm, coords, startDay: current, buyDate: current });
    }

    isGsbf2({ results, datas, start, dwm, MAParams }) {
        if (dwm !== "w") return;
        if (start < 90) return;
        let models = datas.slice(start - 30, start + 1);
        let current = datas[start];
        const { ma10, ma20, ma60, out } = MAParams;

        // 多头排列 （10\20在60之上）
        if (!(ma10[start] > ma60[start])) return;
        if (!(ma20[start] > ma60[start])) return;

        // 不能跌破60
        let flag = models.every((v) => {
            return Math.min(v.c, v.o) >= ma60[start];
        });
        if (!flag) return;

        // 金叉之后 死叉之前（如果现在还是死叉的话，就不符合）
        if (out && out.indexOf("-") > -1) return;

        // 上冲后的回落，且在60的附近
        let trend1 = trend({ datas, start });
        const { trend_status, trend_glod_line } = trend1;
        if (trend_status !== 2) return;
        // 回调到6.18及以下
        if (!(Math.max(current.c, current.o) < trend_glod_line[5])) return;
        // k线和60靠近
        const sub = Math.max(current.c, current.o) - (Math.max(current.c, current.o) - Math.min(current.c, current.o)) * 2;
        if (!(sub <= ma60[start])) return;
        if (!(current.zd > 2)) return;

        const buy = buyDate(current.d, 1);

        exportResults({ results, datas, dwm, name, ...trend1, buy, startDay: current, end: current.d });
    }
    isYylm({ results, datas, start, dwm, name }) {
        if (dwm !== "m") return;

        let coords = ["isYylm", d1.d, date.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: date });
    }
    quertBefore(query, connection, { isWirteExcel = false } = {}) {
        const _this = this;
        return new Promise(async (rl, rj) => {
            let {
                days,
                date,
                dwm = "d",
                size = 25,
                // page = 1,
                index = 0,
                start,
                end,
                count = -1,
                // codes = "600",
                // models = ["isSlbw2", "isKlyh", "isYjsd", "isSlqs", 'isLzyy'],
                models = ["isLzyy"],
                codes = "000",
                // models,
                mail = "query-before",
                isUpdateType = true,
            } = query;
            let resultsParams = {
                init: true,
                codes: [],
                downloads: [],
                waiting: false,
                status: "",
            };
            let stash = {
                useds: [],
                types: {},
            };

            // 1. 获取到所有的类型
            let usedres = await SQL.getTables({
                connection,
                name: "used",
                conditions: `dwm='${dwm}'`,
            });

            let usedTypes = [...new Set(usedres.map((v) => v.type))];
            // 2. 过滤出条件下的类型，例如：601、603...
            usedTypes = usedTypes.filter((v) => codes.indexOf(v) > -1);

            // usedTypes = usedTypes.filter(v => !resultsParams.codes.some(d => d[v]))

            let total = usedTypes.length;

            let fn = async () => {
                let item = usedTypes[++count];
                if (!item) {
                    // end
                    callback();
                } else {
                    // todo......测试用
                    if (true) {
                        stash.types[item] = ["000012"];
                    }
                    if (!stash.types[item]) {
                        let distinct = "distinct(code)";
                        const distinctCodes = await SQL.querySQL({
                            connection,
                            name: `${SQL.base}_${item}`,
                            distinct,
                        });
                        stash.types[item] = distinctCodes.data.map((v) => v.code).sort();
                    }
                    fn();
                }
            };

            //
            let callback = async () => {
                let arrs = Object.keys(stash.types);
                let lenth = arrs.length;
                getDatasFn(arrs, lenth);
            };

            let getDatasFn = async (arrs, lenth) => {
                let name = arrs[--lenth];
                let item = stash.types[name];
                if (!item) {
                    if (1 || isWirteExcel) {
                        // 生成execl
                    }
                    const html = getMailHtml(resultsParams.downloads, mail, dwm);
                    isUpdateType && sendMail(html);
                    console.log(">>>>>>>>>>>> - TEST - <<<<<<<<<<<");
                    rl(resultsParams.codes);
                    resultsParams.codes = [];
                    resultsParams.downloads = [];
                } else {
                    // 延伸60天，用作60均线的计算
                    const stretch = 1 || 60;
                    let conditions = `code in (${item}) and dwm='${dwm}' `;
                    if (start && end) {
                        conditions += ` and d >= '${start}' and d < '${end}'`;
                    } else {
                        // conditions += ` and d >= '${someDay(365 * (dwm !== "d" ? 10 : 8) + stretch)}'`;
                    }
                    const res = await SQL.getTables({
                        connection,
                        name,
                        conditions,
                    });
                    let datas = {};
                    res.forEach((v, i) => {
                        const { code } = v;
                        // 将需要转成数字的取出来
                        const newV = {
                            d: v.d,
                            code: v.code,
                            zd: v.zd,
                            // ...v,
                            c: v.c / 1,
                            o: v.o / 1,
                            h: v.h / 1,
                            l: v.l / 1,
                            v: v.v / 1,
                            ma10: v.ma10,
                            ma20: v.ma20,
                            ma60: v.ma60,
                        };
                        if (datas[code]) {
                            datas[code].push(newV);
                        } else {
                            datas[code] = [newV];
                        }
                    });

                    console.log(`>> 开始筛选模型 - start : ${name}`);
                    const results = Object.keys(datas)
                        .map((v, i) => {
                            let k = -1;
                            datas[v].sort((x, y) => {
                                // ++k;
                                // if (k >= stretch) {
                                //     y.ma10 = MA(datas[v], k, 10);
                                //     y.ma20 = MA(datas[v], k, 20);
                                //     y.ma60 = MA(datas[v], k, 60);
                                // }
                                return new Date(x.d).getTime() - new Date(y.d).getTime();
                            });
                            const res = _this.getModel({ item: datas[v], date, dwm, inModels: models });
                            return res[0];
                        })
                        .filter((v) => v);

                    console.log(`>> 模型筛选完成 - end : ${name}`);
                    resultsParams.downloads = [] || resultsParams.downloads.concat(results);
                    resultsParams.codes = resultsParams.codes.concat(datas);

                    await saveModel(results);
                    getDatasFn(arrs, lenth);
                }
            };
            // 先将表清空
            let url = "http://localhost:3334/api/clear";
            if (query.mail !== "init") {
                url += `?dwm=${dwm}`;
            }
            isUpdateType && (await getRequest(url));
            fn();
        });
    }
    getModel({ item: datas, date, dwm, inModels }) {
        let coords = [],
            results = [];
        let current = new Date(date).getTime();
        let models = [
            { name: "isKlyh", status: 2, dwm: "d" },
            { name: "isYjsd", status: 2, dwm: "d" },
            { name: "isQx1", status: 1, dwm: "d" },
            { name: "isQx2", status: 1, dwm: "d" },
            // { name: "isFkwz", status: 1, dwm: 'd' },
            { name: "isCsfr", status: 1, dwm: "d" },
            // { name: "isLahm", status: 2, dwm: 'd' },
            { name: "isSlbw0", status: 1, dwm: "d" },
            { name: "isSlbw1", zd: true, dwm: "d" },
            { name: "isSlbw2", zd: true, dwm: "d" },
            { name: "isSlbw3", zd: true, dwm: "d" },
            // { name: "isSlbw4", status: 2, dwm: 'd' },
            { name: "isDy", status: 2, dwm: "d" },
            // { name: "isPjtl", status: 3, dwm: 'd' },
            { name: "isYydl", status: 2, dwm: "d" },
            { name: "isGsdn", status: 3, dwm: "d" },
            { name: "isSlqs", zd: true, dwm: "d" },
            { name: "isFhlz", zd: true, dwm: "d" },
            { name: "isLzyy", zd: true, dwm: "d" },
            { name: "isFlzt", zd: true, dwm: "d" },
            { name: "isSbg3", status: 2, dwm: "d" },
            { name: "isGsbf1", status: 2, dwm: "w" },
            { name: "isGsbf2", status: 2, dwm: "w" },
            // { name: 'isG8M1', status: 1, dwm: 'd' },
            // { name: 'isYylm', status: 3, dwm: 'd' },
        ].filter((v) => (inModels ? inModels.includes(v.name) : true));
        models = models.filter((v) => v.dwm === dwm);

        MALine(datas, (MAParams) => {
            const { data, i } = MAParams;
            let { zd, d, code, c } = data;
            // if (d === "2021-03-23" && code === "002174") {
            //     debugger;
            // } else {
            //     return;
            // }
            let now = new Date(d).getTime();
            if (now < current) return;
            /********************************** */
            if (c < 0) return;
            if (zd > 13) return;
            /********************************** */
            let params = {
                dwm,
                datas,
                start: i,
                results,
                MAParams,
            };
            switch (YingYang(data)) {
                case 1:
                    models.forEach((v) => v.status === 1 && this[v.name]({ ...params, name: v.name }));
                    break;
                case 2:
                    if (zd > 9.5) {
                        models.forEach((v) => v.zd && this[v.name]({ ...params, name: v.name }));
                    } else {
                        models.forEach((v) => v.status === 2 && this[v.name]({ ...params, name: v.name }));
                    }
                    break;
                default:
                    models.forEach((v) => v.status === 3 && this[v.name]({ ...params, name: v.name }));
                    break;
            }
        });
        return results;
    }
}

module.exports = new AllsClass();
