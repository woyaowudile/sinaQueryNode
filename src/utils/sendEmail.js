/** @format */

let emailer = require("nodemailer");
let smtpTransport = require("nodemailer-smtp-transport");

// 1. 创建smtp服务
let transport = emailer.createTransport(
    smtpTransport({
        host: "smtp.qq.com",
        secureConnection: true, // 使用ssl
        port: 465,
        auth: {
            user: "1157850031@qq.com",
            pass: "kbniofyclhjsbabe",
        },
    })
);

module.exports = {
    sendMail: (html = "什么内容都没有呢！~", subject) => {
        // 2. 设置邮件内容
        let mailOpts = {
            from: "1157850031@qq.com",
            to: "905421273@qq.com", // 多个收件人用逗号隔开
            subject: "s_in_a query node定时任务" + (subject ? subject : ""), // 标题
            html, // 内容
        };
        transport.sendMail(mailOpts, (err, res) => {
            if (err) {
                console.log("email 发送失败" + new Date().toLocaleString());
                console.log(err);
            } else {
                console.log("email 发送成功" + new Date().toLocaleString());
            }
            transport.close();
        });
    },
};
