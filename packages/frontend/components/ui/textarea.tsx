import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
    return <textarea className={cn("input_box_styles flex min-h-20 w-full", className)} ref={ref} {...props} />;
});
Textarea.displayName = "Textarea";

export { Textarea };
