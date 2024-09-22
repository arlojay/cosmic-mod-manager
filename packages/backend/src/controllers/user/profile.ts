import type { ContextUserSession } from "@/../types";
import { addToUsedApiRateLimit } from "@/middleware/rate-limiter";
import prisma from "@/services/prisma";
import { getUserSessionFromCtx, inferProjectType, isProjectAccessibleToCurrSession } from "@/utils";
import httpCode from "@/utils/http";
import { getAppropriateProjectIconUrl } from "@/utils/urls";
import { CHARGE_FOR_SENDING_INVALID_DATA } from "@shared/config/rate-limit-charges";
import { formatUserName } from "@shared/lib/utils";
import type { profileUpdateFormSchema } from "@shared/schemas/settings";
import { type LinkedProvidersListData, type ProjectPublishingStatus, ProjectVisibility } from "@shared/types";
import type { ProjectListItem } from "@shared/types/api";
import type { UserProfileData } from "@shared/types/api/user";
import type { Context } from "hono";
import type { z } from "zod";
import { getFilesFromId } from "../project/utils";

export const getUserProfileData = async (ctx: Context, userSession: ContextUserSession | undefined, slug: string) => {
    const user = await prisma.user.findFirst({
        where: {
            OR: [{ id: slug }, { lowerCaseUserName: slug.toLowerCase() }],
        },
    });

    if (!user) return ctx.json({ success: false, message: "user not found" }, httpCode("not_found"));

    const dataObj: UserProfileData = {
        id: user.id,
        name: user.name,
        userName: user.userName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        dateJoined: user.dateJoined,
    };

    return ctx.json({ success: true, user: dataObj }, httpCode("ok"));
};

export const updateUserProfile = async (ctx: Context, profileData: z.infer<typeof profileUpdateFormSchema>) => {
    const userSession = getUserSessionFromCtx(ctx);
    if (!userSession) return ctx.json({}, httpCode("bad_request"));

    profileData.userName = formatUserName(profileData.userName);
    profileData.name = formatUserName(profileData.name, " ");

    const existingUserWithSameUserName =
        profileData.userName.toLowerCase() === userSession.userName.toLowerCase()
            ? null
            : !!(
                  await prisma.user.findUnique({
                      where: {
                          lowerCaseUserName: profileData.userName.toLowerCase(),
                          NOT: [{ id: userSession.id }],
                      },
                  })
              )?.id;

    if (existingUserWithSameUserName) return ctx.json({ success: false, message: "Username already taken" }, httpCode("bad_request"));

    let avatarUrl = userSession.avatarUrl;
    if (userSession.avatarUrlProvider !== profileData.avatarUrlProvider) {
        const authAccount = await prisma.authAccount.findFirst({
            where: {
                userId: userSession.id,
                providerName: profileData.avatarUrlProvider,
            },
        });

        if (!authAccount?.id) {
            await addToUsedApiRateLimit(ctx, CHARGE_FOR_SENDING_INVALID_DATA);
            return ctx.json({ success: false, message: "Invalid profile provider" }, httpCode("bad_request"));
        }

        avatarUrl = authAccount?.avatarUrl;
    }

    const updatedUser = await prisma.user.update({
        where: {
            id: userSession.id,
        },
        data: {
            name: profileData.name,
            userName: profileData.userName,
            lowerCaseUserName: profileData.userName.toLowerCase(),
            avatarUrlProvider: profileData.avatarUrlProvider,
            avatarUrl: avatarUrl,
        },
    });

    return ctx.json({ success: true, message: "Profile updated successfully", profileData }, httpCode("ok"));
};

export const getLinkedAuthProviders = async (ctx: Context, userSession: ContextUserSession) => {
    const linkedProviders = await prisma.authAccount.findMany({
        where: {
            userId: userSession.id,
        },
    });

    const providersList: LinkedProvidersListData[] = [];
    for (const provider of linkedProviders) {
        providersList.push({
            id: provider.id,
            providerName: provider.providerName,
            providerAccountId: provider.providerAccountId,
            providerAccountEmail: provider.providerAccountEmail,
            avatarImageUrl: provider.avatarUrl,
        });
    }

    return ctx.json({ providers: providersList }, httpCode("ok"));
};

export const getAllVisibleProjects = async (
    ctx: Context,
    userSession: ContextUserSession | undefined,
    slug: string,
    listedProjectsOnly: boolean,
) => {
    const user = await prisma.user.findFirst({
        where: {
            OR: [{ id: slug }, { lowerCaseUserName: slug.toLowerCase() }],
        },
    });
    if (!user) return ctx.json({ success: false, message: "user not found" }, httpCode("not_found"));

    const list = await prisma.teamMember.findMany({
        where: {
            userId: user.id,
            accepted: true,
        },
        select: {
            team: {
                select: {
                    project: {
                        select: {
                            id: true,
                            slug: true,
                            name: true,
                            summary: true,
                            iconFileId: true,
                            downloads: true,
                            followers: true,
                            dateUpdated: true,
                            datePublished: true,
                            status: true,
                            visibility: true,
                            clientSide: true,
                            serverSide: true,
                            featuredCategories: true,
                            categories: true,
                            gameVersions: true,
                            loaders: true,
                            team: {
                                select: {
                                    members: {
                                        where: {
                                            userId: userSession?.id,
                                        },
                                        select: {
                                            id: true,
                                            userId: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: { team: { project: { downloads: "desc" } } },
    });

    if (!list) return ctx.json({ success: true, projects: [] }, httpCode("ok"));

    const iconFileIds: string[] = [];
    for (const item of list) {
        const project = item.team.project;
        if (project?.iconFileId) iconFileIds.push(project.iconFileId);
    }
    const iconFilesMap = await getFilesFromId(iconFileIds);

    const projectListData: ProjectListItem[] = [];
    for (const item of list) {
        const project = item.team.project;
        if (!project) continue;
        if (
            listedProjectsOnly === true &&
            ![ProjectVisibility.LISTED, ProjectVisibility.ARCHIVED].includes(project.visibility as ProjectVisibility)
        ) {
            continue;
        }
        if (!isProjectAccessibleToCurrSession(project.visibility, project.status, userSession?.id, project.team.members)) continue;
        const projectIconUrl = getAppropriateProjectIconUrl(iconFilesMap.get(project?.iconFileId || ""), project.slug);

        projectListData.push({
            id: project.id,
            slug: project.slug,
            name: project.name,
            summary: project.summary,
            type: inferProjectType(project.loaders),
            status: project.status as ProjectPublishingStatus,
            icon: projectIconUrl,
            downloads: project.downloads,
            followers: project.followers,
            dateUpdated: project.dateUpdated,
            datePublished: project.datePublished,
            featuredCategories: project.featuredCategories,
            categories: project.categories,
            gameVersions: project.gameVersions,
            loaders: project.loaders,
        });
    }

    return ctx.json({ success: true, projects: projectListData }, httpCode("ok"));
};
