import express from 'express';

import { getAvatars } from '../controllers/avatar.js';

const router = express.Router();

router.get("/", getAvatars);

export default router;