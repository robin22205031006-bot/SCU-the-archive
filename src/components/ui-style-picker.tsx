import { setUiStyle, useUiStyle, UI_STYLES } from "@/lib/ui-style";
import { Button } from "@/components/ui/button";
export function UiStylePicker() {
  const style = useUiStyle();
  return <div role="group" aria-label="UI Style" className="flex flex-wrap gap-1">{UI_STYLES.map(s => <Button key={s.value} size="sm" variant={style === s.value ? "secondary" : "ghost"} aria-pressed={style === s.value} onClick={() => setUiStyle(s.value)}>{s.label}</Button>)}</div>;
}