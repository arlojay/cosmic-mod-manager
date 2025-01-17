import { EnvironmentSupport, ProjectPublishingStatus, ProjectVisibility } from "@app/utils/types";
import type { EnqueuedTask } from "meilisearch";
import { GetManyProjects_Details, type GetProject_Details_ReturnType } from "~/db/project_item";
import { isProjectIndexable } from "~/routes/project/utils";
import meilisearch from "~/services/meilisearch";
import prisma from "~/services/prisma";
import { projectGalleryFileUrl, projectIconUrl } from "~/utils/urls";

export const projectSearchNamespace = "projects";
const SYNC_BATCH_SIZE = 1000;

export async function InitialiseSearchDb() {
    try {
        const index = meilisearch.index(projectSearchNamespace);

        // Setup the search index
        await AwaitEnqueuedTasks([
            await index.updateFilterableAttributes([
                "categories",
                "loaders",
                "type",
                "gameVersions",
                "openSource",
                "clientSide",
                "serverSide",
            ]),
            await index.updateSortableAttributes(["downloads", "followers", "dateUpdated", "datePublished"]),
            await index.updateRankingRules(["sort", "words", "typo", "proximity", "attribute"]),
            await index.updateSearchableAttributes(["name", "slug", "summary", "author"]),

            // Delete existing documents
            await index.deleteAllDocuments(),
        ]);

        let cursor = null;
        while (true) {
            cursor = await _SyncBatch(cursor);
            if (!cursor) break;
        }
    } catch (error) {
        console.error(error);
    }
}

export interface ProjectSearchDocument {
    id: string;
    name: string;
    slug: string;
    iconUrl: string | null;
    loaders: string[];
    type: string[];
    gameVersions: string[];
    categories: string[];
    featuredCategories: string[];
    clientSide: boolean;
    serverSide: boolean;
    summary: string;
    downloads: number;
    followers: number;
    datePublished: Date;
    dateUpdated: Date;
    openSource: boolean;
    author: string;
    featured_gallery: string | null;
    color: string | null;
    isOrgOwned: boolean;
    visibility: ProjectVisibility;
}

async function _SyncBatch(cursor: null | string) {
    try {
        const index = meilisearch.index(projectSearchNamespace);

        const _Projects_Ids = await prisma.project.findMany({
            where: {
                visibility: {
                    in: [ProjectVisibility.LISTED, ProjectVisibility.ARCHIVED],
                },
                status: ProjectPublishingStatus.APPROVED,
            },
            cursor: cursor ? { id: cursor } : undefined,
            take: SYNC_BATCH_SIZE,
            skip: cursor ? 1 : 0,
            select: {
                id: true,
            },
        });

        if (_Projects_Ids.length === 0) return;

        const Projects = await GetManyProjects_Details(_Projects_Ids.map((project) => project.id));
        const formattedProjectsData: ProjectSearchDocument[] = [];

        for (const Project of Projects) {
            if (!Project) continue;
            if (!isProjectIndexable(Project.visibility, Project.status)) continue;

            formattedProjectsData.push(FormatSearchDocument(Project));
        }

        await AwaitEnqueuedTask(await index.addDocuments(formattedProjectsData));

        if (formattedProjectsData.length < SYNC_BATCH_SIZE) return null;
        return _Projects_Ids.at(-1)?.id;
    } catch (error) {
        console.error(error);
    }
}

export function FormatSearchDocument<T extends NonNullable<GetProject_Details_ReturnType>>(Project: T) {
    const author = Project.organisation?.slug || Project.team.members?.[0]?.user?.userName;
    const FeaturedGalleryItem = Project.gallery.find((item) => item.featured === true);
    const featured_gallery = FeaturedGalleryItem ? projectGalleryFileUrl(Project.id, FeaturedGalleryItem.thumbnailFileId) : null;

    return {
        id: Project.id,
        name: Project.name,
        slug: Project.slug,
        iconUrl: projectIconUrl(Project.id, Project.iconFileId),
        loaders: Project.loaders,
        type: Project.type,
        gameVersions: Project.gameVersions,
        categories: Project.categories,
        featuredCategories: Project.featuredCategories,
        summary: Project.summary,
        downloads: Project.downloads,
        followers: Project.followers,
        datePublished: Project.datePublished,
        dateUpdated: Project.dateUpdated,
        openSource: !!Project.projectSourceUrl,
        clientSide: Project.clientSide === EnvironmentSupport.OPTIONAL || Project.clientSide === EnvironmentSupport.REQUIRED,
        serverSide: Project.serverSide === EnvironmentSupport.OPTIONAL || Project.serverSide === EnvironmentSupport.REQUIRED,
        featured_gallery: featured_gallery,
        color: Project.color,
        author: author,
        isOrgOwned: !!Project.organisation?.slug,
        visibility: Project.visibility as ProjectVisibility,
    };
}

const PROCESSING_TASK_STATUSES = ["enqueued", "processing"];

export async function AwaitEnqueuedTask(task: EnqueuedTask) {
    const TIMEOUT = 10_000;
    let timeElapsed = 0;

    while (true) {
        const UpdatedTask = await meilisearch.getTask(task.taskUid);

        if (PROCESSING_TASK_STATUSES.includes(UpdatedTask.status)) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            timeElapsed += 100;
        } else break;

        if (timeElapsed >= TIMEOUT) {
            console.error(`Meilisearch Task :${task.taskUid} took too long to process. Timed out after ${TIMEOUT}ms`);
            break;
        }
    }
}

export async function AwaitEnqueuedTasks(tasks: EnqueuedTask[], TIMEOUT_ms = 30_000) {
    let timeElapsed = 0;
    const TaskdIds: number[] = [];
    for (const task of tasks) {
        if (task.taskUid) TaskdIds.push(task.taskUid);
    }

    while (true) {
        const UpdatedTasks = await meilisearch.getTasks({ uids: TaskdIds });
        const anyProcessingTask = UpdatedTasks.results.some((task) => PROCESSING_TASK_STATUSES.includes(task.status));

        if (anyProcessingTask) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            timeElapsed += 100;
        } else break;

        if (timeElapsed >= TIMEOUT_ms) {
            console.error(`Meilisearch Tasks took too long to process. Timed out after ${TIMEOUT_ms}ms`);
            break;
        }
    }
}
