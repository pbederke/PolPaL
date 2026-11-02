import 'server-only';
import { TableNameAboutEnum } from "@prisma/client";
import { prisma } from "@/lib/server/prisma.server";
import logger from "@/lib/server/logger.server";

// ------------------------------------------------------------------------------
// GET
// ------------------------------------------------------------------------------
export async function getAbout() {
  try {
    const aboutEntries = await prisma.about.findMany();
    return aboutEntries;
  } catch (error) {
    logger.error({ err: error }, 'getAbout failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// CREATE
// ------------------------------------------------------------------------------

export async function createAbout(
  data: {
    tableName: TableNameAboutEnum;
    name: string | null;
    affiliation: string | null;
    time: string | null;
    url: string | null;
    funding: string | null;
    comment: string | null;
  },
) {
  try {

    // Create the about entry
    const createdAbout = await prisma.about.create({
      data: {
        ...data,
      },
    });

    // Return the created about entry
    return createdAbout;

  } catch (error) {
    logger.error({ err: error }, 'createAbout failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------------------------
export async function updateAbout(
  id: number,
  data: {
    name: string | null;
    affiliation: string | null;
    time: string | null;
    url: string | null;
    funding: string | null;
    comment: string | null;
  },
) {
  try {
    const updatedAbout = await prisma.about.update({
      where: { id },
      data,
    });
    return updatedAbout;
  } catch (error) {
    logger.error({ err: error }, 'updateAbout failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// DELETE
// ------------------------------------------------------------------------------
export async function deleteAbout(id: number) {
  try {
    await prisma.about.delete({
      where: { id },
    });
  } catch (error) {
    logger.error({ err: error }, 'deleteAbout failed');
    throw error;
  }
}