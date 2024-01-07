import express from 'express';

import { getCharts } from '../controllers/charts.js';
import { getDateCounts } from '../controllers/charts.js';

const router = express.Router();

router.get("/", getCharts);
router.get("/datecounts", getDateCounts); // 新增路由

export default router;