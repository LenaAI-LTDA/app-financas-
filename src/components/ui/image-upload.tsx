import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Upload, X } from "lucide-react";

export interface ImageUploadProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onImageChange?: (file: File | null) => void;
  previewUrl?: string;
}

const ImageUpload = React.forwardRef<HTMLInputElement, ImageUploadProps>(
  ({ className, onImageChange, previewUrl: initialPreviewUrl, ...props }, ref) => {
    const [previewUrl, setPreviewUrl] = React.useState<string | null>(initialPreviewUrl || null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (initialPreviewUrl) {
        setPreviewUrl(initialPreviewUrl);
      }
    }, [initialPreviewUrl]);

    const handleClick = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
        if (onImageChange) {
          onImageChange(file);
        }
      }

      if (props.onChange) {
        props.onChange(e);
      }
    };

    const handleRemove = (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (onImageChange) {
        onImageChange(null);
      }
    };

    return (
      <div className={cn("flex flex-col items-center", className)}>
        <div
          onClick={handleClick}
          className={cn(
            "flex flex-col items-center justify-center w-full h-32 p-2 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
            previewUrl ? "border-primary" : "border-input"
          )}
        >
          {previewUrl ? (
            <div className="relative w-full h-full">
              <img
                src={previewUrl}
                alt="Preview"
                className="object-contain w-full h-full"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-0 right-0"
                onClick={handleRemove}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Clique para fazer upload de uma imagem
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={(node) => {
            if (ref) {
              if (typeof ref === 'function') {
                ref(node);
              } else {
                ref.current = node;
              }
            }
            fileInputRef.current = node;
          }}
          onChange={handleFileChange}
          {...props}
        />
      </div>
    );
  }
);

ImageUpload.displayName = "ImageUpload";

export { ImageUpload }; 