import express from 'express';

import { getSigns } from '../controllers/signs.js';

const router = express.Router();

router.get("/", getSigns);

export default router;