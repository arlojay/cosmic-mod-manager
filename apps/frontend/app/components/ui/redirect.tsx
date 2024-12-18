import { useEffect } from "react";
import { useTranslation } from "~/locales/provider";
import { PageUrl } from "~/utils/urls";

export default function Redirect({ to }: { to: string }) {
    const { t } = useTranslation();

    useEffect(() => {
        window.location.href = new URL(PageUrl(to), window.location.href).href;
    }, []);

    return (
        <div className="w-full grid place-items-center py-8 gap-4">
            <span className="text-muted-foreground">{t.common.redirecting}</span>
        </div>
    );
}