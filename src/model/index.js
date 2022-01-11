/** @format */

const SQL = require("../sql");
const $methods = require("./methods");

let count = 0;

function exportResults({ results, datas, dwm, coords, startDay, buyDate }) {
    console.log(`${coords[0]} --- ${++count} -${startDay.code}- ${startDay.d}`);
    let index = results.findIndex((v) => v.code === startDay.code);
    if (!coords.length) return;
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
        let [d0, d1, d2] = $methods.getModelLengthData(datas, start, 3);
        if ($methods.YingYang(d0) !== 1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 2) return;
        if (!($methods.entity(d0) < $methods.entity(d1) * 2)) return;
        if (!(d0.c > d1.c)) return;
        if (!(d2.o < d1.c && d2.c > d1.c)) return;
        let coords = ["isKlyh", d0.d, d2.d];
        exportResults({ results, datas, dwm, coords, startDay: d0, buyDate: d2 });
    }

    isYjsd({ results, datas, start, dwm }) {
        /**
         * 1阳 ；2、3阴；4阳
         * 2、3不能跌破1的实体
         * 4要比前3个实体都高
         */
        if (dwm !== "d") return;
        let [d0, d1, d2, d3] = $methods.getModelLengthData(datas, start, 4);
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
        exportResults({ results, datas, dwm, coords, startDay: d0, buyDate: d3 });
    }
    isQx1({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let res = $methods.getModelLengthData(datas, start, 7);
        let [d1, d2, d3, d4, d5, d6, d7] = res;
        if (!d1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 2) return;
        if ($methods.YingYang(d5) !== 2) return;
        if ($methods.YingYang(d6) !== 1) return;
        if ($methods.YingYang(d7) !== 2) return;
        // if (!slowDown(data, start)) return

        let coords = ["isQx1", d1.d, d7.d];
        exportResults({ results, datas, dwm, coords, startDay: d1, buyDate: d7 });
    }
    isQx2({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 七星中是否可以存在 十字星(即开盘价 === 收盘价)
        let [d1, d2, d3, d4, d5, d6, d7] = $methods.getModelLengthData(datas, start, 7);
        if (!d1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 2) return;
        if ($methods.YingYang(d5) !== 1) return;
        if ($methods.YingYang(d6) !== 1) return;
        if ($methods.YingYang(d7) !== 2) return;
        // return [d1, d2, d3, d4, d5, d6, d7];
        let coords = ["isQx2", d1.d, d7.d];
        exportResults({ results, datas, dwm, coords, startDay: d1, buyDate: d7 });
    }
    isFkwz({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let [d1, d2, d3] = $methods.getModelLengthData(datas, start, 3);
        if (!d1) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 2) return;
        if ($methods.entity(d2) >= 0.02) return;
        if (!(d3.o > d2.c && d3.c > d2.o)) return;
        let coords = ["isFkwz", d2.d, d3.d];
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d3 });
    }
    isYydl({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 因为d5后的某一天要是阳线，但不确定是哪一天
        let res = $methods.getModelLengthData(datas, start, 10);
        let [d1, d2, d3, d4, d5] = res;
        if (!d1) return;
        if ($methods.YingYang(d1) !== 2) return;
        if ($methods.YingYang(d2) !== 1) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 1) return;
        if ($methods.YingYang(d5) !== 2) return;
        if (d1.v < d2.v) return;
        if (d2.v < d3.v) return;
        if (d3.v < d4.v) return;
        let find = res.find((val, index) => {
            if (index >= 5) {
                return $methods.YingYang(val) === 2 && val.c > d5.c;
            }
        });
        if (!find) return;
        let coords = ["isYydl", d1.d, find.d];
        exportResults({ results, datas, dwm, coords, startDay: d1, buyDate: find });
    }
    isCsfr({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let [d1, d2] = $methods.getModelLengthData(datas, start, 2);
        if (!d1) return;
        if ($methods.YingYang(d1) !== 1) return;
        if ($methods.YingYang(d2) !== 2) return;
        if (!(d2.h > d1.h && d2.l > d1.l && d2.c > d1.o)) return;
        let coords = ["isCsfr", d1.d, d2.d];
        exportResults({ results, datas, dwm, coords, startDay: d1, buyDate: d2 });
    }
    isGsdn({ results, datas, start, dwm }) {
        // 1. 上升趋势中，
        // 2. 是阶段的顶点不可买，如果有缺口可以
        // 判断条件：慢速均线向上
        if (dwm !== "d") return;
        let [d1, d2, d3, d4, d5, d6] = $methods.getModelLengthData(datas, start, 6);
        if (!d1) return;
        if ($methods.YingYang(d3) !== 2) return;
        // 大于2%算是中阳线
        if (!($methods.zdf([d2, d3]) > $methods.zdf([d1, d2]))) return;
        if (!($methods.zdf([d2, d3]) > 2)) return;
        if (!(d4.c > d3.o && d5.c > d3.o && d6.c > d3.o)) return;
        if (!(d2.v < d3.v && d4.v < d3.v && d5.v < d3.v && d6.v < d3.v)) return;
        let coords = ["isGsdn", d3.d, d6.d];
        exportResults({ results, datas, dwm, coords, startDay: d3, buyDate: d6 });
    }
    isDy({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 盈利： 17-20%
        let [d1, d2, d3, d4, d5, d6, d7] = $methods.getModelLengthData(datas, start, 7);
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
        let coords = ["isDy", d2.d, d7.d];
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d7 });
    }
    isFhlz({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        // 盈利： 10%+
        let [d1, d2, d3, d4] = $methods.getModelLengthData(datas, start - 1, 4);
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if (!(d1.v < d2.v && d3.v < d2.v)) return;
        if (!(d3.c < d2.c && d4.c > d2.c)) return;
        let coords = ["isFhlz", d2.d, d4.d];
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isLzyy({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let [d1, d2, d3, d4] = $methods.getModelLengthData(datas, start - 1, 4);
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if ($methods.YingYang(d3) !== 1) return;
        if ($methods.YingYang(d4) !== 2) return;
        if (!(d4.c > d3.o)) return;
        if (!($methods.entity(d3) >= 0.03 || $methods.zdf([d2, d3]) > 9.7)) return;
        let coords = ["isLzyy", d2.d, d4.d];
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isCBZ({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let res = $methods.getModelLengthData(datas, start, 7);
        let [d1, d2] = res;
        if (!d1) return;

        // 判断是否缺口
        let ho = d2.l > d1.h;
        if (!ho) return;
        let flag = res.slice(-5).every((level1) => {
            return level1.l >= d1.h;
        });
        if (!flag) return;
        let coords = ["isCBZ", d1.d, d2.d];
        exportResults({ results, datas, dwm, coords, startDay: d1, buyDate: d2 });
    }
    isFlzt({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let res = $methods.getModelLengthData(datas, start - 1, 4);
        let [d1, d2, d3, d4] = res;
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if (!($methods.entity(d3) < 0.0179)) return;
        if (!(d3.l > d2.h && d3.v > d2.v)) return;
        if ($methods.YingYang(d4) !== 2) return;
        // if (!(d4.v/1 > d3.v/1)) return
        let max = Math.min(d3.c, d3.o);
        if (!(d4.c > max)) return;
        let coords = ["isFlzt", d2.d, d4.d];
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isLahm({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let res = $methods.getModelLengthData(datas, start - 4, 5);
        let [d1] = res;
        if (!d1) return;
        let [val] = res.slice(-1);
        let [result] = $methods.xiong(res);
        if (!result) return;
        if (!(val.c > result.o)) return;
        let coords = ["isLahm", result.d, val.d];
        exportResults({ results, datas, dwm, coords, startDay: result, buyDate: val });
    }
    isSlbw0({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let res = $methods.getModelLengthData(datas, start, 4);
        let [d1, d2, d3, d4] = res;
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
        if ($methods.zs(res, start + 4, 10, d3.l)) return;
        let coords = ["isSlbw0", result.d, d4.d];
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isSlbw1({ results, datas, start, dwm }) {
        // 20%
        if (dwm !== "d") return;

        let res = $methods.getModelLengthData(datas, start - 49, 51);
        let [d1] = res;
        if (!d1) return;
        let current = datas[start];
        // 下跌后横盘
        let flag = $methods.hp(res, start, 60, (arr, ds) => {
            return ds.every((level1, index1) => {
                if (index1 > 0 && level1.d !== current.d) {
                    return $methods.zdf([ds[index1 - 1], ds[index1]]) < 9.7;
                }
                return true;
            });
        });
        if (!flag) return;
        //
        let afters = $methods.getModelLengthData(datas, start + 1, 22);
        // 不跌破涨停板开盘价
        let stop_loss = afters.every((level1) => {
            let { c, o } = level1;
            let min = Math.min(c, o);
            return min >= current.o;
        });
        if (!stop_loss) return;
        // 5日后某天回到箱体内
        let index = afters.every((level1, index1) => {
            let { c, o } = level1;
            let max = Math.max(c, o);
            if (index1 <= 7) {
                return current.c > max;
            }
            return true;
        });
        if (!index) return;
        // 之后某日突破涨停板的收盘价, 且放量
        let buy = afters.find((level1, index1) => {
            if ($methods.YingYang(level1) !== 2) return;
            let pre = afters[index1 - 1];
            return level1.c > current.c && pre.v / 1 < level1.v / 1;
        });
        if (!buy) return;

        let coords = ["isSlbw1", current.d, buy.d];
        exportResults({ results, datas, dwm, coords, startDay: current, buyDate: buy });
    }
    isSlbw2({ results, datas, start, dwm }) {
        if (dwmType !== "day") return;
        let qsData = qs(data, start, 48, 12);
        if (!qsData) return;

        let current = data[start];

        if (current.d === "2015-09-28") {
            debugger;
        }
        let num = 1,
            max = 0,
            buy;
        let callback = function () {
            let after = data[start + num];
            if (!after) return;
            let min = Math.min(after.c, after.o);
            let flag = false;
            if (min > current.c && num < 20) {
                if (num > 5) {
                    flag = max < Math.max(after.o, after.c);
                }
                if (!flag) {
                    num++;
                    max = Math.max(after.o, after.c, max);
                    callback();
                } else {
                    buy = after;
                }
            }
        };
        callback();
        if (!buy) return;

        results.push([code, current.d, buyDate(buy.d, 1), "神龙摆尾2"]);
        console.log(`${code}神龙摆尾2`, current.d, buyDate(buy.d, 1), `累计第 ${++count} 个`);
    }
    isSlbw3({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let res = $methods.getModelLengthData(datas, start - 1, 4);
        let [d1, d2, d3, d4] = res;
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
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d4 });
    }
    isSlbw4({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let res = $methods.getModelLengthData(datas, start, 12);
        let [d1, d2] = res;
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
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: find });
    }
    isSlqs({ results, datas, start, dwm }) {
        if (dwm !== "d") return;
        let res = $methods.getModelLengthData(datas, start - 1, 3);
        let [d1, d2, d3] = res;
        if (!d1) return;
        if (!($methods.zdf([d1, d2]) > 9.7)) return;
        if (!(d1.v < d2.v)) return;
        if (!($methods.zdf([d2, d3]) > 9.7)) return;
        if (!(d3.v < d2.v)) return;

        let coords = ["isSlqs", d2.d, d3.d];
        exportResults({ results, datas, dwm, coords, startDay: d2, buyDate: d3 });
    }
    isG8M1({ results, datas, start, dwm }) {
        if (dwm !== "w") return;
        // 10\60
        let qs = $methods.JC(60, 10);
        if (qs !== 3) return;
        // 4. 当天的阳线要上穿慢速均线
        let current = datas[start - 1];
        if ($methods.YingYang(current) !== 2) return;
        if (!(current.c > ma60)) return;
        let coords = ["isG8M1", current.d];
        exportResults({ results, datas, dwm, coords, startDay: current, buyDate: current });
    }
    isYylm({ results, datas, start, dwm }) {
        if (dwmType !== "month") return;
        // 下跌要2年左右
        let res = $methods.getModelLengthData(data, start, 24);
        let [d1] = res;
        if (!d1) return;
        let bMax = Math.max(d1.c, d1.o),
            aMax = Math.max(d1.c, d1.o);
        let bMin = Math.min(d1.c, d1.o),
            aMin = Math.min(d1.c, d1.o);
        res.forEach((level1, index1) => {
            let { c, o } = level1;
            let max = Math.max(c, o);
            let min = Math.min(c, o);
            aMax = Math.max(aMax, max);
            aMin = Math.min(aMin, min);
            if (index1 <= 12) {
                // 下跌的最低价，用于和后面横盘最低价比较。确保横盘的价在这个价格的下面
                bMin = Math.min(bMin, min);
            }
        });
        if (!(bMax >= aMax)) return;
        // 最大值和最小值要相差2倍以上
        if (!(bMax > aMin * 2)) return;

        // 筑底横盘,(从高点下跌到确认筑底结束，给个大概3年多的时间)
        let time = 0;
        let flag = new Array(60 - 40).fill(1).some((level1, index1) => {
            time = 24 + index1;
            let hpDatas = $methods.getModelLengthData(datas, start + 12, time, true);
            let everys = hpDatas.every((level2) => {
                return bMin * 1.3 > Math.min(level2.c, level2.o);
            });
            let isHp = $methods.hp(hpDatas, hpDatas.length, hpDatas.length, (arr) => {
                if (!arr[arr.length - 1]) {
                    return;
                }
                return arr[arr.length - 1].count >= 12;
            });
            return everys && isHp;
        });
        if (!flag) return;
        let [cy] = d1.d.split("-");
        let ok = results.every((level1) => {
            let [a1, a2, a3, a4] = level1;
            if (a1 === code && a4 === "鱼跃龙门") {
                let [year] = a2.split("-");
                return year / 1 + 2 < cy / 1;
            } else {
                return true;
            }
        });
        if (!ok) return;
        // 不好判断日期，就写当天
        let date = new Date().toLocaleDateString();
        let coords = ["isYylm", d1.d, date.d];
        exportResults({ results, datas, dwm, coords, startDay: d1, buyDate: date });
    }
    async quertBefore(query, connection) {
        let {
            days,
            date,
            dwm = "d",
            size = 25,
            // page = 1,
            index = 0,
            count = -1,
            // codes = "603",
            codes = "600,601,603,000,002",
            models,
            mail = "query-before",
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
        fn();

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
                console.log("-----预处理成功，生成Excel中");
                $methods.datasToExcel(resultsParams.codes, dwm);
                console.log("-----生成download-Excel中");
                $methods.downloadExcel(resultsParams.downloads, dwm, mail);
                resultsParams.codes = [];
            } else {
                let conditions = `code in (${item}) and dwm='${dwm}' and d >= '${$methods.someDay(365)}'`;
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
                    };
                    if (datas[code]) {
                        datas[code].push(newV);
                    } else {
                        datas[code] = [newV];
                    }
                });
                const results = Object.keys(datas)
                    .map((v) => {
                        const data = datas[v];
                        const res = this.getModel({ item: data, date, dwm });
                        return res[0];
                    })
                    .filter((v) => v);
                resultsParams.downloads = resultsParams.downloads.concat(results);
                resultsParams.codes = resultsParams.codes.concat(datas);
                getDatasFn(arrs, lenth);
            }
        };
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

            switch ($methods.YingYang(level1)) {
                case 1:
                    this.isKlyh(params); // ok
                    this.isQx1(params); // ok
                    this.isQx2(params); // ok
                    // this.isFkwz(params); // 大阴线不够大
                    this.isCsfr(params); // ok
                    // this.isLahm(params); // 大阴线不够大
                    // this.isSlbw0(params); // x
                    // name && name(params);
                    break;
                case 2:
                    this.isYjsd(params); // ok
                    this.isYydl(params); // ok
                    this.isGsdn(params); // ok
                    this.isDy(params);
                    this.isFhlz(params); // ok
                    this.isLzyy(params); // ok
                    this.isFlzt(params); // ok
                    // this.isG8M1(params);
                    if (zd <= 9.5) {
                    } else if (4 < zd && zd < 6) {
                        this.isSlbw4(params);
                    } else {
                        this.isSlbw1(params);
                        // this.isSlbw2(params); // x
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
