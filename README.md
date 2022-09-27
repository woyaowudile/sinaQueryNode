# 说明

## <div>api/initSH</div>
```js
/*
*   @param 无
*   @return 获取上指
*/
```
## <div>api/init</div>
```js
/*
*   @param dwm d
*   @param days 如果开始、结束有参数，则days不生效(例： days=5 即 3.10 - 5 = 3.5)
*   @param start 开始时间(19920601)
*   @param end  结束时间(20220315)
*   @return Arrays<[d, o, c, zde, zd, l, h, v, e, hs]>
*/
```
## <div>api/update</div>
```js
/*
*   @param dwm d
*   @param type 不更新数据，直接筛选模型(update|search), 默认update
*   @param start 开始时间(19920601)
*   @param end  结束时间(20220315)
*   @param days 如果开始、结束有参数，则days不生效(例： days=5 即 3.10 - 5 = 3.5)
*   @return Arrays<[d, o, c, zde, zd, l, h, v, e, hs]>
*/
```
## <div>api/query</div>

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

## <div>api/createNewTables</div>
```js
/*
*   @param 无
*   @return 创建表
*/
```


## <div>api/duplicate/remove</div>
```js
/*
*   @param start 开始时间(从19920601至今)
*   @param days  例：days=5 即 3.10 - 5 = 3.5，优先使用start
*   @return 去重指定时间内的数据
*/
```

## <div>api/analysis</div>
```js
/*
*   @param days 365
*   @param number 20
*   @return 返回当前日期(2022-8-19)，365天前到20天前，即 2021-8-19 到 2021-7-30
*/
```

## <div>api/schdule</div>
```js
/*
*   @param type   update|send 默认'update'
*   @param start  开始日期20220909
*   @param end    结束日期20220916
*   @param days   当前日期往前，1为昨天，2为前天
*   @param dwm    默认 'd'
*   @return       定时任务，每天更新或推送
*/
```


## <div>api/clear</div>
```js
/*
*   @param dwm d
*   @param type (all|models)
*   @return 清除所有|仅模型表
*/
```

## <div>api/clear/date</div>
```js
/*
*   @param d date (2022-02-01)
*   @return 清除数据表指定时间段的数据
*/
```