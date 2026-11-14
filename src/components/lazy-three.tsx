// Browser-only 3D modules load lazily so the server never evaluates three.js
// (it crashes the published app at startup).
import { lazy, Suspense, type ComponentProps } from "react";

const GlbLazy = lazy(() => import("./glb-model-viewer").then((m) => ({ default: m.GlbModelViewer })));
const FxLazy = lazy(() => import("./nexus-fx").then((m) => ({ default: m.NexusFxLayer })));
const StageLazy = lazy(() =>
  import("./arsenal-three-stage").then((m) => ({ default: m.ArsenalThreeStage })),
);

export function GlbModelViewer(p: ComponentProps<typeof GlbLazy>) {
  return <Suspense fallback={null}><GlbLazy {...p} /></Suspense>;
}
export function NexusFxLayer(p: ComponentProps<typeof FxLazy>) {
  return <Suspense fallback={null}><FxLazy {...p} /></Suspense>;
}
export function ArsenalThreeStage(p: ComponentProps<typeof StageLazy>) {
  return <Suspense fallback={null}><StageLazy {...p} /></Suspense>;
}
