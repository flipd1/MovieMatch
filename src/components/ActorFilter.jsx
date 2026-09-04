import PersonFilter from "./PersonFilter";

export default function ActorFilter({ selected, onSelect }) {
  return (
    <PersonFilter
      selected={selected}
      onSelect={onSelect}
      department="Acting"
      placeholder="Actor…"
      chipPrefix="Starring"
    />
  );
}
