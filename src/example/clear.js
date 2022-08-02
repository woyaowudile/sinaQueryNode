/** @format */

const { getRequest, someDay } = require("../model/methods");
const SQL = require("../sql");
const { modelsCode, otherTableCodes } = require("../utils/code");

function getSQL(connection, { item, d, sub }) {
    return new Promise(async (rl, rj) => {
        let name = `xxxx_${item.type}`;
        if (sub) name += "_sub";
        const queryRes = await SQL.querySQL({
            connection,
            select: "id",
            name: `${name}`,
            conditions: `d='${d}'`,
        });
        let ids = queryRes.data.map((v) => `${v.id}`);
        if (ids.length) {
            await SQL.deleteSQL({
                connection,
                name: `${name}`,
                conditions: `id in (${ids})`,
            });
            console.log(`>>>> 清除完成 xxxx_${item.type}： ${d}`);
        }
        rl();
    });
}

module.exports = function (app, connection) {
    app.get("/api/clear", async (req, res) => {
        console.log("-------------开始执行 /api/clear---------------");
        let { type = "models", dwm } = req.query;
        let keys = Object.keys(modelsCode);
        switch (type) {
            case "all":
                const res = await SQL.querySQL({
                    connection,
                    distinct: `DISTINCT type`,
                    name: "ig502_list",
                });
                keys = keys.concat(
                    res.data.map((v) => v.type),
                    // sub副表，存储e、hs等
                    res.data.map((v) => `${v.type}_sub`),
                    otherTableCodes
                );
                break;
        }
        if (dwm) {
            let index = -1;
            let fn = async () => {
                let item = keys[++index];
                if (item) {
                    let conditions = `dwm='${dwm}'`;
                    // if (start) {
                    //     conditions += ` and start >= '${start}' `;
                    // }
                    // if (end) {
                    //     conditions += ` and end <= '${end} `;
                    // }
                    console.log(`》 clear - ${item}`);
                    await SQL.deleteSQL({
                        connection,
                        name: `${SQL.base}_${item}`,
                        conditions,
                    });
                    fn();
                } else {
                    res.send("ok");
                }
            };
            fn();
            return;
        }
        let sql = `DROP TABLE ${keys.map((v) => `${SQL.base}_${v}`)}`;
        connection.query(sql, async (err, result) => {
            if (err) {
                console.log(`>> clear_${type}失败: ${err.message}`);
                return;
            }
            console.log(`》》-- 执行完成 /api/clear：${type} --《《`);
            await getRequest("http://localhost:3334/api/createNewTables");

            res.send("ok");
        });
    });

    app.get("/api/clear/date", async (req, res) => {
        console.log("-------------开始执行 /api/clear/date---------------");
        let { d = someDay(0) } = req.query;

        const queryRes = await SQL.querySQL({
            connection,
            distinct: `DISTINCT type`,
            name: "ig502_list",
        });
        let index = -1;
        let fn = async function () {
            let item = queryRes.data[++index];
            if (item) {
                await getSQL(connection, { item, d });
                console.log(`>> 正在清除 xxxx_${item.type}： ${d}`);
                await getSQL(connection, { item, d, sub: true });
                console.log(`>> 正在清除 xxxx_${item.type}_sub： ${d}`);
                fn();
            } else {
                console.log(`》》-- 执行完成 /api/clear/date --《《`);

                res.send("ok");
            }
        };
        fn();
    });
};
