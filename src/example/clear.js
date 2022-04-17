/** @format */

const request = require("request");
const SQL = require("../sql");
const { modelsCode } = require("../utils/code");

module.exports = function (app, connection) {
    app.get("/api/clear", async (req, res) => {
        console.log("-------------开始执行 /api/clear---------------");
        let { type = "models" } = req.query;
        const keys = Object.keys(modelsCode);
        const sql = `DROP TABLE ${keys.map((v) => `${SQL.base}_${v}`)}`;
        connection.query(sql, (err, res) => {
            if (err) {
                console.log(`>> clear失败: ${err.message}`);
                return;
            }
            console.log("-------------执行完成 /api/clear---------------");
            request(
                {
                    url: "http://localhost:3334/api/createNewTables",
                    method: "GET",
                    headers: {
                        "Content-Type": "text/json",
                    },
                },
                (error, response, body) => {}
            );
        });
    });
};
