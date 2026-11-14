// Browser-only 3D modules load lazily so the server never evaluates three.js
// (it crashes the published app at startup).
import { lazy, Suspense, type ComponentProps } from "react";

const GlbLazy = lazy(() =>
  import("./glb-model-viewer").then((m) => ({ default: m.GlbModelViewer })),
);
const FxLazy = lazy(() => import("./nexus-fx").then((m) => ({ default: m.NexusFxLayer })));
const StageLazy = lazy(() =>
  import("./arsenal-three-stage").then((m) => ({ default: m.ArsenalThreeStage })),
);
const LivingBackdropLazy = lazy(() =>
  import("./living-theme-backdrop").then((m) => ({ default: m.LivingThemeBackdrop })),
);
const CelCombatLazy = lazy(() =>
  import("./cel-combat-stage").then((m) => ({ default: m.CelCombatStage })),
);

export function GlbModelViewer(p: ComponentProps<typeof GlbLazy>) {
  return (
    <Suspense fallback={null}>
      <GlbLazy {...p} />
    </Suspense>
  );
}
export function NexusFxLayer(p: ComponentProps<typeof FxLazy>) {
  return (
    <Suspense fallback={null}>
      <FxLazy {...p} />
    </Suspense>
  );
}
export function ArsenalThreeStage(p: ComponentProps<typeof StageLazy>) {
  return (
    <Suspense fallback={null}>
      <StageLazy {...p} />
    </Suspense>
  );
}
export function LivingThemeBackdrop(p: ComponentProps<typeof LivingBackdropLazy>) {
  return (
    <Suspense fallback={null}>
      <LivingBackdropLazy {...p} />
    </Suspense>
  );
}
export function CelCombatStage(p: ComponentProps<typeof CelCombatLazy>) {
  return (
    <Suspense fallback={null}>
      <CelCombatLazy {...p} />
    </Suspense>
  );
}
