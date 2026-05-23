import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";

export async function uploadImage(file: File, bucket: string, folder: string) {
  // ❌ Block non-images
  if (!file.type.startsWith("image/")) {
    alert("Only images allowed");
    return null;
  }

  // ❌ Block HEIC (common iPhone issue)
  if (file.type === "image/heic") {
    alert("HEIC not supported. Please convert to JPG or PNG.");
    return null;
  }

  // ❌ HARD FILE SIZE LIMIT (before compression)
  if (file.size > 8 * 1024 * 1024) {
    alert("Image too large. Max 8MB allowed.");
    return null;
  }

  // 🧠 COMPRESS IMAGE (this is the IMPORTANT part)
  const compressed = await imageCompression(file, {
    maxSizeMB: 1, // final size target
    maxWidthOrHeight: 1600, // resize big images down
    useWebWorker: true,
    fileType: "image/webp", // convert to modern format
  });

  const fileName = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.webp`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(fileName, compressed, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error(error);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return data.publicUrl;
}
