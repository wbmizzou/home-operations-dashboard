/** Storage bucket for project photos (private; one folder per household). */
export const PHOTO_BUCKET = "project-photos";
/** Each photo is stored with a small thumbnail beside it: <id>.jpg and <id>_t.jpg. */
export const thumbPath = (path: string) => path.replace(/\.jpg$/, "_t.jpg");
