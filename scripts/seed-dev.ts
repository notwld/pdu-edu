import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const permissionNames = [
    "Create Users", "Edit Users", "Delete Users",
    "Create Roles", "Edit Roles", "Delete Roles",
    "Create Permissions", "Edit Permissions", "Delete Permissions",
    "Create Test", "Edit Test", "Delete Test",
    "Create MCQ", "Edit MCQ", "Delete MCQ", "Upload MCQs",
    "View Dashboard", "View Enrollments", "View Attempts",
    "Create Courses", "Edit Courses", "Delete Courses",
    "Approve Reviews", "Reject Reviews", "View Reviews",
  ];

  for (const name of permissionNames) {
    await prisma.permission.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin" },
  });

  const studentRole = await prisma.role.upsert({
    where: { name: "student" },
    update: {},
    create: { name: "student" },
  });

  const permissions = await prisma.permission.findMany();
  await prisma.role.update({
    where: { id: adminRole.id },
    data: { permissions: { set: permissions.map((p) => ({ id: p.id })) } },
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  await prisma.user.upsert({
    where: { email: "admin@pdu.com" },
    update: { password: adminPassword, roleId: adminRole.id },
    create: {
      name: "Admin",
      email: "admin@pdu.com",
      password: adminPassword,
      roleId: adminRole.id,
    },
  });

  await prisma.user.upsert({
    where: { email: "student@pdu.com" },
    update: { password: studentPassword, roleId: studentRole.id },
    create: {
      name: "Test Student",
      email: "student@pdu.com",
      password: studentPassword,
      roleId: studentRole.id,
    },
  });

  await prisma.course.upsert({
    where: { title: "PMP Exam Prep Course" },
    update: {
      slug: "pmp-exam-prep-course",
      description: "Sample PMP prep course for local testing.",
      price: 100,
      accessibility: "Public",
      thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
      keyFeatures: ["35 PDUs", "Live instruction", "Exam prep"],
    },
    create: {
      title: "PMP Exam Prep Course",
      slug: "pmp-exam-prep-course",
      description: "Sample PMP prep course for local testing.",
      price: 100,
      accessibility: "Public",
      thumbnail: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
      keyFeatures: ["35 PDUs", "Live instruction", "Exam prep"],
      category: "Project Management",
      level: "Intermediate",
    },
  });

  console.log("Seed complete.");
  console.log("Admin:   admin@pdu.com / admin123");
  console.log("Student: student@pdu.com / student123");
  console.log("Course:  /courses/pmp-exam-prep-course");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
