/** @format */

const SQL = require("../sql");

module.exports = function (app, connection) {
    app.get("/api/test", async (req, res) => {
        console.log("-------------开始执行 /api/test---------------");
        const result = await SQL.getList({ connection });
        console.log(`》》-- 执行完成 /api/test --《《`);
        res.send({ data: result, message: "成功", code: 0 });
    });
};
