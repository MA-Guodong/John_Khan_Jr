import { pool } from '../database/databasePool.js';

export const getVideos = (req, res) => {
    const { draw, start, length, order, columns, search } = req.query;

    const column_index = order && order[1] && order[1].column;

    const column_sort_order = order === undefined ? 'desc' : req.query.order[1]['dir'];

    const column_name = column_index ? columns[column_index] : 'release_time';

    const search_value = search?.value;

    const search_query = search_value ? `WHERE video_title LIKE '%${search_value}%'` : '';

    const video_order = `SELECT id, video_title, video_url, video_cover, release_time, video_duration, pop_num,  comment_num FROM video ${search_query} ORDER BY ${column_name} ${column_sort_order} LIMIT ${start}, ${length}`;

    const video_total = `SELECT COUNT(*) AS Total FROM video`;

    const video_search_num = `SELECT COUNT(*) AS Total FROM video ${search_query}`;

    pool.query(video_order, (dataError, dataResult) => {

        pool.query(video_total, (totalDataError, totalDataResult) => {

            pool.query(video_search_num, (totalFilterDataError, totalFilterDataResult) => {

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