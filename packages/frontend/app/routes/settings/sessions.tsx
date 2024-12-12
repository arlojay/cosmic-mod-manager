import Config from "@root/utils/config";
import { MetaTags } from "@root/utils/meta";
import { resJson, serverFetch } from "@root/utils/server-fetch";
import { PageUrl } from "@root/utils/urls";
import type { SessionListData } from "@shared/types/api";
import { useLoaderData } from "react-router";
import Redirect from "~/components/ui/redirect";
import { useSession } from "~/hooks/session";
import SessionsPage from "~/pages/settings/sessions/page";
import type { Route } from "./+types/sessions";

export default function _Sessions() {
    const session = useSession();
    const loggedInSessions = useLoaderData() as SessionListData[];

    if (!session?.id) return <Redirect to="/login" />;
    return <SessionsPage session={session} loggedInSessions={loggedInSessions} />;
}

export async function loader(props: Route.LoaderArgs): Promise<SessionListData[]> {
    const res = await serverFetch(props.request, "/api/auth/sessions");
    const sessions = await resJson<SessionListData[]>(res);

    return sessions || [];
}

export function meta() {
    return MetaTags({
        title: "User Sessions",
        description: "All the devices where you are logged in",
        image: `${Config.FRONTEND_URL}/icon.png`,
        url: `${Config.FRONTEND_URL}${PageUrl("settings/sessions")}`,
        suffixTitle: true,
    });
}
