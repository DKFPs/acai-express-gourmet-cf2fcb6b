import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { productService } from "@/services/product.service";
import { cn } from "@/lib/utils";

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

interface ImageUploadProps {
  /** Caminho do arquivo no storage. */
  value: string | null;
  previewUrl: string | null;
  onChange: (path: string | null, previewUrl: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, previewUrl, onChange, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }
    setUploading(true);
    try {
      const path = await productService.uploadImage(file);
      const signed = await productService.signedUrl(path);
      onChange(path, signed);
      toast.success("Foto enviada");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no upload da imagem");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/30",
          uploading && "opacity-60",
        )}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Foto do produto" className="h-full w-full object-cover" />
        ) : uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {value ? "Trocar foto" : "Enviar foto"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => onChange(null, null)}
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP · até 5MB</p>
      </div>
    </div>
  );
}
