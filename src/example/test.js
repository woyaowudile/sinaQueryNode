/** @format */

const API = require("../api");

module.exports = function (app, connection) {
    app.get("/api/test", async (req, res) => {
        console.log("-------------开始执行 /api/test---------------");
        const res = await API.getList({ connection });
        console.log(`》》-- 执行完成 /api/test --《《`);
        res.send("ok");
    });
};
