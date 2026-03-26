import { Suspense } from 'react';
import VideoContent from './VideoContent';

export default function VideoPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VideoContent />
    </Suspense>
  );
}
