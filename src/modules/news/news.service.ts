import 'server-only';
import { prisma } from "@/lib/server/prisma.server";
import { logChangelog } from "@/lib/server/changelogLogger";
import { TableNamesEnum, ChangeActionEnum } from "@/lib/shared/enums";
import logger from '@/lib/server/logger.server';
import { Prisma } from "@prisma/client";

// ------------------------------------------------------------------------------
// Get news entries
// ------------------------------------------------------------------------------

export async function getNews(skip = 0, take = 30) {
  try {
    // Fetch news entries ordered by published date, with pagination
    const newsArticles = await prisma.news.findMany({
      select: {
        newsId: true,
        title: true,
        content: true,
        links: true,
        publishedPublicAt: true,
        updatedPublicAt: true,
      },
      orderBy: { publishedPublicAt: 'desc' },
      skip,
      take,
    });

    // Return the list of news articles
    return newsArticles;

  } catch (error) {
    logger.error({ err: error }, 'getNews failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Get news by ID
// ------------------------------------------------------------------------------

export async function getNewsById(newsId: number) {
  try {
    // Fetch the news entry by its ID
    const newsArticle = await prisma.news.findUnique({
      where: { newsId: newsId },
      select: {
        newsId: true,
        title: true,
        content: true,
        links: true,
        publishedPublicAt: true,
        updatedPublicAt: true,
      },
    });

    // If no news entry found, return null
    if (!newsArticle) {
      return null;
    }

    // Return the news article
    return newsArticle;

  } catch (error) {
    logger.error({ err: error, newsId }, 'getNewsById failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Create news entry
// ------------------------------------------------------------------------------

export async function createNews(
  userId: number,
  newsData: {
    title: string;
    content: string;
    links: string[] | null;
    publishedPublicAt: string | Date;
  },
) {
  try {
    // Create a new news entry in the database
    const newNews = await prisma.news.create({
      data: {
        title: newsData.title,
        content: newsData.content,
        links: newsData.links ?? Prisma.JsonNull,
        publishedPublicAt: new Date(newsData.publishedPublicAt),
        userId: userId,
      },
    });

    // Generate a batch ID for changelog entries related to this creation
    const batchId = crypto.randomUUID();

    // Log the creation of the news entry in the changelog
    await logChangelog({
      tableName: TableNamesEnum.news,
      recordId: newNews.newsId,
      recordName: newNews.title,
      action: ChangeActionEnum.CREATED,
      field: '__created__',
      newValue: JSON.stringify(newsData),
      comment: undefined,
      batchId: batchId,
      userId: userId,
    });

    // Return the newly created news entry
    return newNews;

  } catch (error) {
    logger.error({ err: error }, 'createNews failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Update news entry
// ------------------------------------------------------------------------------

export async function updateNews(
  newsId: number,
  data: {
    title?: string;
    content?: string;
    links?: string[] | null;
    publishedPublicAt?: string | Date | null;
    updatedPublicAt?: string | Date | null;
  },
  userId: number,
) {
  try {
    // Fetch the existing news entry to compare changes
    const existingNews = await prisma.news.findUnique({
      where: { newsId: newsId },
    });

    // Proactive check
    if (!existingNews) {
      throw new Error("News entry not found");
    }

    // Compare changes
    const changedFields: {
      field: string;
      oldValue: string | undefined;
      newValue: string | undefined;
    }[] = [];

    for (const key in data) {
      const oldVal = (existingNews as Record<string, unknown>)[key];
      const newVal = (data as Record<string, unknown>)[key];
      // Use strict inequality, but also treat null/undefined consistently
      if (
        (oldVal === null || oldVal === undefined) && (newVal === null || newVal === undefined)
          ? false
          : oldVal !== newVal
      ) {
        changedFields.push({
          field: key,
          oldValue: oldVal?.toString() ?? undefined,
          newValue: newVal?.toString() ?? undefined,
        });
      }
    }

    // If no changes detected, just return existing version
    if (changedFields.length === 0) {
      return existingNews;
    }

    // Update the news entry in the database
    const updatedNews = await prisma.news.update({
      where: { newsId: newsId },
      data: {
        title: data.title,
        content: data.content,
        links: data.links ?? Prisma.JsonNull,
        publishedPublicAt: data.publishedPublicAt != null ? new Date(data.publishedPublicAt) : undefined,
        updatedPublicAt: data.updatedPublicAt != null ? new Date(data.updatedPublicAt) : undefined,
      },
    });

    // Generate a batch ID for changelog entries related to this update
    const batchId = crypto.randomUUID();

    // Log changelog entries after the update
    await Promise.all(
      changedFields.map(change =>
        logChangelog({
          tableName: TableNamesEnum.news,
          recordId: existingNews.newsId,
          recordName: existingNews.title,
          action: ChangeActionEnum.UPDATED,
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          comment: undefined,
          batchId: batchId,
          userId: userId,
        })
      )
    );

    // Return the updated news entry
    return updatedNews;

  } catch (error) {
    logger.error({ err: error }, 'updateNews failed');
    throw error;
  }
}

// ------------------------------------------------------------------------------
// Delete news entry
// ------------------------------------------------------------------------------

export async function deleteNews(newsId: number, userId: number, comment?: string) {

  try {
    // Fetch the existing news entry to log its details before deletion
    const existingNews = await prisma.news.findUnique({
      where: { newsId: newsId },
    });

    // Proactive check
    if (!existingNews) {
      throw new Error("News article not found");
    }

    // Delete the news entry from the database
    await prisma.news.delete({
      where: { newsId: newsId },
    });

    // Generate a batch ID for changelog entries related to this update
    const batchId = crypto.randomUUID();

    // Create changelog entry for deletion before deleting
    await logChangelog({
      tableName: TableNamesEnum.news,
      recordId: existingNews.newsId,
      recordName: existingNews.title,
      action: ChangeActionEnum.DELETED,
      field: '__deleted__',
      oldValue: JSON.stringify(existingNews),
      newValue: undefined,
      comment: comment?.trim() || undefined,
      batchId: batchId,
      userId: userId,
    });
    
    // Return the deleted news entry details
    return existingNews;

  } catch (error) {
    logger.error({ err: error }, 'deleteNews failed');
    throw error;
  }
}