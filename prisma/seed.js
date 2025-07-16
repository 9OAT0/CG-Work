const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { student_id: '65300001' },
    update: {
      score: 12
    },
    create: {
      username: '65300001',
      student_id: '65300001',
      name: 'สมชาย ใจดี',
      status: 'นิสิต',
      role: 'user',
      year: 'ปี 1',
      dept: 'วิศวกรรมศาสตร์',
      score: 12
    }
  })

  console.log(`✅ Mocked user: ${user.name} (${user.student_id})`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })