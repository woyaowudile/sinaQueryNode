function MA(datas, start, n) {
    // 例： n = 10, start从0 - 9才能开始计算逻辑, 即 start - n >= -1
    if (start < n - 1) return;
    // 0 - 9 ； 2 - 11
    // start: 9, n: 10 ; start: 11, n: 10
    let data = datas.slice(start - (n - 1), start + 1);
    if (data.length === n) {
        let count = data.reduce((x, y) => {
            let x1 = (x.c ? x.c : x[2] ? x[2] : x) / 1;
            let y1 = (y.c ? y.c : y[2] ? y[2] : y) / 1;
            return x1 + y1;
        }, 0);
        return (count / n).toFixed(2) / 1;
    } else {
        return;
    }
}

module.exports = {
    MA,
};
