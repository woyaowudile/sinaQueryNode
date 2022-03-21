/** @format */
const fs = require("fs");
const request = require("request");
const nodeExcel = require("node-xlsx");
const { MA } = require("../api/methods");
const { sendMail } = require("../utils/sendEmail");

function getMailHtml(data, type, dwm) {
    let divbox = ``;
    for (let k in data) {
        divbox += `<div style="display:flex"><span style="flex: 1">${k}：</span><span style="flex: 1">${data[k]}</span></div>`;
    }
    let html = `<div style="text-align: center;"><h4>sina ${type}： ${dwm} 成功!</h4><div style="width:200px;display:inline-block">${divbox}</div></div>`;
    return html;
}

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
    entity(data) {
        // 实体: (收-开)/开
        if (!data) return;
        let { o, c } = data;
        let max = Math.max(o, c);
        // 大实体：, 中实体：>0.0179-0.0310 ， 小实体：
        return (Math.abs(c - o) / max).toFixed(4) / 1;
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
        return ((current.c - pre.c) / pre.c) * 100;
    }
    zs(data, start, date, compare) {
        let datas = this.getModelLengthData(data, start, date);
        return datas.some((level1) => {
            let { c, o, l } = level1;
            return l <= compare;
        });
    }
    JC(data, start) {
        let slow = 60,
            fast = 10;
        let bma60 = MA(data, start, slow);
        let bma10 = MA(data, start, fast);
        let ma60 = MA(data, start - 1, slow);
        let ma10 = MA(data, start - 1, fast);
        let ama60 = MA(data, start - 2, slow);
        let ama10 = MA(data, start - 2, fast);

        // 金
        if (ama60 < ama10 && bma60 > bma10) {
            return {
                ma60,
                ma10,
                status: 3,
            };
        } else if (bma10 > bma60 && ama60 > ama10) {
            return {
                ma60,
                ma10,
                status: 1,
            };
        }
    }
    hp(data, start, cycle, callback) {
        let scale = 1.045;
        let datas = this.getModelLengthData(data, start - cycle, cycle);
        let [d1] = datas;
        if (!d1) return;
        let index = 0,
            startIndex = 0,
            arr = [];
        while (startIndex + index + 5 < datas.length) {
            startIndex += index;
            let avrage = Math.abs(datas[startIndex].c - datas[startIndex].o) / 2;
            let base = Math.min(datas[startIndex].c, datas[startIndex].o) + avrage;
            let pre = {
                date: datas[startIndex].d,
                max: base * scale,
                min: base / scale,
            };
            datas.slice(startIndex, datas.length - 1).forEach((level1, index1) => {
                let { c, o, h, l, d } = level1;
                if (h > pre.min && l < pre.max) {
                    index = index1;
                }
            });
            let max = datas.slice(startIndex, startIndex + index + 1).map((level1) => Math.max(level1.c, level1.o));
            let min = datas.slice(startIndex, startIndex + index + 1).map((level1) => Math.min(level1.c, level1.o));
            let date = datas.slice(startIndex, startIndex + index + 1).map((level1) => level1.d);
            arr.push({ max, min, date, count: index++ });
        }
        let flag = false;
        let [last2] = arr.slice(arr.length - 2, -1);
        let [last] = arr.slice(-1);
        if (arr.length <= 1) {
            flag = true;
        } else {
            if (last.count > 22) {
                let max2 = [...last2.max];
                let max = [...last.max];
                flag = max2 >= max;
            }
        }
        if (callback) {
            flag = callback(arr, datas);
        }
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

    qs(datas, []) {
        // let
    }

    someDay(days = 0, symbol = "-") {
        let today = new Date();
        let interval = 24 * 60 * 60 * 1000 * days;
        let after = new Date(today - interval);
        let year = after.getFullYear();
        let month = after.getMonth() + 1 + "";
        let date = after.getDate() + "";
        return `${year}${symbol}${month.padStart(2, 0)}${symbol}${date.padStart(2, 0)}`;
    }
    compareTime(dataA, dataB) {
        let atime = new Date(dataA).getTime();
        let btime = new Date(dataB).getTime();
        return btime > atime;
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
    downloadExcel(datas, dwm, mail) {
        return new Promise((rl, rj) => {
            let lists = [],
                newDatas = {},
                counts = {},
                html = "";
            datas.forEach((v) => {
                const coords = v.coords;
                coords.forEach((d) => {
                    const [name] = d;
                    // 每个模型对应的 比较时间不同
                    const days = {
                        isKlyh: 7,
                        isYjsd: 7,
                        isQx1: 8,
                        isQx2: 8,
                        isFkwz: 7,
                        isYydl: 11,
                        isCsfr: 7,
                        isGsdn: 7,
                        isDy: 8,
                        isFhlz: 7,
                        isLzyy: 7,
                        isCBZ: 8,
                        isFlzt: 7,
                        isLahm: 7,
                        isSlbw0: 7,
                        isSlbw1: 52,
                        // isSlbw2: "xxx",
                        isSlbw3: 7,
                        isSlbw4: 13,
                        isSlqs: 7,
                        isG8M1: 7,
                        isYylm: 25,
                    }[name];
                    const flag = this.compareTime(this.someDay(days), d[1]);
                    flag && (counts[name] = (counts[name] || 0) + 1);
                    if (newDatas[name]) {
                        newDatas[name].push([v.code, d[1], d[2]]);
                    } else {
                        newDatas[name] = [[v.code, d[1], d[2]]];
                    }
                });
            });
            Object.keys(newDatas).forEach((v) => {
                // const datas = newDatas[v];
                const arrs = newDatas[v].sort((x, y) => new Date(y[1]).getTime() - new Date(x[1]).getTime());
                lists.push({
                    name: v,
                    data: [["模型", "起始位置", "结束位置"], ...arrs],
                });
            });
            try {
                const excelName = `download_${dwm}.xlsx`;
                if (lists.length) {
                    const buffer = nodeExcel.build(lists);
                    fs.writeFile(excelName, buffer, (err) => {
                        if (err) throw err;
                        html = getMailHtml(counts, mail, dwm);
                        sendMail(html);
                        console.log("》》 -创建download-excel完成- 《《");
                    });
                } else {
                    console.log("》》 -未创建download-excel，没有模型- 《《");
                }
                rl(excelName);
            } catch (error) {
                console.log("error", error);
                rj();
            }
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
    duplicateRemove() {
        return new Promise((rl, rj) => {
            request(
                {
                    url: "http://localhost:3334/api/duplicate/remove",
                    method: "GET",
                    headers: {
                        "Content-Type": "text/json",
                    },
                },
                (error, response, body) => {
                    rl(body);
                }
            );
        });
    }
}

module.exports = new Methods();
