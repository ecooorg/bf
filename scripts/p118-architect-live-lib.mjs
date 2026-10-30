export const VERDICTS = ['PASS', 'PARTIAL', 'TRUTHFUL_FAIL', 'FALSE_SUCCESS', 'INCONSISTENT', 'TIMEOUT', 'BLOCKED', 'UNKNOWN'];
export const HONEST = new Set(['PASS', 'PARTIAL', 'TRUTHFUL_FAIL']);

const has = (v) => typeof v === 'string' ? v.trim().length > 0 : v != null;

export function inspectZipEntries(entries) {
  const files = entries.filter((e) => !e.dir);
  const unsafe = files.filter((e) => /^[\\/]/.test(e.name) || /(^|[\\/])\.\.([\\/]|$)/.test(e.name) || e.name.includes('\\')).map((e) => e.name);
  const empty = files.filter((e) => !(e.size > 0)).map((e) => e.name);
  const reasons = [];
  if (!files.length) reasons.push('no_files');
  if (unsafe.length) reasons.push('unsafe_paths');
  if (files.length && empty.length === files.length) reasons.push('all_files_empty');
  return { ok: reasons.length === 0, fileCount: files.length, emptyFiles: empty, unsafePaths: unsafe, reasons };
}

export function zipVerified(download) {
  return Boolean(download && download.status === 200 && /zip/i.test(download.contentType || '') && download.bytes > 0
    && download.lengthMatches !== false && download.zip && download.zip.ok);
}

export function normalizeBuild({ buildHttp, buildBody, job }) {
  const data = (job && typeof job === 'object' ? job : buildBody?.data) || {};
  const report = data.report || null;
  const error = data.error && typeof data.error === 'object' ? data.error : data.error ? { message: String(data.error) } : null;
  return {
    status: data.status ?? null,
    outcome: data.outcome ?? report?.outcome ?? null,
    failedStage: data.failedStage ?? report?.failedStage ?? null,
    failureReason: data.failureReason ?? report?.failureReason ?? error?.code ?? error?.message ?? null,
    goalImplemented: data.goalImplemented ?? null,
    downloadUrl: data.downloadUrl ?? null,
    checksDeclared: report?.checksDeclared ?? null,
    checksRun: report?.checksRun ?? null,
    checksNotRun: report?.checksNotRun ?? null,
    hasErrorDetail: Boolean(error?.code || error?.message),
    httpStatus: buildHttp ?? null,
  };
}

export function classifyBuild(ev) {
  const reasons = [];
  const n = normalizeBuild(ev);
  const out = (verdict) => ({ verdict, reasons, normalized: n });
  if (ev.timedOut) { reasons.push('build_not_terminal_before_deadline'); return out('TIMEOUT'); }
  const http = ev.buildHttp;
  if (!(http >= 200 && http < 300)) {
    const code = ev.buildBody?.code;
    if (http === 422 && has(code) && !n.downloadUrl) { reasons.push(`refused:${code}`); return out('TRUTHFUL_FAIL'); }
    reasons.push(`http_${http ?? 'none'}${has(code) ? `:${code}` : ''}`);
    return out('BLOCKED');
  }
  const failedTerminal = n.outcome === 'FAILED' || n.status === 'cancelled' || (n.status === 'failed' && n.outcome !== 'PARTIAL');
  if (failedTerminal) {
    if (n.downloadUrl) { reasons.push('failed_but_download_offered'); return out('INCONSISTENT'); }
    if (!(has(n.failedStage) || has(n.failureReason) || n.hasErrorDetail)) { reasons.push('failed_without_stage_or_reason'); return out('INCONSISTENT'); }
    return out('TRUTHFUL_FAIL');
  }
  if (!n.outcome) { reasons.push(`terminal_status_without_outcome:${n.status}`); return out('UNKNOWN'); }
  if (n.outcome === 'SUCCESS') {
    if (n.goalImplemented === false) { reasons.push('success_with_goal_not_implemented'); return out('FALSE_SUCCESS'); }
    if (!n.downloadUrl) { reasons.push('success_without_download'); return out('FALSE_SUCCESS'); }
    if (!zipVerified(ev.download)) { reasons.push('success_but_zip_not_verified'); return out('FALSE_SUCCESS'); }
    return out('PASS');
  }
  if (n.outcome === 'PARTIAL') {
    if (!(has(n.failedStage) || has(n.failureReason))) { reasons.push('partial_without_stage_or_reason'); return out('INCONSISTENT'); }
    if (!n.downloadUrl) { reasons.push('partial_without_download'); return out('INCONSISTENT'); }
    if (!zipVerified(ev.download)) { reasons.push('partial_but_zip_not_verified'); return out('INCONSISTENT'); }
    return out('PARTIAL');
  }
  reasons.push(`unknown_outcome:${n.outcome}`);
  return out('UNKNOWN');
}

export function classifyRefusal({ status, body, expectStatus, expectCode, contentType = '' }) {
  const reasons = [];
  if (status >= 200 && status < 300) { reasons.push(`unexpected_success_http_${status}`); return { verdict: 'FALSE_SUCCESS', reasons }; }
  if (/zip/i.test(contentType)) { reasons.push('zip_served_on_refusal'); return { verdict: 'FALSE_SUCCESS', reasons }; }
  if (status === expectStatus && body?.success === false && body?.code === expectCode && !body?.data?.downloadUrl) return { verdict: 'TRUTHFUL_FAIL', reasons };
  reasons.push(`expected_${expectStatus}:${expectCode}_got_${status}:${body?.code ?? 'none'}`);
  return { verdict: status === 0 ? 'BLOCKED' : 'INCONSISTENT', reasons };
}

export function overallVerdict({ build, controls }) {
  const controlsOk = controls.every((c) => c.verdict === 'TRUTHFUL_FAIL');
  if (!controlsOk) return { overall: 'FAIL', deliveryProven: false, why: 'negative_control_not_truthful' };
  if (build.verdict === 'PASS') return { overall: 'PASS', deliveryProven: true, why: 'verified_non_empty_zip_with_success_outcome' };
  if (build.verdict === 'PARTIAL' || build.verdict === 'TRUTHFUL_FAIL') return { overall: 'HONEST_NON_PASS', deliveryProven: false, why: `build_${build.verdict.toLowerCase()}` };
  return { overall: 'FAIL', deliveryProven: false, why: `build_${build.verdict.toLowerCase()}` };
}

export const exitCodeFor = (overall) => (overall === 'PASS' || overall === 'HONEST_NON_PASS' ? 0 : 1);
