import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const uploadDir = "/uploads";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file with random name
    const ext = path.extname(file.name) || "";
    const randomName = crypto.randomUUID() + ext;
    await writeFile(path.join(uploadDir, randomName), buffer);

    return NextResponse.json({ message: "File uploaded successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
