import Config from "@root/utils/config";
import { MetaTags } from "@root/utils/meta";
import { PageUrl } from "@root/utils/urls";
import { SITE_NAME_SHORT } from "@shared/config";
import MarkdownRenderBox from "~/components/layout/md-editor/render-md";
import { useTranslation } from "~/locales/provider";
import { descriptionSuffix } from "./layout";

const title = "Terms of Use";

export default function TermsOfUse() {
    const { t } = useTranslation();

    return (
        <MarkdownRenderBox
            className="bg-card-background bright-heading p-6 pt-0 rounded-lg"
            text={`
# ${t.legal.termsTitle}
            `}
        />
    );
}

export function meta() {
    return MetaTags({
        title: title,
        description: `The ${title} of ${SITE_NAME_SHORT}, ${descriptionSuffix}.`,
        image: `${Config.FRONTEND_URL}/icon.png`,
        url: `${Config.FRONTEND_URL}${PageUrl("legal/terms")}`,
        suffixTitle: true,
    });
}
