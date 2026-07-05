import { getListTypeBadgeProps } from '../../utils/listTypes';

export default function ListTypeBadge({ type }) {
  const badge = getListTypeBadgeProps(type);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
