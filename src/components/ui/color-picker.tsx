import * as React from "react"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ color, onChange, className }, ref) => {
    const [currentColor, setCurrentColor] = React.useState<string>(color || '#ffffff');
    
    React.useEffect(() => {
      if (color) {
        setCurrentColor(color);
      }
    }, [color]);
    
    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      setCurrentColor(newColor);
      onChange(newColor);
    };
    
    return (
      <div className={cn("flex w-10 h-10", className)} ref={ref}>
        <input
          type="color"
          value={currentColor}
          onChange={handleColorChange}
          className="w-full h-full rounded cursor-pointer border border-input"
        />
      </div>
    )
  }
)
ColorPicker.displayName = "ColorPicker"

export { ColorPicker } 