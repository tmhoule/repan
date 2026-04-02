import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { checkRateLimit, getRateLimitHeaders, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting to prevent DoS attacks
    const rateLimitResult = checkRateLimit(request, RATE_LIMITS.SEARCH);
    
    if (rateLimitResult.limited) {
      return NextResponse.json(
        { error: "Too many search requests. Please slow down." },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }
    
    const user = await requireSession();
    const teamId = await requireTeam();
    const q = request.nextUrl.searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ tasks: [], users: [] });
    }
    
    // Limit query length to prevent performance issues
    const sanitizedQuery = q.substring(0, 100);

    // Search tasks by title and description
    const tasks = await prisma.task.findMany({
      where: {
        teamId,
        archivedAt: null,
        OR: [
          { title: { contains: sanitizedQuery, mode: "insensitive" } },
          { description: { contains: sanitizedQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        assignedTo: { select: { name: true } },
      },
      take: 10,
    });

    // Search comments (TaskActivity with type "comment")
    const commentHits = await prisma.taskActivity.findMany({
      where: {
        type: "comment",
        content: { contains: sanitizedQuery, mode: "insensitive" },
        task: { teamId, archivedAt: null },
      },
      select: {
        taskId: true,
        content: true,
        task: { select: { id: true, title: true, status: true, priority: true, assignedTo: { select: { name: true } } } },
      },
      take: 10,
    });

    // Deduplicate: merge comment-found tasks into the task results
    const taskMap = new Map(tasks.map((t) => [t.id, { ...t, matchedComment: null as string | null }]));
    for (const hit of commentHits) {
      if (!taskMap.has(hit.taskId)) {
        taskMap.set(hit.taskId, { ...hit.task, matchedComment: hit.content });
      } else if (!taskMap.get(hit.taskId)!.matchedComment) {
        taskMap.get(hit.taskId)!.matchedComment = hit.content;
      }
    }

    // Search users by name (same team)
    const teamMemberIds = (await prisma.teamMembership.findMany({
      where: { teamId },
      select: { userId: true },
    })).map((m) => m.userId);

    const users = await prisma.user.findMany({
      where: {
        id: { in: teamMemberIds },
        isActive: true,
        name: { contains: sanitizedQuery, mode: "insensitive" },
      },
      select: { id: true, name: true, avatarColor: true, role: true },
      take: 5,
    });

    const response = NextResponse.json({
      tasks: [...taskMap.values()].slice(0, 15),
      users,
    });
    
    // Add rate limit headers
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
