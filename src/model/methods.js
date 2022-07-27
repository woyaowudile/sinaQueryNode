/** @format */
const fs = require("fs");
const request = require("request");
const nodeExcel = require("node-xlsx");
const { MA } = require("../api/methods");
const { sendMail } = require("../utils/sendEmail");
const { modelsCode } = require("../utils/code");
const SQL = require("../sql");

class Methods {
    constructor() {}
    YingYang(data) {
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
    }
    getModelLengthData(data, start = 0, leng = 1, flag) {
        // 如果数量不满足模型，则退出
        let maxLength = start + leng > data.length ? data.length - 1 : start + leng;
        let results = data.slice(start, maxLength);
        return !flag ? (results.length === leng ? results : []) : results;
    }
    abs(data) {
        if (!data) return;
        let { o, c } = data;
        return Math.abs(c - o);
    }
    entity(data) {
        // 实体: (收-开)/开
        if (!data) return;
        let { o, c } = data;
        let max = Math.max(o, c);
        // 大实体：, 中实体：>0.0179-0.0310 ， 小实体：
        return (Math.abs(c - o) / max).toFixed(4) / 1;
    }
    shadowLineTooLong(data, number = 0.25) {
        let { l, h, c, o } = data;
        let max = Math.max(c, o);
        let shadow = h - max;
        let entity = Math.abs(c - o);
        // 影线占实体的1/4
        return shadow / entity > number;
    }
    zf(data) {
        let current = data[data.length - 1];
        let pre = data[data.length - 2];
        let result = ((current.h - current.l) / pre.c) * 100;
        return result.toFixed(2);
    }
    zdf(data) {
        // 大于 2% 中阴阳线
        // 大于 > 5 % 大阴阳线
        // todo ... 处理一字涨停板
        let [pre, current] = data;
        let result = ((current.c - pre.c) / pre.c) * 100;
        return result.toFixed(2) / 1;
    }
    zs(data, start, date, compare) {
        let datas = this.getModelLengthData(data, start, date);
        return datas.some((level1) => {
            let { c, o, l } = level1;
            return l <= compare;
        });
    }
    JC(data, start, arrs = [10, 60]) {
        let list = arrs.map((v) => {
            let before = data[start - 2][`ma${v}`];
            let cur = data[start - 1][`ma${v}`];
            let after = data[start][`ma${v}`];
            return [before, cur, after];
        });

        // 金
        if (list[0][0] < list[1][0] && list[0][2] > list[1][2]) {
            return {
                status: 3,
            };
        } else {
            return {};
        }
    }
    /**
     * 均线多头排列
     * @param {array} datas [{c,o,h,l...}]
     * @param {number} start 哪一天
     * @param {array} nlist [10,20,60...] 均线
     * @returns Boolean
     */
    arrange(datas, start, nlist) {
        let list = {};
        nlist.forEach((v) => {
            list[v] = datas.map((d, i) => {
                return MA(datas, start + i, v);
            });
        });
        return nlist.every((v) => {
            let fIndex = nlist
                .map((d) => {
                    if (d === v) return 1;
                    return list[v].every((item, index) => (list[v] < list[d] ? item <= list[d][index] : item >= list[d][index]));
                })
                .findIndex((v) => !v);
            return fIndex === -1;
        });
    }
    reserveFn(datas, start, num) {
        const index = start - num > 0 ? start - num : 0;
        const arrs = datas.slice(index, start) || [];
        return arrs.reverse();
    }
    splitBlock(datas, names = "", dwm = "d") {
        let index = 0,
            arrs = [],
            currentTime = "";
        // 1. 将数据分成一周一个集合
        datas.forEach((v, i) => {
            const date = new Date(v.d);
            let day = "";
            let time = 1 * 24 * 60 * 60 * 1000;
            switch (dwm) {
                case "d":
                    time = 1 * 24 * 60 * 60 * 1000;
                    day = date.getTime();
                    break;
                case "w":
                    time = 0;
                    day = date.getMonth() + 1;
                    break;
                case "m":
                    time = 0;
                    day = date.getFullYear();
                    break;
            }
            if (currentTime && currentTime + time !== day) {
                // 如果不是相连的日期，表示
                index++;
            }
            // 处理结果
            currentTime = day;
            let arr = arrs[index];
            if (arr) {
                arr.list.push(v);
                arr.end = i;
                arr.endDate = v.d;
                arr.max = Math.max(arr.max, v.c, v.o);
                arr.min = Math.min(arr.min, v.c, v.o);
                arr.maxPosition = arr.list.findIndex((d) => arr.max === Math.max(d.c, d.o));
                arr.minPosition = arr.list.findIndex((d) => arr.min === Math.min(d.c, d.o));
            } else {
                arrs[index] = {
                    max: Math.max(v.c, v.o), // 还是用v.h更好
                    min: Math.min(v.c, v.o), // 还是用v.l更好
                    maxPosition: 0,
                    minPosition: 0,
                    list: [v],
                    start: i,
                    startDate: v.d,
                    end: i,
                    endDate: v.d,
                };
            }
        });
        // 2. 计算每个集合的上涨、下跌、横盘的幅度
        const [a0, ...others] = arrs;
        others.forEach((v, i) => {
            let pre = others[i - 1];
            if (i === 0) {
                pre = a0;
            }
            v.preO = pre.list[pre.list.length - 1].o / 1;
            v.zdf = this.zdf([pre.list[pre.list.length - 1], v.list[v.list.length - 1]]);

            const { maxPosition, minPosition, zdf } = v;
            if (maxPosition > minPosition) {
                v.status = 1;
            } else if (maxPosition < minPosition) {
                v.status = 3;
            } else {
                v.status = 2;
            }
            if (v.status !== 2) {
                Math.abs(zdf) < 2 && (v.status = 2);
            }
            // v.status = zdf > 2 ? 1 : (zdf < -2 ? 3 : 2)
        });
        // 3. 将相连的集合，状态相同的整合成一个
        const newArr = [];
        others.forEach((v, i) => {
            const arr = newArr.slice(-1)[0];
            if (arr && arr.status === v.status) {
                arr.list = arr.list.concat(v.list);
                arr.end = arr.end + v.list.length;
                arr.endDate = arr.list.slice(-1)[0].d;
                arr.max = Math.max(...arr.list.map((v) => Math.max(v.c, v.o)));
                arr.min = Math.min(...arr.list.map((v) => Math.min(v.c, v.o)));
                arr.maxPosition = arr.list.findIndex((v) => Math.max(v.c, v.o) === arr.max);
                arr.minPosition = arr.list.findIndex((v) => Math.min(v.c, v.o) === arr.min);
                // 因为 这个条件里是合并,所以pre应该是上上一个
                arr.zdf = this.zdf([(newArr[newArr.length - 2] || a0).list.slice(-1)[0], v.list.slice(-1)[0]]);
            } else {
                newArr.push(v);
            }
        });
        let result = this.qsStatus(newArr, names);
        result.ok = result.outNames === names;
        return result;
    }
    /**
     *
     * @param {arrays} datas
     * @param {string} name 'xd-hp'
     */
    qsStatus(datas, names) {
        let divideLine = datas.findIndex((v) => v.max === Math.max(...datas.map((d) => d.max)));
        if (divideLine === -1) return;
        let beforeDatas = datas.slice(0, divideLine);
        let afterDatas = datas.slice(divideLine, datas.length);
        let fn = function (useDatas, offset = 0) {
            let obj = {
                    xd: [],
                    hp: [],
                    sz: [],
                    zdf: [],
                    point: [],
                },
                pre = "",
                point = 0;
            useDatas.forEach((v, i) => {
                point = v.max;
                if (!pre) {
                    pre = v;
                } else {
                    let index = useDatas.slice(0, i).findIndex((d) => {
                        let current = v.list.slice(-1)[0];
                        let zdf = Math.abs((d.preO - current.c) / d.preO) * 100;
                        return zdf < 2;
                    });
                    if (index > -1) {
                        //  index - i 是横盘
                        obj.point[index - 1] = v.max;
                        obj.hp.push({
                            start: index + offset,
                            end: i + offset,
                            status: "hp",
                        });
                    } else {
                        // 中间这一段是v型底\横盘还是圆弧底等
                        let zdf = obj.zdf.reduce((x, y) => x + y, 0);
                        if (zdf < 0) {
                            point = v.min;
                            obj.xd.push({
                                start: offset,
                                end: i + offset,
                                status: "xd",
                            });
                        } else {
                            obj.sz.push({
                                start: offset,
                                end: i + offset,
                                status: "sz",
                            });
                        }
                    }
                }
                obj.point.push(point);
                obj.zdf.push(v.zdf);
            });
            return obj;
        };
        let objBefore = fn(beforeDatas);
        let objAfter = fn(afterDatas, divideLine);

        // 3.1 例如：hp: [{1,2}, {1,4}] 合并成 [{1,4}]
        let concatQs = function (list) {
            let qs = {
                pre: {},
                list: [],
            };
            list.forEach((v, i) => {
                let index = qs.list.length;
                if (qs.pre.start <= v.start && v.start <= qs.pre.end) {
                    qs.pre = { start: qs.pre.start, end: v.end, status: v.status };
                    --index;
                } else {
                    qs.pre = v;
                }
                qs.list[index] = qs.pre;
            });
            return qs.list;
        };

        let newObj = {
            xd: concatQs([].concat(objBefore.xd, objAfter.xd)),
            sz: concatQs([].concat(objBefore.sz, objAfter.sz)),
            hp: concatQs([].concat(objBefore.hp, objAfter.hp)),
        };
        /* **************************打补丁专用位置************************* */
        /* **************************打补丁专用位置************************* */

        // 判断是否和传入的条件一致，例： 'xd-hp'下跌后的横盘
        let lists1 = [].concat(newObj.sz.slice(-1), newObj.hp.slice(-1), newObj.xd.slice(-1)).sort((x, y) => x.end - y.end);
        let result = {
            inNames: names,
            qs: lists1.map((v) => v.status),
        };
        let arrs1 = names.split("-");
        result.outNames = arrs1
            .map((v, i) => {
                if (!v) return;
                let types = lists1.slice(`-${arrs1.length}`).map((d) => d.status);
                if (v === types[i]) {
                    return `${v}`;
                }
            })
            .join("-");

        // 判断整体趋势
        let zdf = ((datas.slice(-1)[0].list.slice(-1)[0].c - datas[0].preO) / datas[0].preO) * 100;
        if (zdf < 2) {
            // 下跌
            result.status = "xd";
            // 是否N
        } else if (zdf > 2) {
            // 上涨
            result.status = "zs";
            // 是否N
        } else {
            // 横盘
            result.status = "hp";
            // v型、弧形、波浪
        }
        return result;
    }
    hp({ datas, start, current }) {
        const max = current.c;
        // let newCurrent = current
        // let precent = current.zd > 9.5
        // if (!precent) {
        //     let exMin = Math.min(newCurrent.c, newCurrent.o)
        //     let exMax = Math.max(newCurrent.c, newCurrent.o)

        // }
        let number = 0;
        const lists70 = this.reserveFn(datas, start, 90);
        const index = lists70.findIndex((v, i) => {
            if (i < 22) {
                // 22根k线有多少根是在当前k线的上下浮动的。比如，000540的2021-08-02
                let min1 = Math.min(v.c, v.o);
                min1 < current.c && number++;
                return;
            }
            if (max < v.l) {
                // 10天以上都在该模型的max值的上面，用以确定是下跌后的横盘
                const lists10 = lists70.slice(i, i + 10);
                return lists10.every((d) => max < d.l);
            }
        });

        if (!(index > -1 && number > 15)) return;
        const list = lists70.slice(0, index);
        return {
            data: lists70[index],
            index: start - index,
            // 横盘的最低价
            min: Math.min(...list.map((v) => v.l)),
            max: Math.max(...list.map((v) => v.h)),
        };
    }
    xd({ datas, start, days = 30 }) {
        if (!datas[start]) return;
        const current = datas[start];
        const lists = this.reserveFn(datas, start, days);
        if (lists < days) return;
        const flag = lists.every((v, i) => {
            let min = Math.min(v.o, v.c);
            return current.l < min;
        });
        return flag;
    }
    xiong(data) {
        let arr = [];
        let max = {};
        data.forEach((level1, index1) => {
            // 连续3根阴线
            let [d1, d2, d3] = [level1, data[index1 + 1], data[index1 + 2]];
            if (!(d1 && d2 && d3)) return;
            if (this.YingYang(d1) !== 1) return;
            if (this.YingYang(d2) !== 1) return;
            if (this.YingYang(d3) !== 1) return;
            // 最佳条件, 依次最大，且最大是最小的3倍以上
            if (!(this.entity(d3) > this.entity(d2) > (this.entity(d2) > this.entity(d1)))) return;
            if (!(this.entity(d3) > this.entity(d1) * 3)) return;
            if (!(d3.o < d2.c || d2.o < d1.c)) return;
            arr = [d3];
        });
        return arr;
    }
    buyDate(date, number) {
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
    }

    someDay(days = 0, symbol = "-", current) {
        let today = new Date();
        let currentTime = current ? new Date(current).getTime() : today;
        let interval = 24 * 60 * 60 * 1000 * days;
        let after = new Date(currentTime - interval);
        let year = after.getFullYear();
        let month = after.getMonth() + 1 + "";
        let date = after.getDate() + "";
        return `${year}${symbol}${month.padStart(2, 0)}${symbol}${date.padStart(2, 0)}`;
    }
    compareTime(dataA, dataB, equal) {
        let atime = new Date(dataA).getTime();
        let btime = new Date(dataB).getTime();
        return equal === "=" ? btime === atime : btime > atime;
    }
    write({ keys, lists, dwm }) {
        return new Promise((rl, rj) => {
            try {
                const type = keys[0].slice(0, 3);
                const buffer = nodeExcel.build(lists);
                fs.writeFile(`stash_${type}_${dwm}.xlsx`, buffer, (err) => {
                    if (err) throw err;
                    console.log(`》》 -创建${type}excel完成- 《《`);
                    rl();
                });
            } catch (error) {
                console.log("error", error);
            }
        });
    }
    datasToExcel(codes, dwm) {
        const _this = this;
        return new Promise((rl, rj) => {
            if (!codes.length) {
                console.log("没有要存入excel的数据");
                return;
            }
            let lists = [],
                i = 0;
            let fn = function () {
                let arrs = codes[i];
                if (arrs) {
                    let keys = Object.keys(arrs);
                    let values = Object.values(arrs);
                    keys.forEach((d) => {
                        let datas = arrs[d];
                        lists.push({
                            name: d,
                            data: [Object.keys(datas[0]), ...datas.map((d) => Object.values(d))],
                        });
                    });
                    _this.write({ dwm, lists, keys }).then(() => {
                        lists = [];
                        ++i;
                        fn();
                    });
                } else {
                    rl();
                }
            };
            fn();
        });
    }
    downloadExcel(datas, dwm, counts = {}) {
        return new Promise(async (rl, rj) => {
            let lists = [],
                saveDatas = {},
                newDatas = {},
                html = "";
            datas.forEach((v) => {
                const coords = v.coords;
                coords.forEach((d) => {
                    const [name] = d;
                    // 每个模型对应的 比较时间不同
                    const days = modelsCode[name];
                    const flag = this.compareTime(this.someDay(days), d[2]);
                    const data = [v.code, d[1], d[2], dwm];
                    if (flag) {
                        counts[name] = (counts[name] || 0) + 1;
                        // 表示当天的，和发的邮件保持一致
                        data.push("Y");
                        // 判断是否成功
                    } else {
                        // 补全数组长度
                        data.push("");
                    }

                    data.push(d[3] + ";");
                    if (newDatas[name]) {
                        saveDatas[name].push(data);
                        newDatas[name].push([v.code, d[1], d[2], d[3]]);
                    } else {
                        saveDatas[name] = [data];
                        newDatas[name] = [[v.code, d[1], d[2], d[3]]];
                    }
                });
            });
            Object.keys(newDatas).forEach((v) => {
                // const datas = newDatas[v];
                const arrs = newDatas[v].sort((x, y) => new Date(y[1]).getTime() - new Date(x[1]).getTime());
                lists.push({
                    name: v,
                    data: [["模型", "起始位置", "结束位置", "结果"], ...arrs],
                });
            });
            try {
                const excelName = `download_${dwm}.xlsx`;
                if (lists.length) {
                    // const buffer = nodeExcel.build(lists);
                    // fs.writeFile(excelName, buffer, async (err) => {
                    //     if (err) throw err;
                    //     html = this.getMailHtml(counts, mail, dwm);
                    //     sendMail(html);
                    //     console.log("》》 -创建download-excel完成- 《《");
                    await this.saveChooseModels2Tables(saveDatas);
                    // });
                } else {
                    console.log("》》 -未创建download-excel，没有模型- 《《");
                }
                rl(counts);
            } catch (error) {
                console.log("error", error);
                rj();
            }
        });
    }
    isSuccess(datas, data) {
        let index = datas.findIndex((v) => this.compareTime(data[2], v.d));
        let find = datas.find((v) => this.compareTime(data[2], v.d, "="));
        let newDatas = datas.slice(index, datas.length);
        let remark = "",
            preD = find;
        newDatas.some((v, i) => {
            // 22日内的结果
            if (i > 22) return true;
            // 没有跌破模型的
            if (v.c < find.o) {
                return true;
            }
            remark += this.zdf([preD, v]) + ",";
            preD = v;
        });
        remark += ";";
        return remark;
    }
    saveChooseModels2Tables(datas) {
        return new Promise((rl, rj) => {
            let index = -1;
            const lists = Object.entries(datas);
            let fn = async function () {
                const item = lists[++index];
                if (item) {
                    // const dwm = item[1][0][3];

                    // console.log(`>>> 开始清除${SQL.base}_${item[0]}表 ...`);
                    // await SQL.deleteSQL({
                    //     connection: global.customConnection,
                    //     name: `${SQL.base}_${item[0]}`,
                    //     conditions: `dwm='${dwm}'`,
                    // });

                    // console.log(`> ${SQL.base}_${item[0]} 已清空`);
                    console.log(`>>> 开始存入${SQL.base}_${item[0]}表 ...`);
                    const values = `${item[1].map((v) => {
                        v.unshift(v[0].slice(0, 3));
                        return `(${v.map((d) => `'${d}'`)})`;
                    })}`;
                    await SQL.insertSQL({
                        connection: global.customConnection,
                        name: `${SQL.base}_${item[0]}(type, code, start, end, dwm, today, remark)`,
                        // values: `${item[1].map((v) => `('${v}')`)}`,
                        values,
                    });
                    console.log(`>>> ${SQL.base}_${item[0]} ...`);
                    fn();
                } else {
                    console.log("》》 - 存入完成 - 《《");
                    rl();
                }
            };
            fn();
        });
    }
    excelToDatas(dwm, codes) {
        return new Promise((rl, rj) => {
            let i = 0,
                sheets = [];
            let fn = function () {
                const type = codes.split(",")[i];
                if (type) {
                    let arrs = nodeExcel.parse(`stash_${type}_${dwm}.xlsx`) || [];
                    sheets = sheets.concat(arrs);
                    console.log(`》》 -读取 stash_${type}_${dwm}.xlsx 成功- 《《`);
                    i++;
                    fn();
                } else {
                    rl(sheets);
                }
            };
            fn();
        });
    }
    readDownloadExcel(dwm = "d") {
        return new Promise((rl, rj) => {
            const sheets = nodeExcel.parse(`download_${dwm}.xlsx`) || [];
            rl(sheets);
        });
    }
    getRequest(url, callback, { method = "GET", others } = {}) {
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
    }
    getMailHtml(data, type, dwm) {
        let divbox = ``;
        for (let k in data) {
            divbox += `<div style="display:flex"><span style="flex: 1">${k}：</span><span style="flex: 1">${data[k]}</span></div>`;
        }
        let html = `<div style="text-align: center;"><h4>sina ${type}： ${dwm} 成功!</h4><div style="width:200px;display:inline-block">${divbox}</div></div>`;
        return html;
    }
    callbackFn(datas, callback) {
        return new Promise((rl, rj) => {
            let index = -1;
            let result;
            let fn = async function () {
                const item = datas[++index];
                if (item) {
                    result = (await callback) && callback(item, fn);
                } else {
                    rl(result);
                }
            };
            fn();
        });
    }
}

module.exports = new Methods();
