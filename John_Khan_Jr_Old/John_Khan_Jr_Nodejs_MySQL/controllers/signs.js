import { pool } from '../database/databasePool.js';

export const getSigns = (req, res) => {
    const { draw, start, length, order, columns, search } = req.query;

    const column_index = order && order[1] && order[1].column;

    const column_sort_order = order === undefined ? 'desc' : req.query.order[1]['dir'];

    const column_name = column_index ? columns[column_index] : 'sign_time';

    const search_value = search?.value;

    const search_query = search_value ? ` WHERE sign_time LIKE '%${search_value}%' OR sign LIKE '%${search_value}%'` : '';

    const sign_order = `SELECT id, sign_time, sign FROM Sign ${search_query} ORDER BY ${column_name} ${column_sort_order} LIMIT ${start}, ${length}`;

    const sign_total = `SELECT COUNT(*) AS Total FROM Sign`;

    const sign_search_num = `SELECT COUNT(*) AS Total FROM Sign ${search_query}`;

    pool.query(sign_order, (dataError, dataResult) => {

        pool.query(sign_total, (totalDataError, totalDataResult) => {

            pool.query(sign_search_num, (totalFilterDataError, totalFilterDataResult) => {

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