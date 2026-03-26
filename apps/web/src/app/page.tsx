'use client';

import { useState } from 'react';
import FileUpload from '@/components/FileUpload';

export default function Home() {
  const [videoFile, setVideoFile] = useState<globalThis.File | null>(null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <FileUpload onVideoUpload={setVideoFile} videoFile={videoFile} />
    </main>
  );
}
