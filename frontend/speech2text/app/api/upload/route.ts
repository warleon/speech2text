import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path, { dirname } from "path";
import { FILE_KEY, FILE_NAME_KEY, TASK_KEY, USER_KEY } from "@/lib/constants";
import axios from "axios";

const uploadDir = path.join(process.cwd(), "uploads");

// TODO  sync expectations from backend
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get(FILE_KEY) as File | null;
    const user = formData.get(USER_KEY) as string | null;
    const task = formData.get(TASK_KEY) as string | null;

    if (!file || !task) {
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
    const file_path = path.join(uploadDir, task!, "upload");
    await mkdir(dirname(file_path), { recursive: true });
    await writeFile(file_path, buffer);
    const { data: backendResponse } = await axios.get(
      `http://${process.env.NEXT_PUBLIC_HOST}/api/dispatch`,
      {
        params: {
          user: user,
          task: task,
        },
      }
    );

    return NextResponse.json({
      message: "File uploaded successfully",
      ...backendResponse,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
