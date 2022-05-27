/** @format */

const { getRequest } = require("../model/methods");
const SQL = require("../sql");
const { modelsCode, otherTableCodes } = require("../utils/code");

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
};
