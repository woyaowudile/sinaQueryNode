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
    reserveFn(datas, start, num) {
        const arrs = datas.slice(start - num, start) || [];
        return arrs.reverse();
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
    xd({ datas, start }) {
        const current = datas[start];
        const lists = this.reserveFn(datas, start, 30);
        const index = lists.every((v, i) => {
            let min = Math.min(v.o, v.c);
            return current.l < min;
        });
        return index;
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
                saveDatas = {},
                newDatas = {},
                counts = {},
                html = "";
            datas.forEach((v) => {
                const coords = v.coords;
                coords.forEach((d) => {
                    const [name] = d;
                    // 每个模型对应的 比较时间不同
                    const days = modelsCode[name];
                    const flag = this.compareTime(this.someDay(days), d[1]);
                    const data = [v.code, d[1], d[2], dwm];
                    if (flag) {
                        counts[name] = (counts[name] || 0) + 1;
                        // 表示当天的，和发的邮件保持一致
                        data.push("Y");
                    } else {
                        // 补全数组长度
                        data.push("");
                    }
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
                    const buffer = nodeExcel.build(lists);
                    fs.writeFile(excelName, buffer, async (err) => {
                        if (err) throw err;
                        html = this.getMailHtml(counts, mail, dwm);
                        // sendMail(html);
                        console.log("》》 -创建download-excel完成- 《《");
                        await this.saveChooseModels2Tables(saveDatas);
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
    saveChooseModels2Tables(datas) {
        return new Promise((rl, rj) => {
            let index = -1;
            const lists = Object.entries(datas);
            let fn = async function () {
                const item = lists[++index];
                if (item) {
                    const dwm = item[1][0][3];

                    console.log(`>>> 开始清除${SQL.base}_${item[0]}表 ...`);
                    await SQL.deleteSQL({
                        connection: global.customConnection,
                        name: `${SQL.base}_${item[0]}`,
                        conditions: `dwm='${dwm}'`,
                    });

                    console.log(`> ${SQL.base}_${item[0]} 已清空`);
                    console.log(`>>> 开始存入${SQL.base}_${item[0]}表 ...`);
                    await SQL.insertSQL({
                        connection: global.customConnection,
                        name: `${SQL.base}_${item[0]}(code, start, end, dwm, today)`,
                        // values: `${item[1].map((v) => `('${v}')`)}`,
                        values: `${item[1].map((v) => `(${v.map((d) => `'${d}'`)})`)}`,
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
