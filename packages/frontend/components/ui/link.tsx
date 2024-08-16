import { cn, isCurrLinkActive } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { buttonVariants } from "./button";

type ButtonLinkProps = {
    url: string;
    children: React.ReactNode;
    className?: string;
    exactTailMatch?: boolean;
    activityIndicator?: boolean;
    tabIndex?: number;
    onClick?: () => void;
    activeClassName?: string;
};

export const ButtonLink = ({
    url,
    children,
    className,
    exactTailMatch,
    activityIndicator = true,
    activeClassName,
    ...props
}: ButtonLinkProps) => {
    const location = useLocation();

    return (
        <Link
            to={url}
            className={cn(
                "bg_hover_stagger w-full h-10 px-4 py-2 font-medium text-muted-foreground flex items-center justify-start gap-2 whitespace-nowrap hover:bg-shallow-background/75",
                isCurrLinkActive(url, location.pathname, exactTailMatch) && activityIndicator && "bg-shallow-background text-foreground",
                isCurrLinkActive(url, location.pathname, exactTailMatch) && `active ${activeClassName}`,
                className,
            )}
            {...props}
        >
            {children}
        </Link>
    );
};

interface VariantLinkProps extends VariantProps<typeof buttonVariants> {
    children: React.ReactNode;
    url: string;
    className?: string;
}

export const VariantButtonLink = React.forwardRef<HTMLAnchorElement, VariantLinkProps>(
    ({ children, url, className, variant = "secondary", size = "default" }, ref) => {
        return (
            <Link
                to={url}
                ref={ref}
                className={cn("flex items-center justify-center gap-2 font-medium", buttonVariants({ variant, size }), className)}
            >
                {children}
            </Link>
        );
    },
);
