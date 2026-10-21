import express from 'express';
import { getSubjects, getChaptersBySubject, getTopicsByChapter, getTopicBySlug, submitMCQs } from '../controllers/study.controller.js';

const router = express.Router();

router.get('/subjects', getSubjects);
router.get('/subjects/:subjectSlug', getChaptersBySubject);
router.get('/subjects/:subjectSlug/chapters', getChaptersBySubject);
router.get('/chapters/:chapterId/topics', getTopicsByChapter);
router.get('/topics/:topicSlug', getTopicBySlug);
router.post('/topics/:topicSlug/submit', submitMCQs);

export default router;
