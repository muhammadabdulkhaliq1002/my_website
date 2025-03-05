import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { PrismaClient } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
declare global {
  var prisma: PrismaClient | undefined
}

console.log("DATABASE_URL:", process.env.DATABASE_URL)

const prisma = global.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

prisma.$connect()
  .then(() => {
    console.log("Prisma connected successfully")
  })
  .catch((err) => {
    console.error("Error connecting to Prisma:", err)
  })

export { prisma }
