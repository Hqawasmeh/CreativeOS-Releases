// Pure policy shared by the backend and regression tests. Internal QA stays explicit.
function entitlementFor(subscription, now = Date.now()) {
  if (!subscription) return { allowed: false, plan: 'none', status: 'inactive' };
  const provider=String(subscription.provider||'').toLowerCase(),status=String(subscription.status||'').toLowerCase();
  const internal=provider==='internal_qa' && status==='active';
  const active=['active','trialing','on_trial'].includes(status);
  const dates=[subscription.ends_at,subscription.current_period_end,...(status==='active'?[]:[subscription.trial_ends_at])].filter(Boolean);
  const expired=dates.some(value=>!Number.isFinite(Date.parse(value))||Date.parse(value)<=now);
  return {...subscription,allowed:internal||(!subscription.test_mode&&active&&!expired)};
}
module.exports={entitlementFor};
