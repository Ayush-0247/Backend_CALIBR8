import prisma from '../config/db.js'; 

export const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.studySubject.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { chapters: true } } }
    });
    res.json(subjects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getChaptersBySubject = async (req, res) => {
  try {
    const { subjectSlug } = req.params;
    const subject = await prisma.studySubject.findUnique({
      where: { slug: subjectSlug },
      include: {
        chapters: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { topics: true } } }
        }
      }
    });
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    res.json(subject);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getTopicsByChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const topics = await prisma.studyTopic.findMany({
      where: { chapterId },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, name: true, order: true }
    });
    res.json(topics);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getTopicBySlug = async (req, res) => {
  try {
    const { topicSlug } = req.params;
    const topic = await prisma.studyTopic.findFirst({
      where: { slug: topicSlug },
      include: {
        mcqs: {
          orderBy: { order: 'asc' },
          select: {
            id: true,
            question: true,
            options: true,
            difficulty: true,
            order: true,
            explanation: true
          }
        },
        chapter: { include: { subject: true } }
      }
    });
    if (!topic) return res.status(404).json({ error: "Topic not found" });
    res.json(topic);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const submitMCQs = async (req, res) => {
  try {
    const { topicSlug } = req.params;
    const { answers } = req.body; 

    const topic = await prisma.studyTopic.findFirst({
      where: { slug: topicSlug },
      include: { mcqs: true }
    });

    let score = 0;
    const result = topic.mcqs.map(mcq => {
      const userAns = answers[mcq.id];
      const isCorrect = userAns === mcq.correctIndex;
      if (isCorrect) score++;
      return {
        mcqId: mcq.id,
        isCorrect,
        correctIndex: mcq.correctIndex,
        explanation: mcq.explanation
      };
    });

    res.json({ score, total: topic.mcqs.length, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};