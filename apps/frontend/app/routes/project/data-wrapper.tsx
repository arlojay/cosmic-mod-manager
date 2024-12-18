import { SITE_NAME_SHORT } from "@app/utils/config";
import { getProjectTypeFromName } from "@app/utils/convertors";
import { combineProjectMembers } from "@app/utils/project";
import { CapitalizeAndFormatString } from "@app/utils/string";
import type { ProjectDetailsData, ProjectListItem, ProjectVersionData } from "@app/utils/types/api";
import { Outlet, type ShouldRevalidateFunctionArgs } from "react-router";
import { useProjectData } from "~/hooks/project";
import { useTranslation } from "~/locales/provider";
import { NotFoundPage } from "~/routes/$";
import Config from "~/utils/config";
import { MetaTags, OrganizationLdJson, ProjectLdJson, UserLdJson } from "~/utils/meta";
import { resJson, serverFetch } from "~/utils/server-fetch";
import { ProjectPagePath } from "~/utils/urls";
import type { Route } from "./+types/data-wrapper";

export default function _ProjectDataWrapper() {
    const { t } = useTranslation();
    const data = useProjectData();

    if (!data?.projectData?.id) {
        const type = getProjectTypeFromName(data?.projectType);

        return (
            <NotFoundPage
                title={t.error.projectNotFound}
                description={t.error.projectNotFoundDesc(t.navbar[type], data.projectSlug)}
                linkHref={`/${data?.projectType}s`}
                linkLabel={t.project.browse[type]}
            />
        );
    }

    return <Outlet />;
}

export interface ProjectLoaderData {
    projectSlug: string | undefined;
    projectData?: ProjectDetailsData | null;
    versions?: ProjectVersionData[];
    dependencies?: {
        projects: ProjectListItem[];
        versions: ProjectVersionData[];
    };
}

export async function loader(props: Route.LoaderArgs): Promise<ProjectLoaderData> {
    const projectSlug = props.params.projectSlug;

    if (!projectSlug) {
        return {
            projectSlug: projectSlug,
        };
    }

    const [projectRes, versionsRes, depsRes] = await Promise.all([
        serverFetch(props.request, `/api/project/${projectSlug}`),
        serverFetch(props.request, `/api/project/${projectSlug}/version`),
        serverFetch(props.request, `/api/project/${projectSlug}/dependencies`),
    ]);

    if (!projectRes.ok) {
        return {
            projectSlug: projectSlug,
        };
    }

    const projectData = (await resJson<{ project: ProjectDetailsData }>(projectRes))?.project;
    const versions = await resJson<{ data: ProjectVersionData[] }>(versionsRes);
    const dependencies = (await resJson(depsRes)) as {
        projects: ProjectListItem[];
        versions: ProjectVersionData[];
    };

    return {
        projectSlug: projectSlug,
        projectData: projectData || null,
        versions: versions?.data || [],
        dependencies: dependencies || [],
    };
}

export function meta(props: Route.MetaArgs) {
    const data = props.data as ProjectLoaderData;
    const project = data?.projectData;

    if (!project) {
        return MetaTags({
            title: "Project Not Found",
            description: "The project you are looking for could not be found.",
            image: `${Config.FRONTEND_URL}/icon.png`,
            url: Config.FRONTEND_URL,
            suffixTitle: true,
        });
    }

    const allMembers = Array.from(combineProjectMembers(project.members, project.organisation?.members || []).values());
    const creator = allMembers.find((member) => member.isOwner);
    const contributors = project.members.filter((member) => !member.isOwner);

    const creatorJson = creator
        ? UserLdJson(
              {
                  ...creator,
                  id: creator.userId,
                  name: creator.userName,
                  bio: "",
              },
              {
                  role: "Creator",
              },
          )
        : {};

    const projectMembersJson = contributors.map((member) =>
        UserLdJson(
            {
                ...member,
                id: member.userId,
                name: member.userName,
                bio: "",
            },
            { role: member.role },
        ),
    );

    const orgJson = project.organisation ? OrganizationLdJson(project.organisation) : null;

    let contributorObj = {};
    if (projectMembersJson.length > 0) contributorObj = { contributor: projectMembersJson };

    let orgObj = {};
    if (orgJson) orgObj = { publisher: orgJson };

    const ldJson = ProjectLdJson(project, {
        "@context": "https://schema.org",
        creator: creatorJson,
        ...contributorObj,
        ...orgObj,
    });

    return MetaTags({
        title: `${project.name} - Cosmic Reach ${CapitalizeAndFormatString(project.type?.[0])}`,
        description: project.summary,
        siteMetaDescription: `${project.summary} - Download the Cosmic Reach ${CapitalizeAndFormatString(project.type[0])} ${project.name} by ${creator?.userName} on ${SITE_NAME_SHORT}`,
        image: project.icon || "",
        url: `${Config.FRONTEND_URL}${ProjectPagePath(project.type?.[0], project.slug)}`,
        ldJson: ldJson,
    });
}

export function shouldRevalidate({ currentParams, nextParams, nextUrl, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
    const revalidate = nextUrl.searchParams.get("revalidate") === "true";
    if (revalidate) return true;

    const currentId = currentParams.projectSlug?.toLowerCase();
    const nextId = nextParams.projectSlug?.toLowerCase();

    if (currentId === nextId) return false;

    return defaultShouldRevalidate;
}