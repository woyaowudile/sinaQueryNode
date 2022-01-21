/** @format */

const API = require("../api");
const request = require("request");
const schdule = require("node-schedule");

const { sendMail } = require("./sendEmail");

module.exports = {
    nodeSchedule: async (connection) => {
        console.log(`>>> 开启定时任务`);
        // let rule = new schdule.RecurrenceRule();
        /**
         * rule: Object{
         *      date:null
         *      dayOfWeek:null
         *      hour:null
         *      minute:null
         *      month:null
         *      recurs:true
         *      second:0
         *      year:null
         * }
         */
        // 例： rule.hour = [1, 3, 4, 20]. 表示 每天 1点、3点、4点、晚上8点 运行
        // '* * * * * *' '秒分时日月周'
        // 例： 每日的12.30 -> '00 30 12 * * *'
        schdule.scheduleJob(
            {
                dayOfWeek: [1, 2, 3, 4, 5],
                hour: [17],
                minute: [30],
                second: [0],
            },
            async () => {
                const date = new Date();
                const res = await API.getHolidays(date);
                if (res) {
                    sendMail(`${date.toLocaleString()}今天好像不是工作日！`);
                    return;
                }
                // 每周的一二三四五 的 下午5：30
                connection.query(`DELETE FROM xxxx_today WHERE dwm = 'd'`, async (err, result) => {
                    if (err) {
                    } else {
                        sendMail(`今天（${new Date().toLocaleString()}）的任务开始了 by new`);
                        request(
                            {
                                url: "http://localhost:3334/api/update?dwm=d",
                                method: "GET",
                                headers: {
                                    "Content-Type": "text/json",
                                },
                            },
                            (error, response, body) => {}
                        );
                    }
                });
            }
        );
        schdule.scheduleJob("00 30 12 * * 6", () => {
            // 每周六 的4.30 更新
            connection.query(`DELETE FROM xxxx_today WHERE dwm = 'w'`, async (err, result) => {
                if (err) {
                } else {
                    sendMail(`这周（${new Date().toLocaleString()}）的任务开始了`);
                    request(
                        {
                            url: "http://localhost:3334/api/update?dwm=w",
                            method: "GET",
                            headers: {
                                "Content-Type": "text/json",
                            },
                        },
                        (error, response, body) => {}
                    );
                }
            });
        });
        schdule.scheduleJob("00 30 1 1 * *", () => {
            // 每月 1 号的 1.30 更新
            connection.query(`DELETE FROM xxxx_today WHERE dwm = 'm'`, async (err, result) => {
                if (err) {
                } else {
                    sendMail(`本月（${new Date().toLocaleString()}）的任务开始了`);
                    request(
                        {
                            url: "http://localhost:3334/api/update?dwm=m",
                            method: "GET",
                            headers: {
                                "Content-Type": "text/json",
                            },
                        },
                        (error, response, body) => {}
                    );
                }
            });
        });
        console.log(`-------- 已开启 定时任务 E_N_D --------`);
    },
};
