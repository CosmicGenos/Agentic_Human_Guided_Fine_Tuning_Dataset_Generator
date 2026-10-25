import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="bottom-right"
    icons={{
      success: <CircleCheckIcon className="size-4 text-sage" />,
      info: <InfoIcon className="size-4 text-dusty" />,
      warning: <TriangleAlertIcon className="size-4 text-amber" />,
      error: <OctagonXIcon className="size-4 text-clay" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
    }}
    style={
      {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
        "--border-radius": "var(--radius-lg)",
      } as React.CSSProperties
    }
    {...props}
  />
)

export { Toaster }
