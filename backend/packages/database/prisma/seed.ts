// ============================================
// Database Seed Script
// ============================================
// Creates an initial admin user for development.
//
// Usage: pnpm --filter @file-manager/database db:seed
//
// WHY seed?
// - Every developer needs a working account to test
// - Admin user can manage the system from day one
// - Consistent starting state across all environments
// ============================================

import { PrismaClient, Role } from '@prisma/client';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@filemanager.com' },
    update: {},
    create: {
      email: 'admin@filemanager.com',
      username: 'admin',
      passwordHash: hashSync('Admin123!', 12),
      firstName: 'System',
      lastName: 'Admin',
      role: Role.ADMIN,
      storageLimit: BigInt(10737418240), // 10GB for admin
    },
  });

  // Create a regular test user
  const user = await prisma.user.upsert({
    where: { email: 'user@filemanager.com' },
    update: {},
    create: {
      email: 'user@filemanager.com',
      username: 'testuser',
      passwordHash: hashSync('User123!', 12),
      firstName: 'Test',
      lastName: 'User',
      role: Role.USER,
    },
  });

  console.log('✅ Seeded users:');
  console.log(`   Admin: ${admin.email} (password: Admin123!)`);
  console.log(`   User:  ${user.email} (password: User123!)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
