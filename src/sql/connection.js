const mysql = require("mysql");

let mysql_config = {
        host: "8.141.209.61",
        user: "root",
        password: "Meng519890",
        database: "ig502",
        // insecureAuth: true
    },
    connection;

function handleDisconnection(callbacks) {
    return new Promise((resolve, reject) => {
        let pool = mysql.createPool(mysql_config);
        // pool.getConnection(async (err) => {
        //     if(err) {
        //         setTimeout('handleDisconnection()', 2000);
        //     } else {
        //         console.log(`-------------开始链接数据库---------------`);
        //         console.log(`pool-id：${pool.threadId}，时间：${new Date().toLocaleString()}`);
        console.log(`-------------数据库链接成功---------------`);

        //         // 需要启动时导入的方法
        callbacks && callbacks.forEach((v) => v(pool));

        resolve(pool);
        //     }
        // });
        // pool.on("acquire", (err) => {
        //     if (err) throw err;
        //     console.log("-------------从连接池获取到连接时-------------");
        // });
        // pool.on("connection", (err) => {
        //     if (err) throw err;
        //     console.log("-------------有新连接创建-------------");
        // });
        // pool.on("enqueue", (err) => {
        //     if (err) throw err;
        //     console.log("-------------获取请求队列-------------");
        // });
        // pool.on("release", (err) => {
        //     if (err) throw err;
        //     console.log("-------------连接池释放-------------");
        // });
        // pool.end((err) => {
        //     if (err) throw err;
        //     console.log("-------------连接池关闭-------------");
        // });
    });
}

// function handleDisconnection(callbacks) {
//     return new Promise((resolve, reject) => {
//         connection = mysql.createConnection(mysql_config);
//         connection.connect(async (err) => {
//             if(err) {
//                 setTimeout('handleDisconnection()', 2000);
//             } else {
//                 console.log(`-------------开始链接数据库---------------`);
//                 console.log(`connection-id：${connection.threadId}，时间：${new Date().toLocaleString()}`);
//                 console.log(`-------------数据库链接成功---------------`);

//                 // 需要启动时导入的方法
//                 callbacks && callbacks.forEach(v => v(connection))

//                 resolve(connection)
//             }
//         });

//         connection.on('error', function(err) {
//             console.error('db error', err);
//             if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
//                 console.error('db error执行重连:'+err.message);
//                 handleDisconnection(callbacks);
//             } else {
//                 throw err;
//             }
//         });
//     })
// }

module.exports = {
    handleDisconnection,
};
