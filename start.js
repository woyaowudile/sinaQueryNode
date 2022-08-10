/** @format */

const fs = require("fs");
const express = require("express");
const app = express();
const port = 3334;

const { SQL, sendMail, runApi, nodeSchedule } = require("./src/index");

// 设置跨域问题等
var allowCrossDomain = function (req, res, next) {
    // 8080是vue项目的端口，这里相对于白名单. 所有设置 * 即可
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
};
app.use(allowCrossDomain);

app.listen(port, async () => {
    // 1. 链接数据库， 并开启定时任务
    let connection = await SQL.handleDisconnection([nodeSchedule]);
    global.customConnection = connection;
    // 2. 开放接口
    runApi(app, connection);

    // 3. 打印执行日志
    let mk = fs.readFile("./README.md", "utf-8", (err, data) => {
        if (err) {
            console.log("--------- 启动失败 ---------");
        }
        if (data && typeof data === "string") {
            console.log("-\n--\n---");
            console.log("-------------常用链接地址---------------");
            let arrs = [...data.matchAll(/<div>(.*?)<\/div>/g)];
            arrs.forEach((v) => {
                if (v[1] === "api/clear") {
                    console.log("----------- warning --------");
                }
                console.log(`http://localhost:${port}/${v[1]}`);
            });
            console.log("-------------常用链接地址---------------");
            console.log("---\n--\n-");
        }
    });
});
