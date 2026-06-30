import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Camera, Loader2, Trash2, Upload, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const MIN_DIMENSION = 200;
const OUTPUT_SIZE = 512;
const WEBP_QUALITY = 0.85;

interface AvatarUploaderProps {
  userId: string;
  currentUrl?: string | null;
  displayName?: string | null;
  /** Custom trigger element. Required when mode="trigger". */
  children?: React.ReactNode;
  /** "card" renders a full drop-zone card. "trigger" wraps children and opens on click. */
  mode?: "card" | "trigger";
  /** Called after successful upload/remove with the new url (null on remove). */
  onChange?: (url: string | null) => void;
  className?: string;
}

const readImageDimensions = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = src;
  });

const cropToWebp = (src: string, pixelCrop: Area): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));
      // Higher quality downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, OUTPUT_SIZE, OUTPUT_SIZE,
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode image"))),
        "image/webp",
        WEBP_QUALITY,
      );
    };
    img.onerror = () => reject(new Error("Could not load image for crop"));
    img.src = src;
  });

const initials = (name?: string | null) => {
  if (!name) return "U";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "U";
};

const AvatarUploader = ({
  userId,
  currentUrl,
  displayName,
  children,
  mode = "card",
  onChange,
  className,
}: AvatarUploaderProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const onCropComplete = useCallback((_: Area, px: Area) => setAreaPx(px), []);

  const openPicker = () => fileInputRef.current?.click();

  const handleFiles = async (files: FileList | File[] | null) => {
    const file = files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Image must be smaller than ${(MAX_BYTES / 1024 / 1024).toFixed(0)}MB.`);
      return;
    }

    const url = URL.createObjectURL(file);
    try {
      const { width, height } = await readImageDimensions(url);
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        toast.error(`Image is too small. Minimum ${MIN_DIMENSION}×${MIN_DIMENSION}px.`);
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      toast.error("Could not read that image. Try a different file.");
      URL.revokeObjectURL(url);
      return;
    }

    setCropSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPx(null);
    setCropOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!cropSrc || !areaPx) return;
    setUploading(true);
    const previousUrl = currentUrl ?? null;
    try {
      const blob = await cropToWebp(cropSrc, areaPx);
      const path = `${userId}/avatar.webp`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp", cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", userId);
      if (dbErr) throw dbErr;

      // Invalidate every place avatar appears
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
        queryClient.invalidateQueries({ queryKey: ["nav-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["settings_profile", userId] }),
      ]);

      onChange?.(url);
      toast.success("Profile picture updated");
      setCropOpen(false);
    } catch (err: unknown) {
      // Best-effort rollback on db error not needed since storage is upsert; just notify.
      void previousUrl;
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
      setCropSrc(null);
    }
  };

  const handleRemove = async () => {
    if (!currentUrl) return;
    setRemoving(true);
    try {
      await supabase.storage.from("avatars").remove([`${userId}/avatar.webp`]);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile", userId] }),
        queryClient.invalidateQueries({ queryKey: ["nav-profile"] }),
        queryClient.invalidateQueries({ queryKey: ["settings_profile", userId] }),
      ]);

      onChange?.(null);
      toast.success("Profile picture removed");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not remove picture");
    } finally {
      setRemoving(false);
    }
  };

  const cropDialog = (
    <Dialog
      open={cropOpen}
      onOpenChange={(open) => {
        if (!open && cropSrc) {
          URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }
        setCropOpen(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust your photo</DialogTitle>
          <DialogDescription>Drag to reposition, pinch or use the slider to zoom.</DialogDescription>
        </DialogHeader>
        <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
          {cropSrc && (
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <div className="space-y-1.5 px-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Zoom</span>
            <span>{zoom.toFixed(1)}×</span>
          </div>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) => setZoom(v[0])}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => setCropOpen(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={uploading || !areaPx}>
            {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/png,image/jpeg,image/webp,image/gif,image/*"
      className="hidden"
      onChange={(e) => handleFiles(e.target.files)}
    />
  );

  if (mode === "trigger") {
    return (
      <>
        <span
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openPicker();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              openPicker();
            }
          }}
          className={cn("inline-flex cursor-pointer", className)}
        >
          {children}
        </span>
        {fileInput}
        {cropDialog}
      </>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle className="h-4 w-4 text-primary" /> Profile picture
        </CardTitle>
        <CardDescription>
          A square photo at least {MIN_DIMENSION}×{MIN_DIMENSION}px. PNG, JPG, or WebP, up to 5MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Live avatar preview */}
          <div className="relative group shrink-0">
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary via-accent to-primary opacity-60 blur-[3px]" />
            <Avatar className="relative h-24 w-24 ring-2 ring-background">
              {currentUrl ? (
                <AvatarImage src={currentUrl} alt={displayName || "Profile picture"} />
              ) : null}
              <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary/30 to-accent/30">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={openPicker}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background flex items-center justify-center hover:scale-105 active:scale-95 transition"
              aria-label="Change profile picture"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={openPicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openPicker();
              }
            }}
            className={cn(
              "flex-1 w-full cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            <Upload className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium">
              <span className="text-primary">Click to upload</span> or drag & drop
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              We'll crop, compress, and serve it as WebP.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" onClick={openPicker} disabled={uploading || removing} className="gap-2">
            <Camera className="h-4 w-4" />
            {currentUrl ? "Change photo" : "Upload photo"}
          </Button>
          {currentUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRemove}
              disabled={uploading || removing}
              className="gap-2 text-destructive hover:text-destructive"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Remove
            </Button>
          )}
        </div>

        {fileInput}
        {cropDialog}
      </CardContent>
    </Card>
  );
};

export default AvatarUploader;

