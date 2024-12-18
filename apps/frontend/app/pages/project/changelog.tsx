import { DownloadAnimationContext } from "@app/components/misc/download-animation";
import PaginatedNavigation from "@app/components/misc/pagination-nav";
import { Button, buttonVariants } from "@app/components/ui/button";
import { Card } from "@app/components/ui/card";
import { LabelledCheckbox } from "@app/components/ui/checkbox";
import { ChipButton } from "@app/components/ui/chip";
import { CommandSeparator } from "@app/components/ui/command";
import { FormattedDate } from "@app/components/ui/date";
import Link from "@app/components/ui/link";
import { MultiSelect } from "@app/components/ui/multi-select";
import { releaseChannelTextColor } from "@app/components/ui/release-channel-pill";
import { TooltipProvider, TooltipTemplate } from "@app/components/ui/tooltip";
import { cn } from "@app/components/utils";
import { getGameVersionsFromValues, isExperimentalGameVersion } from "@app/utils/config/game-versions";
import { getLoaderFromString } from "@app/utils/convertors";
import { CapitalizeAndFormatString } from "@app/utils/string";
import { VersionReleaseChannel } from "@app/utils/types";
import type { ProjectDetailsData, ProjectVersionData } from "@app/utils/types/api";
import { ChevronDownIcon, DownloadIcon, FilterIcon, FlaskConicalIcon, XCircleIcon } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import MarkdownRenderBox from "~/components/md-renderer";
import { useProjectData } from "~/hooks/project";
import useTheme from "~/hooks/theme";
import { useTranslation } from "~/locales/provider";
import { UserProfilePath, VersionPagePath } from "~/utils/urls";

export default function VersionChangelogs() {
    const ctx = useProjectData();

    if (!ctx.projectData || !ctx.allProjectVersions?.length) return null;
    return <ChangelogsList projectType={ctx.projectType} projectData={ctx.projectData} versionsList={ctx.allProjectVersions} />;
}

interface FilterItems {
    loaders: string[];
    gameVersions: string[];
    releaseChannels: string[];
}

interface ListProps {
    projectData: ProjectDetailsData;
    versionsList: ProjectVersionData[];
    projectType: string;
}

function ChangelogsList({ projectType, projectData, versionsList }: ListProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const pageSearchParamKey = "page";
    const [urlSearchParams] = useSearchParams();
    const perPageLimit = 20;
    const page = urlSearchParams.get(pageSearchParamKey) || "1";
    const pagesCount = Math.ceil((versionsList?.length || 0) / perPageLimit);
    const activePage = Number.parseInt(page) <= pagesCount ? Number.parseInt(page) : 1;

    const [filters, setFilters] = useState<FilterItems>({ loaders: [], gameVersions: [], releaseChannels: [] });
    const [showAllVersions, setShowAllVersions] = useState(false);

    const { show: showDownloadAnimation } = useContext(DownloadAnimationContext);

    const Pagination =
        (versionsList.length || 0) > perPageLimit ? (
            <PaginatedNavigation pagesCount={pagesCount} activePage={activePage} searchParamKey={pageSearchParamKey} />
        ) : null;

    const visibleItems = useMemo(() => {
        const filteredItems: ProjectVersionData[] = [];

        for (const version of versionsList) {
            if (filters.loaders.length) {
                let loaderMatch = false;
                for (const loaderFilter of filters.loaders) {
                    if (version.loaders.includes(loaderFilter)) {
                        loaderMatch = true;
                        break;
                    }
                }

                if (!loaderMatch) continue;
            }

            if (filters.gameVersions.length) {
                let versionMatch = false;
                for (const versionFilter of filters.gameVersions) {
                    if (version.gameVersions.includes(versionFilter)) {
                        versionMatch = true;
                        break;
                    }
                }

                if (!versionMatch) continue;
            }

            if (filters.releaseChannels.length) {
                if (!filters.releaseChannels.includes(version.releaseChannel)) continue;
            }

            filteredItems.push(version);
        }

        return filteredItems.slice((activePage - 1) * perPageLimit, activePage * perPageLimit);
    }, [activePage, filters, versionsList]);

    const availableReleaseChannels: string[] = [];
    for (const version of versionsList) {
        if (!availableReleaseChannels.includes(version.releaseChannel)) {
            availableReleaseChannels.push(version.releaseChannel);
        }
    }

    const resetFilters = () => {
        setFilters({ loaders: [], gameVersions: [], releaseChannels: [] });
    };

    const loadersFilterVisible = projectData.loaders.length > 1;
    const gameVersionsFilterVisible = projectData.gameVersions.length > 1;
    const releaseChannelsFilterVisible = availableReleaseChannels.length > 1;

    const hasSnapshotVersion = getGameVersionsFromValues(projectData.gameVersions).some((ver) =>
        isExperimentalGameVersion(ver.releaseType),
    );
    const gameVersionOptions = getGameVersionsFromValues(projectData.gameVersions)
        .filter((ver) => showAllVersions || !isExperimentalGameVersion(ver.releaseType))
        .map((ver) => ({ label: ver.label, value: ver.value }));

    return (
        <>
            {loadersFilterVisible || gameVersionsFilterVisible || releaseChannelsFilterVisible ? (
                <div className="w-full flex flex-wrap items-center justify-start gap-2">
                    {loadersFilterVisible ? (
                        <MultiSelect
                            selectedValues={filters.loaders}
                            options={projectData.loaders.map((loader) => ({
                                label: CapitalizeAndFormatString(loader) || "",
                                value: loader,
                            }))}
                            onValueChange={(values: string[]) => {
                                setFilters((prev) => ({ ...prev, loaders: values }));
                            }}
                            searchBox={false}
                            defaultMinWidth={false}
                            customTrigger={
                                <Button variant="secondary-inverted">
                                    <FilterIcon className="w-btn-icon h-btn-icon" />
                                    Loaders
                                    <ChevronDownIcon className="w-btn-icon-md h-btn-icon-md text-extra-muted-foreground" />
                                </Button>
                            }
                        />
                    ) : null}

                    {gameVersionsFilterVisible ? (
                        <MultiSelect
                            searchBox={projectData.gameVersions.length > 5}
                            defaultMinWidth={false}
                            selectedValues={filters.gameVersions}
                            options={gameVersionOptions}
                            onValueChange={(values: string[]) => {
                                setFilters((prev) => ({ ...prev, gameVersions: values }));
                            }}
                            customTrigger={
                                <Button variant="secondary-inverted">
                                    <FilterIcon className="w-btn-icon h-btn-icon" />
                                    {t.search.gameVersions}
                                    <ChevronDownIcon className="w-btn-icon-md h-btn-icon-md text-extra-muted-foreground" />
                                </Button>
                            }
                            fixedFooter={
                                hasSnapshotVersion ? (
                                    <>
                                        <CommandSeparator />
                                        <LabelledCheckbox
                                            checked={showAllVersions}
                                            onCheckedChange={(checked) => setShowAllVersions(checked === true)}
                                            className="text-extra-muted-foreground pr-2 pl-3.5 my-1"
                                        >
                                            {t.form.showAllVersions}
                                        </LabelledCheckbox>
                                    </>
                                ) : null
                            }
                        />
                    ) : null}

                    {releaseChannelsFilterVisible ? (
                        <MultiSelect
                            searchBox={false}
                            defaultMinWidth={false}
                            selectedValues={[...filters.releaseChannels]}
                            options={availableReleaseChannels.map((channel) => ({
                                label: CapitalizeAndFormatString(channel) || "",
                                value: channel,
                            }))}
                            onValueChange={(values: string[]) => {
                                setFilters((prev) => ({ ...prev, releaseChannels: values }));
                            }}
                            customTrigger={
                                <Button variant="secondary-inverted">
                                    <FilterIcon className="w-btn-icon h-btn-icon" />
                                    {t.search.channels}
                                    <ChevronDownIcon className="w-btn-icon-md h-btn-icon-md text-extra-muted-foreground" />
                                </Button>
                            }
                        />
                    ) : null}
                </div>
            ) : null}

            {filters.loaders.length + filters.gameVersions.length + filters.releaseChannels.length > 0 ? (
                <div className="w-full flex items-center justify-start flex-wrap gap-x-2 gap-y-1">
                    {filters.loaders.length + filters.gameVersions.length + filters.releaseChannels.length > 1 ? (
                        <ChipButton onClick={resetFilters}>
                            {t.search.clearFilters}
                            <XCircleIcon className="w-btn-icon-sm h-btn-icon-sm" />
                        </ChipButton>
                    ) : null}

                    {filters.releaseChannels.map((channel) => (
                        <ChipButton
                            key={channel}
                            className={releaseChannelTextColor(channel as VersionReleaseChannel)}
                            onClick={() => {
                                setFilters((prev) => ({ ...prev, releaseChannels: prev.releaseChannels.filter((c) => c !== channel) }));
                            }}
                        >
                            {CapitalizeAndFormatString(channel)}
                            <XCircleIcon className="w-btn-icon-sm h-btn-icon-sm" />
                        </ChipButton>
                    ))}

                    {getGameVersionsFromValues(filters.gameVersions).map((version) => (
                        <ChipButton
                            key={version.value}
                            onClick={() => {
                                setFilters((prev) => ({ ...prev, gameVersions: prev.gameVersions.filter((v) => v !== version.value) }));
                            }}
                        >
                            {version.label}
                            <XCircleIcon className="w-btn-icon-sm h-btn-icon-sm" />
                        </ChipButton>
                    ))}

                    {filters.loaders.map((loader) => {
                        const loaderData = getLoaderFromString(loader);
                        if (!loaderData) return null;
                        const accentForeground = loaderData.metadata?.accent?.foreground;

                        return (
                            <ChipButton
                                key={loader}
                                onClick={() => {
                                    setFilters((prev) => ({ ...prev, loaders: prev.loaders.filter((l) => l !== loader) }));
                                }}
                                style={{
                                    color: accentForeground
                                        ? theme === "dark"
                                            ? accentForeground?.dark
                                            : accentForeground?.light
                                        : "hsla(var(--muted-foreground))",
                                }}
                            >
                                {CapitalizeAndFormatString(loader)}
                                <XCircleIcon className="w-btn-icon-sm h-btn-icon-sm" />
                            </ChipButton>
                        );
                    })}
                </div>
            ) : null}

            <Card className="p-5 w-full flex flex-col items-start justify-start">
                {visibleItems.map((version) => {
                    return (
                        <div key={version.id} className="w-full pl-7 mb-4 relative dark:text-muted-foreground">
                            <div className="w-full flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                                <div className="flex flex-wrap gap-x-1.5 items-baseline justify-start">
                                    <ChangelogBar releaseChannel={version.releaseChannel} />
                                    {version.releaseChannel === VersionReleaseChannel.DEV ? (
                                        <TooltipProvider>
                                            <TooltipTemplate content="Dev release!" className="font-normal">
                                                <FlaskConicalIcon className="w-btn-icon-md h-btn-icon-md text-danger-foreground cursor-help" />
                                            </TooltipTemplate>
                                        </TooltipProvider>
                                    ) : null}

                                    <h2 className="leading-tight">
                                        <Link
                                            to={VersionPagePath(projectType, projectData.slug, version.slug)}
                                            className="text-[1.25rem] font-bold flex items-baseline gap-2"
                                        >
                                            {version.title}
                                        </Link>
                                    </h2>
                                    <span>
                                        by{" "}
                                        <Link to={UserProfilePath(version.author.userName)} className="link_blue hover:underline">
                                            {version.author.userName}
                                        </Link>
                                    </span>
                                    <span>
                                        on{" "}
                                        <FormattedDate
                                            date={version.datePublished}
                                            timestamp_template="${month} ${day}, ${year}"
                                            useShortMonthNames
                                        />
                                    </span>
                                </div>

                                {version.primaryFile?.url ? (
                                    <a
                                        href={version.primaryFile.url}
                                        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                                        onClick={showDownloadAnimation}
                                    >
                                        <DownloadIcon className="w-btn-icon h-btn-icon" />
                                        {t.common.download}
                                    </a>
                                ) : null}
                            </div>
                            {version.changelog ? (
                                <MarkdownRenderBox addIdToHeadings={false} text={version.changelog} className="mr-2" />
                            ) : null}
                        </div>
                    );
                })}
            </Card>

            {Pagination}
        </>
    );
}

function ChangelogBar({ releaseChannel }: { releaseChannel: VersionReleaseChannel }) {
    return (
        <>
            <div
                className={cn(
                    "absolute w-1 h-full bg-current top-2.5 left-2 rounded-full",
                    releaseChannel === VersionReleaseChannel.RELEASE
                        ? "text-blue-500 dark:text-blue-400"
                        : releaseChannel === VersionReleaseChannel.BETA
                          ? "text-orange-500 dark:text-orange-400"
                          : releaseChannel === VersionReleaseChannel.ALPHA || releaseChannel === VersionReleaseChannel.DEV
                            ? "text-danger-background"
                            : "",
                )}
            >
                <span className="absolute top-0 left-[-0.5rem] w-4 h-4 rounded-full bg-current translate-x-[0.125rem]" />
            </div>
        </>
    );
}