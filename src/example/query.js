/** @format */

const API = require("../api");
const SQL = require("../sql");
const $model = require("../model");
const $methods = require("../model/methods");

/**
 *
 * @param {Number} days 天数 表示从今天之前的第n天到今天
 * @param {date} date 日期，效果等同于days，筛选条件用
 * @param {String} dwm 周期：'天d、周w、月m'
 * @param {Number} size 每页数量
 * @param {Number} page 第几页
 */
let resultsDownload = [];
let resultsModelsCode = {};
let resultsParams = {
    init: true,
    codes: [],
    waiting: false,
    status: "",
};
let stash = {
    useds: [],
    types: {},
};
function getSend({ code = 0, message = "成功了", result, data }) {
    return { code, message, result, data };
}
module.exports = function (app, connection) {
    app.get("/api/query1", async (req, res) => {
        console.log(`-------------开始执行 /api/query---------------`);

        if (resultsParams.waiting) {
            res.send(
                getSend({
                    result: {
                        code: 1,
                        message: `请等待query接口完成（${resultsParams.status}）`,
                        result: [],
                    },
                })
            );
            return;
        }
        /*
			days：5（从5天前到今天的数据）
			// date: ()
			dwm: 年月日
			codes：[603,601...] 对应的603下所有的数据从数据库拿到，会很慢
		 */
        let { days, date, dwm = "d", size = 25, page = 1, index = 0, count = -1, codes = "601,603", models } = req.query;
        let d = $methods.someDay(days, "-");

        const sendResults = {
            code: 0,
            index: 0,
            message: "成功",
            data: [],
        };
        let datas = resultsParams.codes.filter((v) => v.dwm === dwm);
        datas = datas.slice(index, datas.length);

        const fn = () => {
            let isEnd = sendResults.data.length >= size;
            const item = datas[++count];
            if (!item || isEnd) {
                const flag = resultsParams.codes.length;
                const message = flag ? "成功了" : "还没有预查数据";
                sendResults.message = message;
                sendResults.index = count;
                sendResults.code = flag ? 0 : 1;
                res.send(getSend({ result: sendResults }));
            } else {
                let { buy, code, datas, coords } = item;
                let cds = coords
                    .map((v) => {
                        let compireTime = new Date(date).getTime();
                        let nowTime = new Date(v[1]).getTime();
                        if (models.includes(v[0]) && nowTime >= compireTime) {
                            return v;
                        }
                    })
                    .filter((v) => v);
                if (cds.length) {
                    sendResults.data.push({ buy, code, datas, dwm, coords: cds });
                }
                fn();
            }
        };
        fn();
    });

    app.get("/api/query/table", async (req, res) => {
        const result = await SQL.getTables({
            connection,
            name: `checked`,
            conditions: ``,
        });
        res.send(getSend({ result: getSend({ data: result }) }));
    });
    app.post("/api/query/chart", async (req, res) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            const arrs = JSON.parse(body);
            let results = [];
            let count = -1;
            let fn = async () => {
                let item = arrs[++count];
                if (!item) {
                    res.send(getSend({ result: getSend({ data: results }) }));
                } else {
                    const res = await SQL.getTables({
                        connection,
                        name: item.type,
                        conditions: `dwm='${item.dwm}' and code='${item.code}' and d >= '${item.buy}'`,
                    });
                    results.push({ id: item.id, datas: res });
                    fn();
                }
            };
            fn();
            // const resultes = resul
        });
    });
    app.post("/api/query/add", async (req, res) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            const arrs = JSON.parse(body);
            const names = Object.keys(arrs[0]);
            const values = arrs.map((v) => {
                let keys = Object.keys(v);
                return `(${keys.map((d) => `'${v[d]}'`)})`;
            });
            let msg = "",
                code = 0;
            await SQL.insertSQL({
                connection,
                name: `${SQL.base}_checked(${names.map((v) => v)})`,
                values: `${values}`,
            })
                .then((d) => {
                    msg = `>> checked add ${arrs[0].code} ${d.message}`;
                    console.log(msg);
                })
                .catch((err) => {
                    msg = `>> checked add ${arrs[0].code} ${err.message}`;
                    code = 1;
                    console.log(msg);
                });
            res.send(getSend({ result: getSend({ message: msg, code }), code }));
        });
    });
    app.put("/api/query/update", async (req, res) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            const obj = JSON.parse(body);
            const names = Object.keys(obj);
            const values = names.map((v) => `${v} = ${obj[v]}`);
            let msg = "",
                code = 0;
            await SQL.updateSQL({
                connection,
                name: `${SQL.base}_checked`,
                values: `${values}`,
                conditions: `id = ${obj.id}`,
            })
                .then((d) => {
                    msg = `>> update level ${d.message}`;
                    console.log(msg);
                })
                .catch((err) => {
                    msg = `>> update level ${err.message}`;
                    code = 1;
                    console.log(msg);
                });
            res.send(getSend({ result: getSend({ message: msg, code }), code }));
        });
    });
    app.delete("/api/query/delete", async (req, res) => {
        const { id, code, models } = req.query;
        let conditions = "";
        if (id) {
            conditions += `id in (${id})`;
        }
        if (code) {
            conditions += `code = ${code}`;
        }
        if (models) {
            const arrs = models.split(",");
            conditions += ` and name_key in ('${arrs}') `;
        }
        await SQL.deleteSQL({
            connection,
            name: `${SQL.base}_checked`,
            conditions,
        })
            .then((d) => {
                msg = `>> checked delete '${id}' ${d.message}`;
                console.log(msg);
            })
            .catch((err) => {
                msg = `>> checked delete '${id}' ${err.message}`;
                console.log(msg);
            });
        res.send(getSend({ result: getSend({ message: msg }) }));
    });

    app.get("/api/querybefore", async (req, res) => {
        if (!resultsParams.init) {
            res.send(
                getSend({
                    result: {
                        code: 0,
                        message: "已经预处理成功，请勿重复",
                    },
                })
            );
        }
        console.log(`-------------开始执行 /api/querybefore---------------`);

        resultsParams.init = false;
        resultsParams.waiting = true;

        $model.quertBefore(req.query, connection);
    });
    app.get("/api/query", async (req, res) => {
        console.log(`-------------开始执行 /api/query---------------`);

        /*
			days：5（从5天前到今天的数据）
			// date: ()
			dwm: 年月日
			codes：[603,601...] 对应的603下所有的数据从数据库拿到，会很慢
		 */
        let {
            days,
            date,
            dwm = "d",
            size = 25,
            page = 1,
            index = 0,
            count = -1,
            codes = "600,601,603,000,002",
            models = ["isKlyh"],
            isToday,
        } = req.query;
        let d = $methods.someDay(days, "-");

        const sendResults = {
            code: 0,
            index: 0,
            message: "成功",
            data: [],
        };

        (() => {
            const newDate = $methods.someDay(100, "-", date);
            const newDatas = [];
            let callback1 = (datas) => {
                return new Promise(async (rl, rj) => {
                    let index = -1;
                    const codes = datas.map((v) => v[0][1]) || [[]];
                    const tableNames = [];
                    codes.forEach((v) => {
                        const type = v.slice(0, 3);
                        !tableNames.includes(type) && tableNames.push(type);
                    });
                    Promise.all(
                        tableNames.map((tableName, index) => {
                            const filterCodes = codes.filter((v) => v.slice(0, 3) === tableName);
                            return SQL.querySQL({
                                connection,
                                name: `${SQL.base}_${tableName} where d >= '${newDate}' and dwm = '${dwm}' and code in (${filterCodes.map(
                                    (v) => `'${v}'`
                                )})`,
                            });
                        })
                    ).then((lists) => {
                        lists.forEach((res) => {
                            res.data.forEach((v) => {
                                let index = newDatas.findIndex((d) => d.name === v.code);

                                if (index > -1) {
                                    newDatas[index].data.push(v);
                                } else {
                                    newDatas.push({
                                        name: v.code,
                                        data: [v],
                                    });
                                }
                            });
                        });
                        newDatas.forEach((v) => {
                            v.data = v.data.sort((x, y) => new Date(x.d).getTime() - new Date(y.d).getTime());

                            const coords = datas.find((d) => d[0][1] === v.name);
                            sendResults.data.push({ buy: date, code: v.name, datas: v.data, dwm, coords });
                        });
                        console.log(`>>> 处理send数据`);
                        rl();
                    });
                });
            };
            let callback2 = () => {
                let index = -1;
                let fn = async () => {
                    const item = models[++index];
                    if (item) {
                        // 现在查询的速度差不多8-12s，
                        // if (!resultsModelsCode[item]) {
                        console.log(`>> 正在查询：${item}`);
                        let name = `${SQL.base}_${item} where end >= '${newDate}' and dwm = ${dwm}`;
                        if (isToday === "Y") {
                            name += ` and today='${isToday}'`;
                        }
                        const res = await SQL.querySQL({
                            connection,
                            name,
                        });
                        const pushModelsCode = {};
                        res.data.forEach((v, i) => {
                            if (pushModelsCode[v.code]) {
                                pushModelsCode[v.code].push([item, v.code, v.start, v.end]);
                            } else {
                                pushModelsCode[v.code] = [[item, v.code, v.start, v.end]];
                            }
                        });
                        resultsModelsCode[item] = pushModelsCode;
                        // await fn({ datas, modelName: item, date });
                        // } else {
                        //     console.log(`>> ${item} 已记录`);
                        // }
                        let datas = Object.values(resultsModelsCode[item]).slice((page - 1) * size, page * size);
                        await callback1(datas);
                        fn();
                    } else {
                        console.log(`>> -- models预查询完成 -- <<`);
                        res.send(getSend({ result: sendResults }));
                    }
                };
                fn();
            };
            callback2();
        })();

        // const fn = () => {
        //     let isEnd = sendResults.data.length >= size;
        //     const item = datas[++count];
        //     if (!item || isEnd) {
        //         const flag = resultsParams.codes.length;
        //         const message = flag ? "成功了" : "还没有预查数据";
        //         sendResults.message = message;
        //         sendResults.index = count;
        //         sendResults.code = flag ? 0 : 1;
        //         console.log(`-------------《query：${message}》-------------`);
        //         res.send(getSend({ result: sendResults }));
        //     } else {
        //         let { buy, code, datas, coords } = item;
        //         sendResults.data.push({ buy, code, datas, dwm, coords });
        //         fn();
        //     }
        // };
        // fn();
    });
    app.get("/api/analysis", async (req, res) => {
        console.log(`-------------开始执行 /api/analysis---------------`);
        let { days, date, dwm = "d", codes = "600,601,603,000,002", models = [] } = req.query;

        if (!resultsDownload.length) {
            console.log("》》》 正在查询download");
            resultsDownload = await $methods.readDownloadExcel(dwm);
        }
        console.log("》》 -- 查询成功 -- 《《");
        const sendResults = {
            code: 0,
            index: 0,
            message: "成功",
            data: resultsDownload,
        };
        res.send(getSend({ result: sendResults }));
    });
    app.get("/api/analog", async (req, res) => {
        console.log(`-------------开始执行 /api/analog---------------`);
        let { days, startDate, endDate, dwm = "d", codes = "600,601,603,000,002", models, random } = req.query;
        let conditions = `dwm='${dwm}' and start >= '${$methods.someDay(0, "-", startDate)}' `;
        if (endDate) {
            conditions += ` and ${endDate} >= end`;
        }
        const queryRes = await SQL.querySQL({
            connection,
            name: `${SQL.base}_${models}`,
            conditions,
        });
        console.log("》》 -- 查询analog成功 -- 《《");
        const sendResults = {
            code: 0,
            index: 0,
            message: "成功",
            data: {
                coords: queryRes.data.map((v) => [models, v.code, v.start, v.end]),
            },
        };
        res.send(getSend({ result: sendResults }));
    });

    app.get("/api/queryOne", async (req, res) => {
        console.log(`-------------开始执行 /api/queryOne---------------`);
        let { code, dwm = "d" } = req.query;
        let type = code.slice(0, 3);
        const queryRes = await SQL.querySQL({
            connection,
            name: `${SQL.base}_${type}`,
            conditions: `dwm='${dwm}' and code = '${code}'`,
        });
        console.log("》》 -- 查询queryOne成功 -- 《《");
        const sendResults = {
            code: 0,
            index: 0,
            message: "成功",
            data: queryRes.data,
        };
        res.send(getSend({ result: sendResults }));
    });
};
