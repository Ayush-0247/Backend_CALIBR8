import { Router } from 'express';
import { getAllTopics, getDsaTopics } from '../controllers/topic.controller.js';

const router = Router();

router.get('/dsa', getDsaTopics);
router.get('/', getAllTopics);

export default router;
