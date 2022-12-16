/** @format */

const { getRequest } = require("../model/methods");

module.exports = function (app, connection) {
    app.get("/api/test", async (req, res) => {
        console.log("-------------开始执行 /api/test---------------");
        let url = "http://localhost:3334/api/update?type=test";
        await getRequest(url);
        console.log(`》》-- 执行完成 /api/test --《《`);
        res.send({ data: [], message: "成功", code: 0 });
    });
};
