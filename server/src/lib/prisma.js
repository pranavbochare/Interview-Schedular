import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Engine-free Prisma client (generator engineType = "client") talking to MySQL via the MariaDB driver adapter.
const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
export const prisma = new PrismaClient({ adapter });
