import { Suspense } from "react";
import ArtifactEditor from "@/components/artifact-editor/ArtifactEditor";

export default function ArtifactEditorPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: `
        (function () {
          var mode = localStorage.getItem('eg-theme-mode') || 'auto';
          var resolved = mode;
          if (mode === 'auto') {
            if (matchMedia('(prefers-color-scheme: dark)').matches) resolved = 'dark';
            else if (matchMedia('(prefers-color-scheme: light)').matches) resolved = 'light';
            else { var h = new Date().getHours(); resolved = (h >= 19 || h < 7) ? 'dark' : 'light'; }
          }
          document.documentElement.setAttribute('data-theme', resolved);
        })();
      ` }} />
      <Suspense fallback={null}>
        <ArtifactEditor />
      </Suspense>
    </>
  );
}
