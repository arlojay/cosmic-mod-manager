import { SITE_NAME_SHORT } from "@app/utils/config";
import MarkdownRenderBox from "~/components/md-renderer";
import { useTranslation } from "~/locales/provider";
import Config from "~/utils/config";
import { MetaTags } from "~/utils/meta";
import { PageUrl } from "~/utils/urls";
import { descriptionSuffix } from "./layout";

const title = "Security Notice";

export default function SecurityNotice() {
    const { t } = useTranslation();

    return (
        <MarkdownRenderBox
            className="bg-card-background bright-heading p-6 pt-0 rounded-lg"
            text={`
# ${t.legal.securityNoticeTitle}
            `}
        />
    );
}

export function meta() {
    return MetaTags({
        title: title,
        description: `The ${title} of ${SITE_NAME_SHORT}, ${descriptionSuffix}.`,
        image: `${Config.FRONTEND_URL}/icon.png`,
        url: `${Config.FRONTEND_URL}${PageUrl("legal/security")}`,
        suffixTitle: true,
    });
}