import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { FILE_KEY, FILE_NAME_KEY } from "@/lib/constants";

const uploadDir = path.join(process.cwd(), "uploads");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get(FILE_KEY) as File | null;
    const file_name = formData.get(FILE_NAME_KEY) as string | null;

    if (!file || !file_name) {
      return NextResponse.json(
        {
          error:
            `No ${FILE_KEY} uploaded or no ${FILE_NAME_KEY} set in the request` as const,
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file with random name
    await writeFile(path.join(uploadDir, file_name), buffer);
    fetch(`/api/transcribe?file=${file_name}`).catch((e) => {
      console.error(e);
    });

    return NextResponse.json({ message: "File uploaded successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
