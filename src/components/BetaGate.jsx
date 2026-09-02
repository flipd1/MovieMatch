// Reusable pattern for shipping a feature to Pro/early-access users before
// it's released to everyone. Wrap any future beta feature's UI in this:
//
//   const { isPro } = useIsPro(userId);
//   const { earlyAccess } = useEarlyAccess(userId);
//   ...
//   <BetaGate isPro={isPro} earlyAccess={earlyAccess}>
//     <BetaBadge /> <MyNewFeature />
//   </BetaGate>
//
// Both flags are required explicitly (rather than accepting one combined
// boolean) so every call site has to actually think about both conditions
// instead of trusting a value computed elsewhere. When the feature is
// ready for everyone, delete the <BetaGate> wrapper (and the <BetaBadge />
// next to it) — there's no other plumbing to unwind.
export default function BetaGate({ isPro, earlyAccess, children }) {
  if (!isPro || !earlyAccess) return null;
  return children;
}
