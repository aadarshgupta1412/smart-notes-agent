import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type FC,
} from "react"

import { cn } from "@/lib/utils"

export interface AnimatedShinyTextProps extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          backgroundSize: `${shimmerWidth}px 100%`,
          backgroundRepeat: "no-repeat",
          backgroundImage:
            "linear-gradient(90deg, currentColor 20%, var(--shimmer-color, rgba(74,65,104,0.9)) 50%, currentColor 80%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          animation: "shiny-text 3s ease-in-out infinite",
        } as CSSProperties
      }
      className={cn(
        "text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
