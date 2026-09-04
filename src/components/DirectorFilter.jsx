import PersonFilter from "./PersonFilter";

export default function DirectorFilter({ selected, onSelect }) {
  return (
    <PersonFilter
      selected={selected}
      onSelect={onSelect}
      department="Directing"
      placeholder="Director…"
      chipPrefix="Directed by"
    />
  );
}
