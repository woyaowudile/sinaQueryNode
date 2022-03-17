# 说明


## /api/init
```js
/*
*   @param dwm d
*   @param start 开始时间(19920601)
*   @param end  结束时间(20220315)
*   @return Arrays<[d, o, c, zde, zd, l, h, v, e, hs]>
*/
```
## /api/update
```js
/*
*   @param dwm d
*   @param start 开始时间(19920601)
*   @param end  结束时间(20220315)
*   @param days 如果开始、结束传参，则days不生效(例： days=5 即 3.10 - 5 = 3.5)
*   @return Arrays<[d, o, c, zde, zd, l, h, v, e, hs]>
*/
```
## /api/query

```js
/*
*   @param models[] isQx2
*   @param date 2022-02-01
*   @param codes [600,601,603,000,002]
*   @param dwm d
*   @param page 1
*   @param size 10
*   @return Arrays<{buy: 2022-02-01, code, coords: [[code, buy, buy_date],...], datas: [{d,code,c,h,l,o,v,zd}, ...]}>
*/
```
## /api/querybefore
```js
/*
*   @param dwm d
*   @return 预生成 `stash_${dwm}.xlsx` 和 `download_${dwm}.xlsx`
*/
```
## /api/download
```js
/*
*   @param dwm d
*   @return `download_${dwm}.xlsx`
*/
```
## /api/createNewTables
```js
/*
*   @param 无
*   @return 创建表
*/
```