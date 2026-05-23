import { supabase } from "@/lib/supabase";

export async function uploadImage(
  file: File,
  bucket: string,
  folder = "",
) {

  const fileExt = file.name.split(".").pop();

  const fileName =
    `${Date.now()}-${Math.random()}.${fileExt}`;

  const filePath = folder
    ? `${folder}/${fileName}`
    : fileName;

  // =========================
  // UPLOAD
  // =========================
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file);

  if (error) {
    throw error;
  }

  // =========================
  // GET PUBLIC URL
  // =========================
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return data.publicUrl;
}