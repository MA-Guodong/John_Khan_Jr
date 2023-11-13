import express from 'express';

import { getCharts } from '../controllers/charts.js';

const router = express.Router();

router.get("/", getCharts);

export default router;