import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { FILE_KEY, FILE_NAME_KEY, USER_KEY } from "@/lib/constants";
import axios from "axios";

const uploadDir = path.join(process.cwd(), "uploads");

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get(FILE_KEY) as File | null;
    const file_name = formData.get(FILE_NAME_KEY) as string | null;
    const user = formData.get(USER_KEY) as string | null;

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

    // Save file
    await writeFile(path.join(uploadDir, file_name), buffer);
    axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api/dispatch`, {
      params: {
        file: file_name,
        user,
      },
    });

    return NextResponse.json({ message: "File uploaded successfully" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
