import { Signal } from "@preact/signals";
import { yamlTags } from "../data/yamlTags.ts";

interface CounterProps {
  source: Signal<string>;
}

export default function Textarea(props: CounterProps) {
  return (
    <textarea onChange={(e) => yamlTags.value = e.currentTarget.value}>{yamlTags.value}</textarea>
  );
}
