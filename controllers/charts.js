import { pool } from '../database/databasePool.js';

export const getCharts = (req, res) => {

    const data_total = `SELECT DATE_FORMAT(avatar_time, '%Y-%m') AS month, 
                          COUNT(*) AS count,
                          'avatar' AS type
                      FROM Avatar
                      GROUP BY month
                      UNION ALL
                      SELECT DATE_FORMAT(sign_time, '%Y-%m') AS month, 
                          COUNT(*) AS count,
                          'sign' AS type
                      FROM Sign
                      GROUP BY month
                      UNION ALL
                      SELECT DATE_FORMAT(release_time, '%Y-%m') AS month, 
                          COUNT(*) AS count,
                          'video' AS type
                      FROM video
                      GROUP BY month;`;


    pool.query(data_total, (error, results) => {

        if (error) {
            console.log(error);
            res.status(500).send(error);
        }
        else {
            res.status(200).json(results);
        }

    });
};