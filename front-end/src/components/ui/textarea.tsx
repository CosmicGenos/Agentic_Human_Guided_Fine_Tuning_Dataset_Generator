import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-[color,box-shadow,border-color] placeholder:text-muted-foreground/70 focus-visible:border-foreground/40 focus-visible:ring-[3px] focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
