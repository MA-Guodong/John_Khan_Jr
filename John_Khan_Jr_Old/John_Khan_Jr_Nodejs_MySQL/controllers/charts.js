import { pool } from '../database/databasePool.js';

// pool.getConnection((err, connection) => {
//     if (err) throw err;

//     const query = `SELECT DATE_FORMAT(avatar_time, '%Y-%m') AS chart_month, 
//                           COUNT(*) AS count,
//                           'avatar' AS type
//                       FROM Avatar
//                       GROUP BY chart_month
//                       UNION ALL
//                       SELECT DATE_FORMAT(sign_time, '%Y-%m') AS chart_month,
//                           COUNT(*) AS count,
//                           'sign' AS type
//                       FROM Sign
//                       GROUP BY chart_month
//                       UNION ALL
//                       SELECT DATE_FORMAT(release_time, '%Y-%m') AS chart_month,
//                           COUNT(*) AS count,
//                           'video' AS type
//                       FROM video
//                       GROUP BY chart_month;`;

//     connection.query(query, (error, results, fields) => {

//         // console.log(results);
//         if (error) throw error;

//         const data = results;

//         // 构建 chart_month 列表，保证每个 type 都拥有所有的 chart_month
//         const chartMonths = {};
//         data.forEach(item => {
//             const { chart_month, type } = item;
//             if (!chartMonths[type]) {
//                 chartMonths[type] = new Set();
//             }
//             chartMonths[type].add(chart_month);
//         });
//         const allChartMonths = {};
//         Object.keys(chartMonths).forEach(type => {
//             chartMonths[type].forEach(month => allChartMonths[month] = true);
//         });
//         const chartMonthList = Object.keys(allChartMonths);

//         // 构建插入数据库的数据结构
//         const insertData = [];
//         chartMonthList.forEach(month => {
//             Object.keys(chartMonths).forEach(type => {
//                 if (chartMonths[type].has(month)) {
//                     const matchingData = data.find(item => item.chart_month === month && item.type === type);
//                     insertData.push([month, matchingData.count, type]);
//                 } else {
//                     insertData.push([month, 0, type]);
//                 }
//             });
//         });
//         console.log(insertData);

//         // 插入数据到数据库表
//         const sql = 'INSERT INTO Charts (chart_month, count, type) VALUES ?';

//         // 从连接池中获取连接，执行插入操作
//         pool.getConnection((error, connection) => {
//             if (error) throw error;

//             connection.query(sql, [insertData], (error, results, fields) => {
//                 connection.release(); // 释放连接

//                 if (error) throw error;
//                 console.log('Data inserted successfully');
//             });
//         });
//     });
// });


export const getCharts = (req, res) => {

    const sql = 'SELECT chart_month, count, type FROM Charts ORDER BY chart_month;';

    pool.query(sql, (error, results) => {

        if (error) {
            console.log(error);
            res.status(500).send(error);
        }
        else {
            res.status(200).json(results);
        }

    });


};

export const getDateCounts = (req, res) => {

    const dateCounts = `SELECT TIMESTAMPDIFF(SECOND, release_time, CURRENT_TIMESTAMP) 
                    AS date_counts
                    FROM video
                    ORDER BY release_time DESC
                    LIMIT 1;`

    pool.query(dateCounts, (error, results) => {

        if (error) {
            console.log(error);
            res.status(500).send(error);
        }
        else {
            res.status(200).json(results);
        }

    });
};
