import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import WebSocket from "ws";

// User-provided photos, in attachment order. No menu names, prices or order change.
const desserts = [
  { name: "Птичје млијеко", slug: "pticje-mlijeko" },
  { name: "Руске капе", slug: "ruske-kape" },
  { name: "Руска краљевска торта", slug: "ruska-kraljevska-torta" },
];
const preview = process.argv.includes("--preview");
const apply = process.argv.includes("--apply");
if (preview && apply) throw new Error("Choose either --preview or --apply.");

const prepared = await Promise.all(
  desserts.map(async (dessert) => {
    const files = await Promise.all(
      [null, 480, 960].map(async (width) => {
        const filename = `${dessert.slug}${width ? `-${width}` : ""}.webp`;
        const file = fileURLToPath(
          new URL(`../public/images/desserts/${filename}`, import.meta.url),
        );
        const bytes = await readFile(file);
        const metadata = await sharp(bytes).metadata();
        if (metadata.format !== "webp" || !metadata.width || !metadata.height)
          throw new Error(`Invalid dessert photo: ${file}`);
        if (width && metadata.width !== width)
          throw new Error(`Incorrect variant width: ${file}`);
        return {
          filename,
          bytes,
          width: metadata.width,
          variant: width !== null,
        };
      }),
    );
    return {
      ...dessert,
      files,
      hash: createHash("sha256")
        .update(files[0].bytes)
        .digest("hex")
        .slice(0, 16),
    };
  }),
);

if (!preview && !apply) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        photos: prepared.map(({ name, slug, files }) => ({
          name,
          slug,
          files: files.map(({ filename, width, bytes }) => ({
            filename,
            width,
            bytes: bytes.length,
          })),
        })),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

// Preview is intentionally fixed to the loopback-only demo created for this review.
const url = preview
  ? "http://127.0.0.1:4303/__preview"
  : (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL);
const key = preview
  ? "local-preview-fixture"
  : process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing Supabase URL or publishable key.");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});
let signedIn = false;
try {
  if (!preview) {
    const email = process.env.SUPABASE_ADMIN_EMAIL;
    const password = process.env.SUPABASE_ADMIN_PASSWORD;
    if (!email || !password)
      throw new Error("Missing administrator email or password.");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    signedIn = true;
    const { data: isAdmin, error: roleError } = await client.rpc("is_admin");
    if (roleError || !isAdmin)
      throw new Error("Administrator access is required.");
  }
  const { data: rows, error: readError } = await client
    .from("menu_items")
    .select("id, name_sr");
  if (readError) throw readError;
  // Resolve every photo before the first write to avoid a partial update from a missing item.
  const matches = prepared.map((dessert) => {
    const matching = rows.filter((row) => row.name_sr === dessert.name);
    if (matching.length !== 1)
      throw new Error(
        `Expected one menu item for ${dessert.name}, found ${matching.length}. Apply the dessert menu migration first.`,
      );
    return { ...dessert, id: matching[0].id };
  });
  for (const dessert of matches) {
    const created = [];
    const media = [];
    let databaseSaved = false;
    try {
      for (const file of dessert.files) {
        const path = `menu/desserts/${dessert.slug}/${dessert.hash}/${file.filename}`;
        let publicUrl = `/images/desserts/${file.filename}`;
        if (!preview) {
          const { error } = await client.storage
            .from("cafe-media")
            .upload(path, file.bytes, {
              contentType: "image/webp",
              cacheControl: "31536000",
              upsert: false,
            });
          if (
            error &&
            String(error.statusCode) !== "409" &&
            !/duplicate|already exists/i.test(error.message)
          )
            throw error;
          if (!error) created.push(path);
          publicUrl = client.storage.from("cafe-media").getPublicUrl(path)
            .data.publicUrl;
        }
        media.push({
          path,
          url: publicUrl,
          width: file.width,
          variant: file.variant,
        });
      }
      const payload = {
        image_url: media[0].url,
        storage_path: preview ? null : media[0].path,
        image_variants: Object.fromEntries(
          media
            .filter((file) => file.variant)
            .map(({ path, url, width }) => [
              String(width),
              { path, url, width },
            ]),
        ),
      };
      const { data: saved, error } = await client
        .from("menu_items")
        .update(payload)
        .eq("id", dessert.id)
        .select("id, image_url, storage_path, image_variants")
        .single();
      if (error) throw error;
      databaseSaved = true;
      if (
        saved.image_url !== payload.image_url ||
        saved.storage_path !== payload.storage_path ||
        ["480", "960"].some(
          (width) =>
            saved.image_variants?.[width]?.url !==
            payload.image_variants[width].url,
        )
      )
        throw new Error(`Image verification failed for ${dessert.name}.`);
      console.log(
        `${preview ? "Local preview" : "Saved"}: ${dessert.name} → ${dessert.slug}`,
      );
    } catch (error) {
      // Keep previously uploaded objects and other records untouched.
      if (created.length && !databaseSaved)
        await client.storage.from("cafe-media").remove(created);
      throw error;
    }
  }
} finally {
  if (signedIn) await client.auth.signOut();
}
