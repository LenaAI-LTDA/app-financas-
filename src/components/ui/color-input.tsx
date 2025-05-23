import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const ColorInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    const [color, setColor] = React.useState<string>(props.value as string || '#ffffff');
    
    React.useEffect(() => {
      if (props.value) {
        setColor(props.value as string);
      }
    }, [props.value]);
    
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setColor(e.target.value);
      if (props.onChange) {
        props.onChange(e);
      }
    };
    
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={handleColorChange}
          className={cn(
            "h-8 w-10 rounded cursor-pointer border border-input",
            className
          )}
          {...props}
          ref={ref}
        />
        <input
          type="text"
          value={color}
          onChange={handleColorChange}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
          ref={ref}
        />
      </div>
    )
  }
)
ColorInput.displayName = "ColorInput"

export { ColorInput } 