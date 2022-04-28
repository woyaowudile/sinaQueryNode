/** @format */

const { MA } = require("../api/methods");
const SQL = require("../sql");
const $methods = require("./methods");
const request = require("request");
const sendEmail = require("../utils/sendEmail");

let count = 0;

function exportResults({ results, models, datas, dwm, coords, startDay, buyDate }) {
    // console.log(`${coords[0]} --- ${++count} -${startDay.code}- ${startDay.d}`);
    let index = results.findIndex((v) => v.code === startDay.code);
    if (!coords.length) return;
    /* *************************************************************** */
    // if (buyDate.d === "2022-02-21" && buyDate.code === "600596") {
    //     debugger;
    // }
    let resIndex = datas.findIndex((v) => v.d === buyDate.d);
    let res10 = datas.slice(resIndex + 1, resIndex + 10);
    let modelsIndex = models.findIndex((v) => v.d === buyDate.d);
    let min = Math.min(...models.slice(0, modelsIndex).map((v) => Math.min(v.c, v.o)));
    // let isFail = res10.some((v) => Math.min(v.c, v.o) < min) && "失败";
    // if (isFail) {
    //     coords.push(isFail);
    // } else {
    const list = res10.map((v, i) => {
        const num = $methods.zdf([buyDate, v]);
        return Math.min(v.c, v.o) < min ? "-100%" : num.toFixed(2) + "%";
    });
    coords.push(`${list}`);
    // }
    /* *************************************************************** */
    if (index > -1) {
        results[index].coords.push(coords);
    } else {
        results.push({
            code: startDay.code,
            buy: buyDate.d,
            datas,
            dwm,
            coords: [coords],
        });
    }
}

class AllsClass {
    constructor() {}
    isKlyh({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 3);
        let [d0, d1, d2] = models;
        if (!d0) return;
        // if (d0.code === "002582" && d0.d === "2021-07-07") {
        //     debugger;
        // }
        let flag = $methods.xd({ datas, start });
        if (!flag) return;
        if ($methods.YingYang(d0) !== 1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 2) return;
        if (!($methods.abs(d0) * 2 < $methods.abs(d1))) return;
        // 阳线不能太大
        // if (!($methods.abs(d1) > $methods.abs(d2))) return;
        if (!(d0.o > d1.o)) return;
        // 加分条件 阴线跳开
        if (!(d0.c > d1.o)) return;
        if (!(d2.o < d1.c && d2.c > d1.c)) return;
        let coords = ["isKlyh", d0.d, d2.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d0, buyDate: d2 });
    }

    isYjsd({ results, datas, start, dwm }) {
        /**
         * 1阳 ；2、3阴；4阳
         * 2、3不能跌破1的实体
         * 4要比前3个实体都高
         */
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 4);
        let [d0, d1, d2, d3] = models;
        if ($methods.YingYang(d0) !== 2) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 2) return;
        if (!($methods.entity(d0) > $methods.entity(d3))) return;
        if (!(d1.c > d0.o && d2.c > d0.o && d3.o > d0.o)) return;
        // 加分
        if (!(d1.o > d0.c)) return;
        if (!(d2.o > d1.o)) return;
        if (!(d3.c > d2.o)) return;

        let coords = ["isYjsd", d0.d, d3.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d0, buyDate: d3 });
    }
    isQx1({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let models = $methods.getModelLengthData(datas, start, 7);
        let [d1, d2, d3, d4, d5, d6, d7] = models;
        if (!d1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 2) return;
        if ($methods.YingYang(d5) !== 2) return;
        if ($methods.YingYang(d6) !== 1) return;
        if ($methods.YingYang(d7) !== 2) return;
        // if (!slowDown(data, start)) return
        if (!$methods.xd({ datas, start })) return;

        let coords = ["isQx1", d1.d, d7.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: d7 });
    }
    isQx2({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let models = $methods.getModelLengthData(datas, start, 7);
        let [d1, d2, d3, d4, d5, d6, d7] = models;
        if (!d1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 2) return;
        if ($methods.YingYang(d5) !== 1) return;
        if ($methods.YingYang(d6) !== 1) return;
        if ($methods.YingYang(d7) !== 2) return;
        if (!$methods.xd({ datas, start })) return;
        // return [d1, d2, d3, d4, d5, d6, d7];
        let coords = ["isQx2", d1.d, d7.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: d7 });
    }
    isFkwz({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 3);
        let [d1, d2, d3] = models;
        if (!d1) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 2) return;
        if ($methods.entity(d2) >= 0.02) return;
        if (!(d3.o > d2.c && d3.c > d2.o)) return;
        let coords = ["isFkwz", d2.d, d3.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d3 });
    }
    isYydl({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 因为d5后的某一天要是阳线，但不确定是哪一天
        let models = $methods.getModelLengthData(datas, start, 10);
        let [d1, d2, d3, d4, d5] = models;
        if (!d1) return;
        if ($methods.YingYang(d1) !== 2) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 1) return;
        if ($methods.YingYang(d5) !== 2) return;
        if (d1.v < d2.v) return;
        if (d2.v < d3.v) return;
        if (d3.v < d4.v) return;
        let find = models.find((val, index) => {
            if (index >= 5) {
                return $methods.YingYang(val) === 2 && val.c > d5.c;
            }
        });
        if (!find) return;
        let coords = ["isYydl", d1.d, find.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: find });
    }
    isCsfr({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 2);
        let [d1, d2] = models;
        if (!d1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 2) return;
        if (!(d2.h > d1.h && d2.l > d1.l && d2.c > d1.o)) return;
        let coords = ["isCsfr", d1.d, d2.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: d2 });
    }
    isGsdn({ results, datas, start, dwm }) {
        // 1. 上升趋势中，
        // 2. 是阶段的顶点不可买，如果有缺口可以
        // 判断条件：慢速均线向上
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 6);
        let [d1, d2, d3, d4, d5, d6] = models;
        if (!d1) return;
        if ($methods.YingYang(d3) !== 2) return;
        // 大于2%算是中阳线
        if (!($methods.zdf([d2, d3]) > $methods.zdf([d1, d2]))) return;
        if (!($methods.zdf([d2, d3]) > 2)) return;
        if (!(d4.c > d3.o && d5.c > d3.o && d6.c > d3.o)) return;
        if (!(d2.v < d3.v && d4.v < d3.v && d5.v < d3.v && d6.v < d3.v)) return;
        let coords = ["isGsdn", d3.d, d6.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d3, buyDate: d6 });
    }
    isDy({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 盈利： 17-20%
        let models = $methods.getModelLengthData(datas, start, 7);
        let [d1, d2, d3, d4, d5, d6, d7] = models;
        if (!d1) return;

        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 2) return;
        if ($methods.YingYang(d3) !== 2) return;
        if ($methods.YingYang(d4) !== 2) return;
        if ($methods.YingYang(d5) !== 2) return;
        if ($methods.YingYang(d6) !== 1) return;
        if ($methods.YingYang(d7) !== 2) return;
        if (!($methods.entity(d6) < 0.0236)) return;
        if (!(d7.c > d2.c && d7.c > d3.c && d7.c > d4.c && d7.c > d5.c && d7.c > d6.o)) return;
        // const isHp = $methods.hp({ datas, start, d7 });
        // if (!isHp) return;
        // let min = Math.min(models[0].l, models[1].l, models[2].l, models[3].l);
        // if (!(isHp.min < min)) return;
        let coords = ["isDy", d2.d, d7.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d7 });
    }
    isFhlz({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 盈利： 10%+
        let models = $methods.getModelLengthData(datas, start - 1, 4);
        let [d1, d2, d3, d4] = models;
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if (!(d1.v < d2.v && d3.v < d2.v)) return;
        if (!(d3.c < d2.c && d4.c > d2.c)) return;
        let coords = ["isFhlz", d2.d, d4.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isLzyy({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start - 1, 4);
        let [d1, d2, d3, d4] = models;
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 2) return;
        if (!(d4.c > d3.o)) return;
        if (!($methods.entity(d3) >= 0.03 || $methods.zdf([d2, d3]) > 9.7)) return;
        let coords = ["isLzyy", d2.d, d4.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isCBZ({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 7);
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
    isFlzt({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start - 1, 4);
        let [d1, d2, d3, d4] = models;
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if (!($methods.entity(d3) < 0.0179)) return;
        if (!(d3.l > d2.h && d3.v > d2.v)) return;
        if ($methods.YingYang(d4) !== 2) return;
        // if (!(d4.v/1 > d3.v/1)) return
        let max = Math.min(d3.c, d3.o);
        if (!(d4.c > max)) return;
        let coords = ["isFlzt", d2.d, d4.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isLahm({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start - 4, 5);
        let [d1] = models;
        if (!d1) return;
        let [val] = models.slice(-1);
        let [result] = $methods.xiong(models);
        if (!result) return;
        if (!(val.c > result.o)) return;
        let coords = ["isLahm", result.d, val.d];
        exportResults({ results, models, datas, dwm, coords, startDay: result, buyDate: val });
    }
    isSbg3({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        if (!(start > 100)) return;
        let models = datas.slice(start - 3, start + 1);
        if (!models[0]) return;
        let current = datas[start];
        if (!($methods.YingYang(models[0]) === 1)) return;
        if (!($methods.YingYang(models[1]) === 1)) return;
        if (!($methods.YingYang(models[2]) === 1)) return;
        if (!($methods.YingYang(models[3]) === 2)) return;
        if (current.l < models[3].l) return;
        const isHp = $methods.hp({ datas, start, current });
        if (!isHp) return;
        let min = Math.min(models[0].l, models[1].l, models[2].l, models[3].l);
        if (!(isHp.min < min)) return;
        let coords = ["isSbg3", models[0].d, current.d];
        exportResults({ results, models, datas, dwm, coords, startDay: models[0], buyDate: current });
    }
    isSlbw0({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 4);
        let [d1, d2, d3, d4] = models;
        if (!d1) return;
        // 小实体
        if (!($methods.entity(d2) < 0.0179 && $methods.entity(d2) <= $methods.entity(d3))) return;
        if (!(d3.l < d2.l)) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 2) return;
        // 第三天yang的c > 第二天ying的o(的0.0115倍，防止差别过小) && ying的l < yang的l
        if (!(d4.c > d3.c * 1.0115 && d3.l < d4.l)) return;
        // 小实体之前要出现 xiong
        // if (d2.d === '2016-09-30') {
        //     debugger
        // }
        let before = $methods.getModelLengthData(datas, start - 9, 10);
        let flag = before.every((level1) => level1.l > d3.l);
        let [result] = $methods.xiong(before);
        if (!(result && flag)) return;
        // 止损, 小于第三天ying的l
        if ($methods.zs(models, start + 4, 10, d3.l)) return;
        let coords = ["isSlbw0", result.d, d4.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isSlbw1({ results, datas, start, dwm }) {
        // todo: 在顶点600233 2022-03-10
        // 20%
        if (dwm !== "d") return;
        if (!(start > 100)) return;
        let models = datas.slice(start, datas.length - 1);
        let [d1] = models;
        if (!d1) return;
        // 突破箱体
        let current = datas[start];
        const index = models.findIndex((v, i) => {
            if (i < 5) return;
            let max = Math.max(v.c, v.o);
            return current.c < max;
        });
        const newArrs = models.slice(0, index + 1);
        // 突破前需要回到箱体之内后
        let flag = !newArrs.some((v) => current.c > v.h);
        if (!flag) {
            // 跌破箱体, k线的收盘价不能跌破开盘价
            flag = newArrs.some((v, i) => {
                return current.o > v.c;
            });
        }
        if (flag) return;
        // 是否横盘
        const isHp = $methods.hp({ datas, start, current });
        if (!isHp) return;
        // 是否下跌
        const isXd = $methods.xd({ datas, start: isHp.index });
        if (!isXd) return;
        // 买点
        const buy = models[index];
        if (!buy) return;
        // 放量
        if (!(buy.v > current.v)) return;
        let coords = ["isSlbw1", current.d, buy.d];
        exportResults({ results, models, datas, dwm, coords, startDay: current, buyDate: buy });
    }
    isSlbw2({ results, datas, start, dwm }) {
        if (dwmType !== "day") return;

        results.push([code, current.d, buyDate(buy.d, 1), "神龙摆尾2"]);
        console.log(`${code}神龙摆尾2`, current.d, buyDate(buy.d, 1), `累计第 ${++count} 个`);
    }
    isSlbw3({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start - 1, 4);
        let [d1, d2, d3, d4] = models;
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if ($methods.YingYang(d3) !== 2) return;
        if ($methods.YingYang(d4) !== 2) return;
        if (!(d3.v > d2.v)) return;
        let zfz = $methods.zf([d2, d3]);
        if (!(zfz > 4.5)) return;
        if (!($methods.entity(d3) > $methods.entity(d4) && $methods.entity(d4) < 0.0179)) return;
        if (!(d4.v < d3.v)) return;
        let coords = ["isSlbw3", d2.d, d4.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isSlbw4({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start, 12);
        let [d1, d2] = models;
        if (!d1) return;
        if ($methods.YingYang(d2) !== 2) return;
        if (!(d2.h > d1.h && d2.v / 1 > d1.v / 1)) return;
        let zfz = $methods.zf([d1, d2]);
        if (!(zfz > 4) && zfz < 6) return;
        let find = datas.slice(-10).find((level1) => {
            if ($methods.YingYang(level1) !== 2) return;
            return level1.h > d2.h && level1.v / 1 > d2.v / 1;
        });
        if (!find) return;
        let coords = ["isSlbw4", d2.d, find.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: find });
    }
    isSlqs({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let models = $methods.getModelLengthData(datas, start - 1, 3);
        let [d1, d2, d3] = models;
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if (!(d1.v < d2.v)) return;
        if (!($methods.zdf([d2, d3]) > 9.7)) return;
        if (!(d3.v < d2.v)) return;

        let coords = ["isSlqs", d2.d, d3.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d2, buyDate: d3 });
    }
    isPjtl({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let current = datas[start];
        if (current.d === "2018-07-06" && current.code === "603699") {
            debugger;
        }
        let isXd = $methods.xd({ datas, start: start - 1 });
        if (!isXd) return;
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
    isG8M1({ results, datas, start, dwm }) {
        if (dwm !== "w") return;
        if (start < 60) return;
        // 10\60
        let { status, ma60 } = $methods.JC(datas, start) || {};
        if (status !== 3) return;
        // 4. 当天的阳线要上穿慢速均线
        let current = datas[start - 1];
        if ($methods.YingYang(current) !== 2) return;
        if (!(current.c > ma60)) return;
        let coords = ["isG8M1", current.d];
        exportResults({ results, models, datas, dwm, coords, startDay: current, buyDate: current });
    }
    isYylm({ results, datas, start, dwm }) {
        if (dwm !== "m") return;

        let coords = ["isYylm", d1.d, date.d];
        exportResults({ results, models, datas, dwm, coords, startDay: d1, buyDate: date });
    }
    quertBefore(query, connection, { isWirteExcel = false } = {}) {
        return new Promise(async (rl, rj) => {
            const _this = this;
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
                // codes = "002",
                // models = ["isPjtl"],
                codes = "600,601,603,000,002",
                models,
                mail = "query-before",
            } = query;
            let resultsParams = {
                init: true,
                codes: [],
                downloads: {},
                waiting: false,
                status: "",
            };
            let stash = {
                useds: [],
                types: {},
            };
            // let d = $methods.someDay(days, "-");

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
                        // console.log(`-----预处理成功，生成Excel中(${dwm})`);
                        // await $methods.datasToExcel(resultsParams.codes, dwm);
                        // console.log(`-----生成download-Excel中(${dwm})`);
                        // await $methods.downloadExcel(resultsParams.downloads, dwm, mail);
                    }
                    const html = $methods.getMailHtml(resultsParams.downloads, mail, dwm);
                    sendEmail(html);
                    console.log(">>>>>>>>>>>> - TEST - <<<<<<<<<<<");
                    rl(resultsParams.codes);
                    resultsParams.codes = [];
                    resultsParams.downloads = {};
                } else {
                    // 延伸60天，用作60均线的计算
                    const stretch = 60;
                    let conditions = `code in (${item}) and dwm='${dwm}' and `;
                    if (start && end) {
                        conditions += `d >= '${start}' and d < '${end}'`;
                    } else {
                        conditions += `d >= '${$methods.someDay(365 * (dwm !== "d" ? 10 : 8) + stretch)}'`;
                    }
                    const res = await SQL.getTables({
                        connection,
                        name,
                        conditions,
                    });
                    let datas = {};
                    res.forEach((v, i) => {
                        if (i < stretch) return;

                        let ma10 = MA(res, i, 10);
                        let ma20 = MA(res, i, 20);
                        let ma60 = MA(res, i, 60);
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
                            ma10,
                            ma20,
                            ma60,
                        };
                        if (datas[code]) {
                            datas[code].push(newV);
                        } else {
                            datas[code] = [newV];
                        }
                    });
                    const results = Object.keys(datas)
                        .map((v) => {
                            const data = datas[v].sort((x, y) => new Date(x.d).getTime() - new Date(y.d).getTime());
                            const res = _this.getModel({ item: data, date, dwm });
                            return res[0];
                        })
                        .filter((v) => v);
                    await $methods.downloadExcel(results, dwm, resultsParams.downloads);
                    // resultsParams.downloads = resultsParams.downloads.concat(results);
                    // resultsParams.codes = resultsParams.codes.concat(datas);
                    getDatasFn(arrs, lenth);
                }
            };
            // 先将表清空
            request(
                {
                    url: "http://localhost:3334/api/clear",
                    method: "GET",
                    headers: {
                        "Content-Type": "text/json",
                    },
                },
                (error, response, body) => {
                    if (!error) {
                        fn();
                    }
                }
            );
            // fn();
        });
    }
    getModel({ item: datas, date, dwm }) {
        let coords = [],
            results = [];
        let current = new Date(date).getTime();

        datas.forEach((level1, index1) => {
            let { zd, d } = level1;

            let now = new Date(d).getTime();
            if (now < current) return;

            let params = {
                dwm,
                datas,
                start: index1,
                results,
            };

            // this.isG8M1(params);
            // this.isYylm(params);
            switch ($methods.YingYang(level1)) {
                case 1:
                    this.isKlyh(params); // ok
                    this.isQx1(params); // ok
                    this.isQx2(params); // ok
                    // this.isFkwz(params); // 大阴线不够大
                    this.isCsfr(params); // ok
                    // // this.isLahm(params); // 大阴线不够大
                    // // this.isSlbw0(params); // x
                    // // name && name(params);
                    this.isDy(params);
                    break;
                case 2:
                    // this.isPjtl(params);
                    this.isYjsd(params); // ok
                    this.isYydl(params); // ok
                    this.isGsdn(params); // ok
                    this.isFhlz(params); // ok
                    this.isLzyy(params); // ok
                    this.isFlzt(params); // ok
                    this.isSbg3(params); // ok
                    if (zd <= 9.5) {
                        // } else if (4 < zd && zd < 6) {
                        //     this.isSlbw4(params);
                    } else {
                        this.isSlbw1(params); // ok
                        //     // this.isSlbw2(params); // x
                        this.isSlbw3(params); // ok
                    }
                    break;
                case 3:
                    break;
                default:
                    break;
            }
            // this.qs(datas, [''])
        });
        // let results = {
        //     coords,
        //     data: datas,
        //     dwm,
        //     type
        // }
        return results;
    }
}

module.exports = new AllsClass();
