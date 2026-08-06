import { useEffect, useMemo, useState } from 'react';
import type {
  DepositRateAuthority, RateProgram, RateProgramCondition, RateProgramFbeCode,
  RateProgramFeeOption, RateProgramKind, RateProgramPrepaymentFee, RateProgramTier,
} from '../lib/rateQuote';
import {
  fetchDepositRateAuthoritiesAPI, fetchRateProgramConditionsAPI, fetchRateProgramFbeCodesAPI,
  fetchRateProgramFeeOptionsAPI, fetchRateProgramPrepaymentFeesAPI, fetchRateProgramTiersAPI,
  fetchRateProgramsAPI,
} from '../lib/api';
import { buildDepositRateRows, depositChannelsPresent, findActiveProgram } from '../lib/rateQuote';

export function useRatePrograms(kind: RateProgramKind, onDate: string) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [programs, setPrograms] = useState<RateProgram[]>([]);
  const [tiers, setTiers] = useState<RateProgramTier[]>([]);
  const [prepayFees, setPrepayFees] = useState<RateProgramPrepaymentFee[]>([]);
  const [fbeCodes, setFbeCodes] = useState<RateProgramFbeCode[]>([]);
  const [authorities, setAuthorities] = useState<DepositRateAuthority[]>([]);
  const [feeOptions, setFeeOptions] = useState<RateProgramFeeOption[]>([]);
  const [conditions, setConditions] = useState<RateProgramCondition[]>([]);

  const loadAll = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const progs = await fetchRateProgramsAPI();
      setPrograms(progs);
      const ids = progs.map(p => p.Id);
      const [t, f, c, a, o, k] = await Promise.all([
        fetchRateProgramTiersAPI(ids),
        fetchRateProgramPrepaymentFeesAPI(ids),
        fetchRateProgramFbeCodesAPI(ids),
        fetchDepositRateAuthoritiesAPI(ids),
        fetchRateProgramFeeOptionsAPI(ids),
        fetchRateProgramConditionsAPI(ids),
      ]);
      setTiers(t);
      setPrepayFees(f);
      setFbeCodes(c);
      setAuthorities(a);
      setFeeOptions(o);
      setConditions(k);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      setLoadError(message || 'Không tải được chương trình lãi suất.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const program = useMemo(() => findActiveProgram(programs, kind, onDate), [programs, kind, onDate]);

  const scoped = <T extends { ProgramId: number }>(rows: T[]) =>
    (program ? rows.filter(r => r.ProgramId === program.Id) : []);

  const programTiers = useMemo(() => scoped(tiers), [tiers, program]);
  const programPrepayFees = useMemo(() => scoped(prepayFees), [prepayFees, program]);
  const programFbeCodes = useMemo(() => scoped(fbeCodes), [fbeCodes, program]);
  const programAuthorities = useMemo(() => scoped(authorities), [authorities, program]);
  const programFeeOptions = useMemo(() => scoped(feeOptions), [feeOptions, program]);
  const programConditions = useMemo(() => scoped(conditions), [conditions, program]);

  const depositChannels = useMemo(() => depositChannelsPresent(programTiers), [programTiers]);
  const depositRows = useMemo(() => buildDepositRateRows(programTiers), [programTiers]);

  const hasFeeContent = useMemo(
    () => programFeeOptions.length > 0
      || programTiers.some(t => t.MinFeeRatio !== null && t.MinFeeRatio !== undefined),
    [programFeeOptions, programTiers]
  );

  return {
    loading, loadError, reload: loadAll,
    programs, tiers, setTiers,
    program,
    programTiers,
    programPrepayFees,
    programFbeCodes,
    programAuthorities,
    programFeeOptions,
    programConditions,
    depositChannels,
    depositRows,
    hasFeeContent,
  };
}
