import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const r2BucketName = process.env.R2_BUCKET_NAME!;
export const r2PublicUrl = process.env.R2_PUBLIC_URL!;

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: r2BucketName,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(R2, command, { expiresIn: 3600 });
  return signedUrl;
}

export async function deleteObject(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: r2BucketName,
    Key: key,
  });

  await R2.send(command);
}

export function getPublicUrl(key: string) {
  return `${r2PublicUrl}/${key}`;
}
