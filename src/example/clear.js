/** @format */

const request = require("request");
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
                    otherTableCodes
                );
                break;
        }
        if (dwm) {
            let index = -1;
            let fn = async () => {
                let item = keys[++index];
                if (item) {
                    let conditions = `dwm=${dwm}`;
                    // if (start) {
                    //     conditions += ` and start >= '${start}' `;
                    // }
                    // if (end) {
                    //     conditions += ` and end <= '${end} `;
                    // }
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
        connection.query(sql, (err, result) => {
            if (err) {
                console.log(`>> clear_${type}失败: ${err.message}`);
                return;
            }
            console.log(`》》-- 执行完成 /api/clear：${type} --《《`);
            request(
                {
                    url: "http://localhost:3334/api/createNewTables",
                    method: "GET",
                    headers: {
                        "Content-Type": "text/json",
                    },
                },
                (error, response, body) => {
                    if (!error) {
                        res.send("ok");
                    }
                }
            );
        });
    });
};
