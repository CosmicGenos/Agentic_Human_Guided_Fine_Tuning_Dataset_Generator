import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-[color,box-shadow,border-color] file:inline-flex file:h-full file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/70 focus-visible:border-foreground/40 focus-visible:ring-[3px] focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  )
}

export { Input }
