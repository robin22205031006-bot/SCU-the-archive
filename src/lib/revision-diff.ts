export function revisionDiff(before: unknown, after: unknown) {
  const flatten = (value: unknown, prefix = "", output: Record<string, string> = {}) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, output);
    } else output[prefix || "Record"] = value === undefined ? "—" : JSON.stringify(value);
    return output;
  };
  const a = flatten(before), b = flatten(after);
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(key => a[key] !== b[key]).map(key => ({ field: key, before: a[key] ?? "—", after: b[key] ?? "—" }));
}