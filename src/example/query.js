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
let resultsAllCodes = {};
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
        let { days, date, dwm = "d", size = 25, page = 1, index = 0, count = -1, codes = "601,603", models = [] } = req.query;
        let d = $methods.someDay(days, "-");

        const sendResults = {
            code: 0,
            index: 0,
            message: "成功",
            data: [],
        };
        if (!resultsParams.codes.length) {
            resultsParams.codes = $methods.excelToDatas(dwm);
        }
        let datas = resultsParams.codes
            .map((v) => {
                const item = v.data.slice(1, v.data.length).map((d) => {
                    const data = {};
                    v.data[0].forEach((x, y) => {
                        data[x] = d[y];
                    });
                    return data;
                });

                const res = $model.getModel({ item, date, dwm });
                if (!res[0]) {
                    return;
                }
                let cds = res[0].coords.filter((v) => {
                    let compireTime = new Date(date).getTime();
                    let nowTime = new Date(v[1]).getTime();
                    return models.includes(v[0]) && nowTime >= compireTime;
                });
                if (cds.length) {
                    res[0].coords = cds;
                } else {
                    res[0] = undefined;
                }
                return res[0];
            })
            .filter((v) => v);
        // datas = datas.slice(index, datas.length);
        datas = datas.slice((page - 1) * size, page * size);

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
                sendResults.data.push({ buy, code, datas, dwm, coords });
                fn();
            }
        };
        fn();
    });
};
