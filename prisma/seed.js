import prisma from "../src/config/db.js";

const dsaTopics = [
  { slug: "dsa-arrays", name: "DSA - Arrays" },
  { slug: "dsa-linked-list", name: "DSA - Linked List" },
  { slug: "dsa-stack-queue", name: "DSA - Stack & Queue" },
  { slug: "dsa-trees", name: "DSA - Trees" },
  { slug: "dsa-graphs-dp", name: "DSA - Graphs & DP" },
];

async function main() {
  await prisma.userTopic.deleteMany({});
  await prisma.topic.deleteMany({});
  for (const t of dsaTopics) {
    await prisma.topic.create({ data: t });
  }
  console.log("✅ Seeded 5 DSA topics");
}
main().finally(() => prisma.$disconnect());
