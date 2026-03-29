import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { gradientTrack?: boolean }
>(({ className, gradientTrack = true, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex w-full touch-none select-none items-center", className)}
    {...props}
  >
    <SliderPrimitive.Track className={cn(
      "relative h-2.5 sm:h-2 w-full grow overflow-hidden rounded-full",
      gradientTrack ? "bg-muted" : "bg-secondary"
    )}>
      <SliderPrimitive.Range className={cn("absolute h-full", gradientTrack ? "bg-gradient-to-r from-orange-500 to-green-500" : "bg-primary")} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-6 w-6 sm:h-5 sm:w-5 rounded-full border-2 border-green-500 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-md" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
