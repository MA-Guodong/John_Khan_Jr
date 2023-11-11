import { pool } from '../database/databasePool.js';

export const getAvatars = (req, res) => {

    const { draw, start, length, order, columns, search } = req.query;

    const column_index = order && order[1] && order[1].column;

    const column_sort_order = order === undefined ? 'desc' : req.query.order[1]['dir'];

    const column_name = column_index ? columns[column_index] : 'avatar_time';

    const search_value = search?.value;

    const search_query = search_value ? ` WHERE avatar_time LIKE '%${search_value}%' OR img_file_path LIKE '%${search_value}%'` : '';

    const avatar_order = `SELECT id, avatar_time, img_file_path FROM Avatar ${search_query} ORDER BY ${column_name} ${column_sort_order} LIMIT ${start}, ${length}`;

    const avatar_total = `SELECT COUNT(*) AS Total FROM Avatar`;

    const avatar_search_num = `SELECT COUNT(*) AS Total FROM Avatar ${search_query}`;

    pool.query(avatar_order, (dataError, dataResult) => {

        pool.query(avatar_total, (totalDataError, totalDataResult) => {

            pool.query(avatar_search_num, (totalFilterDataError, totalFilterDataResult) => {

                res.json({
                    draw: req.query.draw,
                    recordsTotal: totalDataResult[0]['Total'],
                    recordsFiltered: totalFilterDataResult[0]['Total'],
                    data: dataResult
                });
            });
        });
    });
};