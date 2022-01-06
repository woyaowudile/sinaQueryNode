/** @format */

const API = require("../api");
const SQL = require("../sql");

const $model = require("../model");
const $methods = require("../model/methods");

function getModel({ item: datas, date, dwm }) {
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
                $model.isKlyh(params); // ok
                $model.isQx1(params); // ok
                $model.isQx2(params); // ok
                // $model.isFkwz(params); // 大阴线不够大
                $model.isCsfr(params); // ok
                // $model.isLahm(params); // 大阴线不够大
                // $model.isSlbw0(params); // x
                // name && name(params);
                break;
            case 2:
                $model.isYjsd(params); // ok
                $model.isYydl(params); // ok
                $model.isGsdn(params); // ok
                $model.isDy(params);
                $model.isFhlz(params); // ok
                $model.isLzyy(params); // ok
                $model.isFlzt(params); // ok
                // $model.isG8M1(params);
                if (zd <= 9.5) {
                } else if (4 < zd && zd < 6) {
                    $model.isSlbw4(params);
                } else {
                    $model.isSlbw1(params);
                    // $model.isSlbw2(params); // x
                    $model.isSlbw3(params); // ok
                }
                break;
            case 3:
                break;
            default:
                break;
        }
        // $model.qs(datas, [''])
    });
    // let results = {
    //     coords,
    //     data: datas,
    //     dwm,
    //     type
    // }
    return results;
}

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
    app.get("/api/query", async (req, res) => {
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
    app.delete("/api/query/delete", async (req, res) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
        });
        req.on("end", async () => {
            const { id, code, models } = JSON.parse(body);
            let conditions = "";
            if (id) {
                conditions += `id = ${id}`;
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
                    msg = `>> checked delete ${id} ${d.message}`;
                    console.log(msg);
                })
                .catch((err) => {
                    msg = `>> checked delete ${id} ${err.message}`;
                    console.log(msg);
                });
            res.send(getSend({ result: getSend({ message: msg }) }));
        });
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
        console.log(`-------------开始执行 /api/query---------------`);

        resultsParams.init = false;
        resultsParams.waiting = true;

        let {
            days,
            date,
            dwm = "d",
            size = 25,
            // page = 1,
            index = 0,
            count = -1,
            codes = "600,601,603,000,002",
            models,
        } = req.query;
        let d = $methods.someDay(days, "-");

        // 1. 获取到所有的类型
        let usedres = stash.useds;
        if (usedres.length === 0) {
            stash.useds = usedres = await SQL.getTables({
                connection,
                name: "used",
                conditions: `dwm='${dwm}'`,
            });
        }
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
                resultsParams.waiting = false;
                console.log("-----预处理成功");
                res.send(
                    getSend({
                        result: { code: 0, message: "预处理成功1", result: resultsParams.data },
                    })
                );
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
                        ...v,
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
                        const res = getModel({ item: data, date, dwm });
                        return res[0];
                    })
                    .filter((v) => v);
                resultsParams.codes = resultsParams.codes.concat(results);
                getDatasFn(arrs, lenth);
            }
        };
    });
};
